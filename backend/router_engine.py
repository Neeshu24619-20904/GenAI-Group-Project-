from typing import Dict


def route(adjusted_scores: Dict[str, float], platform) -> str:
    """
    Determine moderation action based on adjusted scores and platform policy.

    Returns: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'QUEUE'
    """
    thresholds: dict = platform.thresholds or {}
    enabled: list = platform.enabled_categories or []

    default_thresholds = {"reject": 0.85, "review": 0.50}

    # First pass: check for auto-reject (highest priority)
    for category, score in adjusted_scores.items():
        if category not in enabled:
            continue
        t = thresholds.get(category, default_thresholds)
        reject_t = t.get("reject", default_thresholds["reject"])
        if score >= reject_t:
            return "AUTO_REJECT"

    # Second pass: check for queue (human review needed)
    for category, score in adjusted_scores.items():
        if category not in enabled:
            continue
        t = thresholds.get(category, default_thresholds)
        review_t = t.get("review", default_thresholds["review"])
        reject_t = t.get("reject", default_thresholds["reject"])
        if review_t <= score < reject_t:
            return "QUEUE"

    return "AUTO_APPROVE"


def get_triggered_categories(adjusted_scores: Dict[str, float], platform, min_score: float = 0.30) -> Dict[str, float]:
    """Return categories that are above a minimum threshold for explanation purposes."""
    enabled: list = platform.enabled_categories or []
    return {
        cat: score
        for cat, score in adjusted_scores.items()
        if cat in enabled and score >= min_score
    }
