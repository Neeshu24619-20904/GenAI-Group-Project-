import json
import logging
import os
import re
from typing import Any
from groq import Groq
from dotenv import load_dotenv
from router_engine import is_uniform_fallback_scores

load_dotenv()

key = os.getenv("GROQ_API_KEY")

logger = logging.getLogger(__name__)

if not key:
    logger.warning(
        "No GROQ_API_KEY found. Please set GROQ_API_KEY in your backend/.env file."
    )

# Groq client — uses llama-3.3-70b-versatile with JSON mode
CLIENT = Groq(api_key=key)
GROQ_MODEL = "llama-3.3-70b-versatile"

HARM_CATEGORIES = [
    "hate_speech", "harassment", "spam", "misinformation",
    "graphic_violence", "adult_content", "self_harm"
]

CATEGORY_ALIASES = {
    "hate": "hate_speech",
    "hate_speech": "hate_speech",
    "hatespeech": "hate_speech",
    "harassment": "harassment",
    "abuse": "harassment",
    "spam": "spam",
    "misinformation": "misinformation",
    "mis_info": "misinformation",
    "false_information": "misinformation",
    "graphic_violence": "graphic_violence",
    "graphicviolence": "graphic_violence",
    "violence": "graphic_violence",
    "adult_content": "adult_content",
    "adultcontent": "adult_content",
    "sexual_content": "adult_content",
    "self_harm": "self_harm",
    "selfharm": "self_harm",
    "self_harm_suicide": "self_harm",
}

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
Harmless factual, educational, sports, fictional, health, or everyday content must receive very low scores, typically 0.0 to 0.05.
Do not assign hate_speech unless the content attacks or demeans a protected class.
Do not assign harassment unless the content targets a person or group with abuse, threats, or encouragement of self-harm.
Safe examples:
- "Spiderman is a hero" => all categories 0.0
- "The history of computers began with mechanical calculating devices" => all categories 0.0
- "Regular exercise improves cardiovascular health" => all categories 0.0
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
}
If the initial scores are very low and the context has no risk indicators, keep scores very low. Do not raise safe content into review range.
Never set every category to the same non-zero score."""

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


class LLMJSONError(RuntimeError):
    def __init__(self, message: str, *, raw_response: str | None = None):
        super().__init__(message)
        self.raw_response = raw_response

# Keep backward-compatible alias
GeminiJSONError = LLMJSONError


def _strip_markdown_json(text: str) -> str:
    text = text.strip()
    fenced = re.search(r"```(?:json|JSON)?\s*(.*?)\s*```", text, re.DOTALL)
    if fenced:
        return fenced.group(1).strip()
    return text


def _parse_json_response(text: str) -> dict:
    """Parse JSON from LLM response, handling markdown fences and extra prose."""
    cleaned = _strip_markdown_json(text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        decoder = json.JSONDecoder()
        starts = [idx for idx in (cleaned.find("{"), cleaned.find("[")) if idx != -1]
        for start in sorted(starts):
            try:
                parsed, _ = decoder.raw_decode(cleaned[start:])
                break
            except json.JSONDecodeError:
                continue
        else:
            logger.error("Malformed LLM JSON response: %s", text)
            raise LLMJSONError("LLM returned malformed JSON", raw_response=text)

    if not isinstance(parsed, dict):
        logger.error("LLM JSON root was %s, expected object: %s", type(parsed).__name__, text)
        raise LLMJSONError("LLM JSON response must be an object", raw_response=text)

    return parsed


def _is_quota_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(token in text for token in ("quota", "resource_exhausted", "429", "rate limit", "rate_limit"))


def _log_llm_exception(stage: str, exc: Exception) -> None:
    if _is_quota_error(exc):
        logger.exception("Groq quota/rate-limit failure during %s: %s", stage, exc)
    elif isinstance(exc, (json.JSONDecodeError, LLMJSONError)):
        logger.exception("Groq JSON parsing failure during %s: %s", stage, exc)
    else:
        logger.exception("Groq request failure during %s: %s", stage, exc)

# Backward-compatible alias used by existing callers
_log_gemini_exception = _log_llm_exception


def _category_key(key: str) -> str | None:
    normalized = re.sub(r"[^a-z0-9]+", "_", key.lower()).strip("_")
    compact = normalized.replace("_", "")
    if normalized in HARM_CATEGORIES:
        return normalized
    return CATEGORY_ALIASES.get(normalized) or CATEGORY_ALIASES.get(compact)


def _score_source(data: dict) -> dict:
    for key in (
        "adjusted_scores",
        "scores",
        "category_scores",
        "harm_scores",
        "classification",
        "categories",
    ):
        value = data.get(key)
        if isinstance(value, dict):
            return value
    return data


def _numeric_score(value: Any) -> float | None:
    if isinstance(value, (int, float, str)):
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    if isinstance(value, dict):
        for key in ("score", "confidence", "value", "probability"):
            if key in value:
                return _numeric_score(value[key])
    return None


def _collect_category_scores(value: Any, scores: dict[str, float]) -> None:
    if isinstance(value, dict):
        label = value.get("category") or value.get("label") or value.get("name")
        if isinstance(label, str):
            category = _category_key(label)
            score = _numeric_score(value)
            if category and score is not None:
                scores[category] = score

        for key, child in value.items():
            category = _category_key(str(key))
            score = _numeric_score(child)
            if category and score is not None:
                scores[category] = score
                continue
            if isinstance(child, (dict, list)):
                _collect_category_scores(child, scores)
    elif isinstance(value, list):
        for child in value:
            _collect_category_scores(child, scores)


def _top_level_numbers(data: dict) -> dict:
    numbers = {}
    _collect_category_scores(data, numbers)
    return numbers


def _normalise_score_map(
    data: dict,
    *,
    fallback: dict | None = None,
    require_scores: bool = False,
) -> dict:
    source = _top_level_numbers(_score_source(data))
    fallback = fallback or {}
    if require_scores and not source:
        logger.error("LLM response did not include any recognized category scores: %s", data)
        raise LLMJSONError("LLM response missing recognized category scores")

    scores = {
        cat: max(0.0, min(1.0, float(source.get(cat, fallback.get(cat, 0.0)))))
        for cat in HARM_CATEGORIES
    }
    if is_uniform_fallback_scores(scores):
        logger.error("LLM returned invalid uniform fallback scores: %s", scores)
        raise LLMJSONError("LLM returned invalid uniform fallback scores")
    return scores


async def generate_json(system_prompt: str, payload: dict) -> dict:
    stage = payload.get("_stage", "groq_json")
    # Strip internal _stage key before sending to LLM
    user_payload = {k: v for k, v in payload.items() if k != "_stage"}

    try:
        response = CLIENT.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, indent=2)},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        _log_llm_exception(stage, exc)
        raise

    text = (response.choices[0].message.content or "").strip()
    logger.info("Groq raw response for %s: %s", stage, text)
    if not text:
        logger.error("Groq returned an empty response for stage: %s", stage)
        raise LLMJSONError("Groq returned an empty response", raw_response="")

    try:
        return _parse_json_response(text)
    except Exception as exc:
        _log_llm_exception(stage, exc)
        raise


async def classify_content(content: str) -> dict:
    try:
        scores = await generate_json(
            CLASSIFY_SYSTEM,
            {"_stage": "classify_content", "content": content}
        )

        return _normalise_score_map(scores, require_scores=True)

    except Exception as e:
        _log_llm_exception("classify_content", e)
        raise

async def context_adjust(
    content: str,
    raw_scores: dict,
    platform: dict,
    user_context: dict
) -> dict:
    """Stage 2: Adjust scores based on platform and user context."""
    try:
        payload = {
            "_stage": "context_adjust",
            "content": content,
            "platform": {
                "name": platform.get("name", ""),
                "description": platform.get("description", ""),
                "enabled_categories": platform.get("enabled_categories", [])
            },
            "user_context": user_context,
            "initial_scores": raw_scores
        }

        result = await generate_json(CONTEXT_SYSTEM, payload)

        adj = result.get("adjusted_scores", result)

        adjusted = _normalise_score_map(adj, fallback=raw_scores)

        return {
            "adjusted_scores": adjusted,
            "context_notes": result.get("context_notes", "")
        }

    except Exception as e:
        _log_llm_exception("context_adjust", e)
        raise

async def explain_decision(
    content: str,
    triggered_categories: dict
) -> dict:
    """Stage 3: Generate moderator explanation."""
    try:
        payload = {
            "_stage": "explain_decision",
            "content": content,
            "triggered_categories": triggered_categories
        }

        result = await generate_json(EXPLAIN_SYSTEM, payload)

        return {
            "offending_segment": result.get("offending_segment", ""),
            "primary_category": result.get("primary_category", ""),
            "reasoning": result.get("reasoning", ""),
            "severity": result.get("severity", "medium")
        }

    except Exception as e:
        _log_llm_exception("explain_decision", e)
        raise
