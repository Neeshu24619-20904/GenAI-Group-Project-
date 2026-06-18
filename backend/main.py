import os
import uuid
from datetime import datetime, timedelta
from collections import defaultdict

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from dotenv import load_dotenv

import models
import schemas
import classifier
import router_engine
import policy as policy_helpers
import review_queue as queue_helpers
from database import engine, get_db

load_dotenv()

# Create all tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Content Moderation Pipeline",
    description="Multi-stage AI-powered content moderation with explainability and human review queue.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=schemas.HealthResponse)
def health(db: Session = Depends(get_db)):
    try:
        db.execute(models.Platform.__table__.select().limit(1))
        db_status = "ok"
    except Exception:
        db_status = "error"
    return {"status": "ok", "version": "1.0.0", "db": db_status}


# ── Moderation Pipeline ───────────────────────────────────────────────────────

@app.post("/api/moderate", response_model=schemas.ModerationResponse)
async def moderate(req: schemas.ModerationRequest, db: Session = Depends(get_db)):
    # Validate platform exists
    platform = policy_helpers.get_platform(db, req.platform_id)
    if not platform:
        raise HTTPException(status_code=404, detail=f"Platform '{req.platform_id}' not found")

    # Stage 1: Save submission
    submission = models.ContentSubmission(
        id=str(uuid.uuid4()),
        content=req.content,
        platform_id=req.platform_id,
        user_id=req.user_id or "anonymous",
        context=req.context.model_dump() if req.context else {},
    )
    db.add(submission)
    db.flush()

    # Stage 2: Classify
    raw_scores = await classifier.classify_content(req.content)

    # Stage 3: Context-adjust
    user_ctx = req.context.model_dump() if req.context else {}
    ctx_result = await classifier.context_adjust(
        content=req.content,
        raw_scores=raw_scores,
        platform={"name": platform.name, "description": platform.description, "enabled_categories": platform.enabled_categories},
        user_context=user_ctx
    )
    adjusted_scores = ctx_result["adjusted_scores"]
    context_notes = ctx_result["context_notes"]

    # Stage 4: Route
    action = router_engine.route(adjusted_scores, platform)

    # Stage 5: Explain (for non-approved content)
    explanation = {}
    if action in ("AUTO_REJECT", "QUEUE"):
        triggered = router_engine.get_triggered_categories(adjusted_scores, platform)
        explanation = await classifier.explain_decision(req.content, triggered)

    # Stage 6: Persist decision
    decision = models.Decision(
        id=str(uuid.uuid4()),
        submission_id=submission.id,
        action=action,
        raw_scores=raw_scores,
        adjusted_scores=adjusted_scores,
        context_notes=context_notes,
        explanation=explanation,
    )
    db.add(decision)
    db.flush()

    # Stage 6b: If queued, add to review queue
    queued = False
    if action == "QUEUE":
        qi = models.ReviewQueue(
            id=str(uuid.uuid4()),
            decision_id=decision.id,
        )
        db.add(qi)
        queued = True

    # Audit log
    log = models.AuditLog(
        entity_type="decision",
        entity_id=decision.id,
        action=action,
        actor="pipeline",
        diff={"platform": req.platform_id, "user_id": req.user_id, "action": action}
    )
    db.add(log)
    db.commit()

    return schemas.ModerationResponse(
        decision_id=decision.id,
        action=action,
        raw_scores=raw_scores,
        adjusted_scores=adjusted_scores,
        context_notes=context_notes,
        explanation=schemas.ExplanationOut(**explanation) if explanation else schemas.ExplanationOut(),
        queued=queued,
        platform_id=req.platform_id,
        content_preview=req.content[:120] + ("..." if len(req.content) > 120 else ""),
    )


# ── Decision Detail ───────────────────────────────────────────────────────────

@app.get("/api/decisions/{decision_id}", response_model=schemas.DecisionDetail)
def get_decision(decision_id: str, db: Session = Depends(get_db)):
    decision = db.query(models.Decision).filter(models.Decision.id == decision_id).first()
    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    submission = decision.submission
    queue_item = decision.queue_item

    exp = decision.explanation or {}
    return schemas.DecisionDetail(
        id=decision.id,
        content=submission.content,
        platform_id=submission.platform_id,
        user_id=submission.user_id,
        action=decision.action,
        raw_scores=decision.raw_scores or {},
        adjusted_scores=decision.adjusted_scores or {},
        context_notes=decision.context_notes or "",
        explanation=schemas.ExplanationOut(**exp),
        created_at=decision.created_at,
        queue_status=queue_item.status if queue_item else None,
    )


# ── Review Queue ──────────────────────────────────────────────────────────────

@app.get("/api/queue", response_model=schemas.QueueListResponse)
def get_queue(
    platform_id: str | None = Query(default=None),
    status: str = Query(default="pending"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return queue_helpers.list_queue(db, platform_id=platform_id, status=status, page=page, limit=limit)


@app.get("/api/queue/{item_id}", response_model=schemas.QueueItemOut)
def get_queue_item(item_id: str, db: Session = Depends(get_db)):
    item = queue_helpers.get_queue_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Queue item not found")
    return item


@app.post("/api/queue/{item_id}/resolve")
def resolve_queue(
    item_id: str,
    req: schemas.ResolveQueueRequest,
    db: Session = Depends(get_db)
):
    result = queue_helpers.resolve_queue_item(
        db, item_id, req.action, req.moderator_id, req.notes or ""
    )
    if not result.get("success"):
        raise HTTPException(status_code=404, detail=result.get("error", "Not found"))
    return result


# ── Platform Policy ───────────────────────────────────────────────────────────

@app.get("/api/platforms", response_model=list[schemas.PlatformOut])
def list_platforms(db: Session = Depends(get_db)):
    platforms = policy_helpers.list_platforms(db)
    return [
        schemas.PlatformOut(
            id=p.id, name=p.name, description=p.description or "",
            thresholds=p.thresholds or {}, enabled_categories=p.enabled_categories or [],
            created_at=p.created_at, updated_at=p.updated_at
        )
        for p in platforms
    ]


@app.post("/api/platforms", response_model=schemas.PlatformOut, status_code=201)
def create_platform(req: schemas.PlatformCreate, db: Session = Depends(get_db)):
    existing = policy_helpers.get_platform(db, req.id)
    if existing:
        raise HTTPException(status_code=409, detail=f"Platform '{req.id}' already exists")
    p = policy_helpers.create_platform(db, req)
    return schemas.PlatformOut(
        id=p.id, name=p.name, description=p.description or "",
        thresholds=p.thresholds or {}, enabled_categories=p.enabled_categories or [],
        created_at=p.created_at, updated_at=p.updated_at
    )


@app.put("/api/platforms/{platform_id}", response_model=schemas.PlatformOut)
def update_platform(platform_id: str, req: schemas.PlatformUpdate, db: Session = Depends(get_db)):
    p = policy_helpers.update_platform(db, platform_id, req)
    if not p:
        raise HTTPException(status_code=404, detail="Platform not found")
    return schemas.PlatformOut(
        id=p.id, name=p.name, description=p.description or "",
        thresholds=p.thresholds or {}, enabled_categories=p.enabled_categories or [],
        created_at=p.created_at, updated_at=p.updated_at
    )


@app.get("/api/platforms/{platform_id}", response_model=schemas.PlatformOut)
def get_platform(platform_id: str, db: Session = Depends(get_db)):
    p = policy_helpers.get_platform(db, platform_id)
    if not p:
        raise HTTPException(status_code=404, detail="Platform not found")
    return schemas.PlatformOut(
        id=p.id, name=p.name, description=p.description or "",
        thresholds=p.thresholds or {}, enabled_categories=p.enabled_categories or [],
        created_at=p.created_at, updated_at=p.updated_at
    )


# ── Analytics / Stats ─────────────────────────────────────────────────────────

@app.get("/api/stats", response_model=schemas.StatsResponse)
def get_stats(
    platform_id: str | None = Query(default=None),
    days: int = Query(default=7, ge=1, le=90),
    db: Session = Depends(get_db)
):
    since = datetime.utcnow() - timedelta(days=days)

    query = db.query(models.Decision)
    if platform_id:
        query = (
            query
            .join(models.ContentSubmission, models.Decision.submission_id == models.ContentSubmission.id)
            .filter(models.ContentSubmission.platform_id == platform_id)
        )

    all_decisions = query.filter(models.Decision.created_at >= since).all()
    total = len(all_decisions)

    action_counts = defaultdict(int)
    category_totals = defaultdict(float)
    category_triggers = defaultdict(int)
    daily_counts = defaultdict(int)

    for d in all_decisions:
        action_counts[d.action] += 1
        adj = d.adjusted_scores or {}
        for cat, score in adj.items():
            category_totals[cat] += score
            if score >= 0.5:
                category_triggers[cat] += 1
        day_key = d.created_at.strftime("%Y-%m-%d")
        daily_counts[day_key] += 1

    auto_approved = action_counts.get("AUTO_APPROVE", 0)
    auto_rejected = action_counts.get("AUTO_REJECT", 0)
    queued = action_counts.get("QUEUE", 0)

    def pct(n):
        return round(n / total * 100, 1) if total > 0 else 0.0

    # Queue resolution rate
    resolved = db.query(models.ReviewQueue).filter(
        models.ReviewQueue.status == "resolved",
        models.ReviewQueue.created_at >= since
    ).count()
    total_queued_ever = db.query(models.ReviewQueue).filter(
        models.ReviewQueue.created_at >= since
    ).count()
    resolution_rate = round(resolved / total_queued_ever, 3) if total_queued_ever > 0 else 0.0

    # Recent volume: last `days` days
    recent_volume = []
    for i in range(days):
        day = (datetime.utcnow() - timedelta(days=days - 1 - i)).strftime("%Y-%m-%d")
        recent_volume.append({"date": day, "count": daily_counts.get(day, 0)})

    return schemas.StatsResponse(
        total=total,
        auto_approved=auto_approved,
        auto_rejected=auto_rejected,
        queued=queued,
        auto_approved_pct=pct(auto_approved),
        auto_rejected_pct=pct(auto_rejected),
        queued_pct=pct(queued),
        category_breakdown=dict(category_triggers),
        queue_resolution_rate=resolution_rate,
        recent_volume=recent_volume,
    )
