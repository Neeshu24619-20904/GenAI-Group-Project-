from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime


# ── Request schemas ──────────────────────────────────────────────────────────

class ContentContext(BaseModel):
    thread_id: Optional[str] = None
    prior_violations: int = 0
    metadata: Optional[Dict[str, Any]] = {}


class ModerationRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    platform_id: str
    user_id: Optional[str] = "anonymous"
    context: Optional[ContentContext] = ContentContext()


class ResolveQueueRequest(BaseModel):
    action: str = Field(..., pattern="^(APPROVE|REJECT)$")
    moderator_id: str
    notes: Optional[str] = ""


class PlatformCreate(BaseModel):
    id: str
    name: str
    description: Optional[str] = ""
    thresholds: Dict[str, Dict[str, float]]
    enabled_categories: List[str]


class PlatformUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thresholds: Optional[Dict[str, Dict[str, float]]] = None
    enabled_categories: Optional[List[str]] = None


# ── Response schemas ─────────────────────────────────────────────────────────

class ExplanationOut(BaseModel):
    offending_segment: Optional[str] = None
    primary_category: Optional[str] = None
    reasoning: Optional[str] = None
    severity: Optional[str] = None


class ModerationResponse(BaseModel):
    decision_id: str
    action: str
    raw_scores: Dict[str, float]
    adjusted_scores: Dict[str, float]
    context_notes: str
    explanation: ExplanationOut
    queued: bool
    platform_id: str
    content_preview: str


class DecisionDetail(BaseModel):
    id: str
    content: str
    platform_id: str
    user_id: str
    action: str
    raw_scores: Dict[str, float]
    adjusted_scores: Dict[str, float]
    context_notes: str
    explanation: ExplanationOut
    created_at: datetime
    queue_status: Optional[str] = None


class QueueItemOut(BaseModel):
    id: str
    decision_id: str
    content: str
    content_preview: str
    platform_id: str
    platform_name: str
    top_category: Optional[str]
    top_score: float
    action: str
    adjusted_scores: Dict[str, float]
    explanation: ExplanationOut
    status: str
    assigned_to: Optional[str]
    created_at: datetime


class QueueListResponse(BaseModel):
    items: List[QueueItemOut]
    total: int
    page: int
    limit: int


class PlatformOut(BaseModel):
    id: str
    name: str
    description: str
    thresholds: Dict[str, Any]
    enabled_categories: List[str]
    created_at: datetime
    updated_at: datetime


class StatsResponse(BaseModel):
    total: int
    auto_approved: int
    auto_rejected: int
    queued: int
    auto_approved_pct: float
    auto_rejected_pct: float
    queued_pct: float
    category_breakdown: Dict[str, int]
    queue_resolution_rate: float
    recent_volume: List[Dict[str, Any]]


class HealthResponse(BaseModel):
    status: str
    version: str
    db: str
