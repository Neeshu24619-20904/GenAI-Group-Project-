import uuid
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, JSON, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


def new_uuid():
    return str(uuid.uuid4())


class Platform(Base):
    __tablename__ = "platforms"

    id = Column(String, primary_key=True, default=new_uuid)
    name = Column(String, nullable=False)
    description = Column(Text, default="")
    thresholds = Column(JSON, default={})          # {category: {reject: float, review: float}}
    enabled_categories = Column(JSON, default=[])  # list of active category names
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submissions = relationship("ContentSubmission", back_populates="platform")


class ContentSubmission(Base):
    __tablename__ = "content_submissions"

    id = Column(String, primary_key=True, default=new_uuid)
    content = Column(Text, nullable=False)
    platform_id = Column(String, ForeignKey("platforms.id"), nullable=False)
    user_id = Column(String, default="anonymous")
    context = Column(JSON, default={})   # {thread_id, prior_violations, metadata}
    submitted_at = Column(DateTime, default=datetime.utcnow)

    platform = relationship("Platform", back_populates="submissions")
    decision = relationship("Decision", back_populates="submission", uselist=False)


class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True, default=new_uuid)
    submission_id = Column(String, ForeignKey("content_submissions.id"), nullable=False)
    action = Column(String, nullable=False)   # AUTO_APPROVE | AUTO_REJECT | QUEUE
    raw_scores = Column(JSON, default={})
    adjusted_scores = Column(JSON, default={})
    context_notes = Column(Text, default="")
    explanation = Column(JSON, default={})    # {offending_segment, primary_category, reasoning, severity}
    model_version = Column(String, default="claude-3-5-haiku-20241022")
    created_at = Column(DateTime, default=datetime.utcnow)

    submission = relationship("ContentSubmission", back_populates="decision")
    queue_item = relationship("ReviewQueue", back_populates="decision", uselist=False)


class ReviewQueue(Base):
    __tablename__ = "review_queue"

    id = Column(String, primary_key=True, default=new_uuid)
    decision_id = Column(String, ForeignKey("decisions.id"), nullable=False)
    status = Column(String, default="pending")   # pending | assigned | resolved
    assigned_to = Column(String, default=None)
    moderator_action = Column(String, default=None)  # APPROVE | REJECT
    moderator_notes = Column(Text, default="")
    resolved_at = Column(DateTime, default=None)
    created_at = Column(DateTime, default=datetime.utcnow)

    decision = relationship("Decision", back_populates="queue_item")


class AuditLog(Base):
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String)   # decision | queue_item | platform
    entity_id = Column(String)
    action = Column(String)
    actor = Column(String, default="system")
    diff = Column(JSON, default={})
    created_at = Column(DateTime, default=datetime.utcnow)
