import json
import os
import re
from anthropic import AsyncAnthropic
from dotenv import load_dotenv

load_dotenv()

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

HARM_CATEGORIES = [
    "hate_speech", "harassment", "spam", "misinformation",
    "graphic_violence", "adult_content", "self_harm"
]

CLASSIFY_SYSTEM = """You are a content safety classifier. Analyse the provided content and return ONLY a valid JSON object with confidence scores (0.0 to 1.0) for each harm category.

Categories:
- hate_speech: Content targeting people based on protected characteristics
- harassment: Personal attacks, threats, or targeted abuse
- spam: Unsolicited promotional content or repeated meaningless content
- misinformation: Factually false or deliberately misleading claims
- graphic_violence: Descriptions or promotion of physical violence
- adult_content: Sexually explicit or suggestive content
- self_harm: Content promoting or detailing self-injury or suicide

Score 0.0 = definitely safe. Score 1.0 = definitely harmful.
Return ONLY valid JSON, no markdown, no explanation."""

CONTEXT_SYSTEM = """You are a context-aware content safety analyst. You receive initial classification scores along with platform context and user history. Adjust the scores based on context — the same statement can mean very different things depending on platform norms and user history.

Examples:
- "I will destroy you" on a gaming platform from a new account with no violations = lower harassment score
- The same phrase from an account with 5 prior violations on a parenting forum = higher harassment score
- Adult content on an adults-only platform = lower severity
- Mild profanity on a children's platform = higher severity

Return ONLY valid JSON with:
{
  "adjusted_scores": { <same categories as input> },
  "context_notes": "<1-2 sentence explanation of what context changed and why>"
}"""

EXPLAIN_SYSTEM = """You are a content moderation explainer. Your job is to help human moderators understand why content was flagged. Given content and triggered harm categories, identify:
1. The specific offending segment (exact quote from content or brief paraphrase if too long)
2. The primary harm category driving the decision
3. Clear 1-2 sentence reasoning a moderator can use in appeals
4. Severity: low | medium | high | critical

Return ONLY valid JSON:
{
  "offending_segment": "...",
  "primary_category": "...",
  "reasoning": "...",
  "severity": "low|medium|high|critical"
}"""


def _parse_json_response(text: str) -> dict:
    """Safely parse JSON from Claude response, stripping markdown fences if present."""
    text = text.strip()
    # Remove ```json ... ``` or ``` ... ``` fences
    text = re.sub(r'^```(?:json)?\s*', '', text)
    text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


async def classify_content(content: str) -> dict:
    """Stage 1: Multi-category classification. Returns raw scores dict."""
    try:
        response = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=300,
            system=CLASSIFY_SYSTEM,
            messages=[{"role": "user", "content": json.dumps({"content": content})}]
        )
        scores = _parse_json_response(response.content[0].text)
        # Ensure all categories present and clamped to [0, 1]
        return {cat: max(0.0, min(1.0, float(scores.get(cat, 0.0)))) for cat in HARM_CATEGORIES}
    except Exception as e:
        print(f"[classify_content] error: {e}")
        # Fail safe: send to queue
        return {cat: 0.55 for cat in HARM_CATEGORIES}  # mid-range -> will route to QUEUE


async def context_adjust(
    content: str,
    raw_scores: dict,
    platform: dict,
    user_context: dict
) -> dict:
    """Stage 2: Adjust scores based on platform and user context."""
    try:
        payload = {
            "content": content,
            "platform": {
                "name": platform.get("name", ""),
                "description": platform.get("description", ""),
                "enabled_categories": platform.get("enabled_categories", [])
            },
            "user_context": user_context,
            "initial_scores": raw_scores
        }
        response = await client.messages.create(
            model="claude-3-5-haiku-20241022",
            max_tokens=400,
            system=CONTEXT_SYSTEM,
            messages=[{"role": "user", "content": json.dumps(payload)}]
        )
        result = _parse_json_response(response.content[0].text)
        adj = result.get("adjusted_scores", raw_scores)
        # Clamp and ensure all categories present
        adjusted = {cat: max(0.0, min(1.0, float(adj.get(cat, raw_scores.get(cat, 0.0))))) for cat in HARM_CATEGORIES}
        notes = result.get("context_notes", "")
        return {"adjusted_scores": adjusted, "context_notes": notes}
    except Exception as e:
        print(f"[context_adjust] error: {e}")
        return {"adjusted_scores": raw_scores, "context_notes": "Context analysis unavailable."}


async def explain_decision(content: str, triggered_categories: dict) -> dict:
    """Stage 3: Generate human-readable explanation for flagged content."""
    try:
        payload = {
            "content": content,
            "triggered_categories": triggered_categories
        }
        response = await client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=400,
            system=EXPLAIN_SYSTEM,
            messages=[{"role": "user", "content": json.dumps(payload)}]
        )
        result = _parse_json_response(response.content[0].text)
        return {
            "offending_segment": result.get("offending_segment", ""),
            "primary_category": result.get("primary_category", ""),
            "reasoning": result.get("reasoning", ""),
            "severity": result.get("severity", "medium")
        }
    except Exception as e:
        print(f"[explain_decision] error: {e}")
        return {
            "offending_segment": content[:100],
            "primary_category": max(triggered_categories, key=triggered_categories.get) if triggered_categories else "unknown",
            "reasoning": "Automated explanation unavailable. Manual review required.",
            "severity": "medium"
        }
