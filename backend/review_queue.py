from datetime import datetime
from sqlalchemy.orm import Session
from models import ReviewQueue, Decision, ContentSubmission, Platform, AuditLog
from schemas import QueueItemOut, QueueListResponse, ExplanationOut
from router_engine import is_uniform_fallback_scores, top_category, lowest_review_threshold


def list_queue(
    db: Session,
    platform_id: str | None = None,
    status: str = "pending",
    page: int = 1,
    limit: int = 20
) -> QueueListResponse:
    query = (
        db.query(ReviewQueue)
        .join(Decision, ReviewQueue.decision_id == Decision.id)
        .join(ContentSubmission, Decision.submission_id == ContentSubmission.id)
    )
    if platform_id:
        query = query.filter(ContentSubmission.platform_id == platform_id)
    if status:
        query = query.filter(ReviewQueue.status == status)

    items_raw = query.order_by(ReviewQueue.created_at.desc()).all()

    all_items = []
    for qi in items_raw:
        item = _to_queue_item(db, qi)
        if item:
            all_items.append(item)

    total = len(all_items)
    items = all_items[(page - 1) * limit:page * limit]
    return QueueListResponse(items=items, total=total, page=page, limit=limit)



def _to_queue_item(db: Session, qi: ReviewQueue) -> QueueItemOut | None:
    decision = qi.decision
    submission = decision.submission
    platform = db.query(Platform).filter(Platform.id == submission.platform_id).first()
    adj = decision.adjusted_scores or {}
    if is_uniform_fallback_scores(adj):
        return None

    top_cat, top_score = top_category(
        adj,
        platform,
        min_score=lowest_review_threshold(platform) if platform else 0.50,
    )
    exp = decision.explanation or {}
    return QueueItemOut(
        id=qi.id,
        decision_id=decision.id,
        content=submission.content,
        content_preview=submission.content[:120] + ("..." if len(submission.content) > 120 else ""),
        platform_id=submission.platform_id,
        platform_name=platform.name if platform else submission.platform_id,
        top_category=top_cat,
        top_score=round(top_score, 3),
        action=decision.action,
        adjusted_scores=adj,
        explanation=ExplanationOut(**exp),
        status=qi.status,
        assigned_to=qi.assigned_to,
        moderator_action=qi.moderator_action,
        notes=qi.moderator_notes,
        created_at=qi.created_at,
    )



def get_queue_item(db: Session, item_id: str) -> QueueItemOut | None:
    qi = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not qi:
        return None
    return _to_queue_item(db, qi)


def resolve_queue_item(
    db: Session,
    item_id: str,
    action: str,
    moderator_id: str,
    notes: str = ""
) -> dict:
    qi = db.query(ReviewQueue).filter(ReviewQueue.id == item_id).first()
    if not qi:
        return {"success": False, "error": "Queue item not found"}

    before = {"status": qi.status, "moderator_action": qi.moderator_action}
    qi.status = "resolved"
    qi.moderator_action = action
    qi.assigned_to = moderator_id
    qi.moderator_notes = notes
    qi.resolved_at = datetime.utcnow()

    log = AuditLog(
        entity_type="queue_item",
        entity_id=item_id,
        action="resolved",
        actor=moderator_id,
        diff={"before": before, "after": {"status": "resolved", "moderator_action": action, "notes": notes}}
    )
    db.add(log)
    db.commit()

    return {"success": True, "decision_id": qi.decision_id}
