from typing import Dict

FALLBACK_SCORE = 0.55
FALLBACK_EPSILON = 0.001


def is_uniform_fallback_scores(scores: Dict[str, float]) -> bool:
    """Detect the old invalid fallback result that should never drive routing."""
    if not scores:
        return False
    return all(abs(float(score) - FALLBACK_SCORE) <= FALLBACK_EPSILON for score in scores.values())


def enabled_scores(scores: Dict[str, float], platform) -> Dict[str, float]:
    enabled: list = platform.enabled_categories or list(scores.keys())
    return {cat: float(score) for cat, score in scores.items() if cat in enabled}


def top_category(
    scores: Dict[str, float],
    platform,
    min_score: float | None = None,
) -> tuple[str | None, float]:
    filtered = enabled_scores(scores, platform)
    if not filtered or is_uniform_fallback_scores(filtered):
        return None, 0.0

    category, score = max(filtered.items(), key=lambda item: item[1])
    if min_score is not None and score < min_score:
        return None, score
    return category, score


def lowest_review_threshold(platform) -> float:
    thresholds: dict = platform.thresholds or {}
    enabled: list = platform.enabled_categories or []
    default_review = 0.50
    if not enabled:
        return default_review
    return min(
        float((thresholds.get(category) or {}).get("review", default_review))
        for category in enabled
    )


def route(adjusted_scores: Dict[str, float], platform) -> str:
    """
    Determine moderation action based on adjusted scores and platform policy.

    Returns: 'AUTO_APPROVE' | 'AUTO_REJECT' | 'QUEUE'
    """
    thresholds: dict = platform.thresholds or {}
    enabled: list = platform.enabled_categories or []

    default_thresholds = {"reject": 0.85, "review": 0.50}

    if is_uniform_fallback_scores(enabled_scores(adjusted_scores, platform)):
        raise ValueError("Invalid uniform fallback scores cannot be routed")

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
