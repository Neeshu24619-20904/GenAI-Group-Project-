"""
Run this once before starting the server:
  cd moderation-api && python seed.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import engine, SessionLocal
import models

models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

ALL_CATEGORIES = [
    "hate_speech", "harassment", "spam", "misinformation",
    "graphic_violence", "adult_content", "self_harm"
]

PLATFORMS = [
    {
        "id": "children_platform",
        "name": "Kids Safe App",
        "description": "Educational platform for children aged 6-12. Very strict moderation.",
        "enabled_categories": ALL_CATEGORIES,
        "thresholds": {
            "hate_speech":      {"reject": 0.40, "review": 0.20},
            "harassment":       {"reject": 0.40, "review": 0.20},
            "spam":             {"reject": 0.70, "review": 0.40},
            "misinformation":   {"reject": 0.50, "review": 0.30},
            "graphic_violence": {"reject": 0.30, "review": 0.15},
            "adult_content":    {"reject": 0.20, "review": 0.10},
            "self_harm":        {"reject": 0.40, "review": 0.20},
        },
    },
    {
        "id": "general_platform",
        "name": "General Social Platform",
        "description": "Standard social media platform for adults. Balanced moderation.",
        "enabled_categories": ALL_CATEGORIES,
        "thresholds": {
            "hate_speech":      {"reject": 0.85, "review": 0.50},
            "harassment":       {"reject": 0.85, "review": 0.50},
            "spam":             {"reject": 0.90, "review": 0.60},
            "misinformation":   {"reject": 0.85, "review": 0.55},
            "graphic_violence": {"reject": 0.85, "review": 0.50},
            "adult_content":    {"reject": 0.85, "review": 0.60},
            "self_harm":        {"reject": 0.80, "review": 0.45},
        },
    },
    {
        "id": "adult_platform",
        "name": "Adult Content Platform",
        "description": "18+ platform. Adult content is permitted; focus on safety violations.",
        "enabled_categories": [c for c in ALL_CATEGORIES if c != "adult_content"],
        "thresholds": {
            "hate_speech":      {"reject": 0.90, "review": 0.65},
            "harassment":       {"reject": 0.85, "review": 0.50},
            "spam":             {"reject": 0.90, "review": 0.60},
            "misinformation":   {"reject": 0.85, "review": 0.55},
            "graphic_violence": {"reject": 0.70, "review": 0.40},
            "self_harm":        {"reject": 0.80, "review": 0.45},
        },
    },
]

# Seed platforms
for p_data in PLATFORMS:
    existing = db.query(models.Platform).filter(models.Platform.id == p_data["id"]).first()
    if not existing:
        platform = models.Platform(**p_data)
        db.add(platform)
        print(f"  + Seeded platform: {p_data['name']}")
    else:
        print(f"  ~ Platform already exists: {p_data['name']}")

db.commit()

# Seed some dummy decisions for the dashboard
import uuid
from datetime import datetime, timedelta
import random

sample_decisions = [
    {
        "content": "Check out our amazing deals! Buy now at spamsite.xyz - 90% off everything!",
        "platform_id": "general_platform",
        "action": "AUTO_REJECT",
        "raw_scores": {"hate_speech": 0.02, "harassment": 0.01, "spam": 0.95, "misinformation": 0.10, "graphic_violence": 0.0, "adult_content": 0.01, "self_harm": 0.0},
        "explanation": {"offending_segment": "Check out our amazing deals! Buy now at spamsite.xyz", "primary_category": "spam", "reasoning": "Classic promotional spam with external link and exaggerated discount claims.", "severity": "high"},
    },
    {
        "content": "I hate people who think differently from me. They should all disappear.",
        "platform_id": "children_platform",
        "action": "AUTO_REJECT",
        "raw_scores": {"hate_speech": 0.82, "harassment": 0.45, "spam": 0.0, "misinformation": 0.0, "graphic_violence": 0.10, "adult_content": 0.0, "self_harm": 0.0},
        "explanation": {"offending_segment": "They should all disappear", "primary_category": "hate_speech", "reasoning": "Content expresses hostility towards a group and implies they should not exist.", "severity": "high"},
    },
    {
        "content": "The vaccine contains microchips for government tracking. Share this truth!",
        "platform_id": "general_platform",
        "action": "QUEUE",
        "raw_scores": {"hate_speech": 0.05, "harassment": 0.02, "spam": 0.30, "misinformation": 0.72, "graphic_violence": 0.0, "adult_content": 0.0, "self_harm": 0.0},
        "explanation": {"offending_segment": "The vaccine contains microchips for government tracking", "primary_category": "misinformation", "reasoning": "Promotes debunked conspiracy theory about vaccine microchips. Flagged for human review.", "severity": "medium"},
    },
    {
        "content": "Great game everyone! See you in the next match. GG WP!",
        "platform_id": "general_platform",
        "action": "AUTO_APPROVE",
        "raw_scores": {"hate_speech": 0.01, "harassment": 0.02, "spam": 0.03, "misinformation": 0.0, "graphic_violence": 0.0, "adult_content": 0.0, "self_harm": 0.0},
        "explanation": {},
    },
    {
        "content": "I'm feeling really low today. Not sure I want to be here anymore.",
        "platform_id": "general_platform",
        "action": "QUEUE",
        "raw_scores": {"hate_speech": 0.01, "harassment": 0.0, "spam": 0.0, "misinformation": 0.0, "graphic_violence": 0.05, "adult_content": 0.0, "self_harm": 0.65},
        "explanation": {"offending_segment": "Not sure I want to be here anymore", "primary_category": "self_harm", "reasoning": "Possible expression of suicidal ideation. Routed for human review to ensure user safety.", "severity": "high"},
    },
]

for i, sd in enumerate(sample_decisions):
    # Vary timestamps over last 7 days
    offset_hours = random.randint(0, 7 * 24)
    ts = datetime.utcnow() - timedelta(hours=offset_hours)

    submission = models.ContentSubmission(
        id=str(uuid.uuid4()),
        content=sd["content"],
        platform_id=sd["platform_id"],
        user_id=f"seed_user_{i+1}",
        context={},
        submitted_at=ts,
    )
    db.add(submission)
    db.flush()

    decision = models.Decision(
        id=str(uuid.uuid4()),
        submission_id=submission.id,
        action=sd["action"],
        raw_scores=sd["raw_scores"],
        adjusted_scores=sd["raw_scores"],
        context_notes="Seeded test data.",
        explanation=sd["explanation"],
        created_at=ts,
    )
    db.add(decision)
    db.flush()

    if sd["action"] == "QUEUE":
        qi = models.ReviewQueue(
            id=str(uuid.uuid4()),
            decision_id=decision.id,
            created_at=ts,
        )
        db.add(qi)

    print(f"  + Seeded decision: {sd['action']} — {sd['content'][:50]}...")

db.commit()
db.close()
print("\n✅ Seed complete. Run: uvicorn main:app --reload")
