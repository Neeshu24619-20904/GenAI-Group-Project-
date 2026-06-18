from datetime import datetime
from sqlalchemy.orm import Session
from models import Platform, AuditLog
from schemas import PlatformCreate, PlatformUpdate


def get_platform(db: Session, platform_id: str) -> Platform | None:
    return db.query(Platform).filter(Platform.id == platform_id).first()


def list_platforms(db: Session) -> list[Platform]:
    return db.query(Platform).all()


def create_platform(db: Session, data: PlatformCreate) -> Platform:
    platform = Platform(
        id=data.id,
        name=data.name,
        description=data.description or "",
        thresholds=data.thresholds,
        enabled_categories=data.enabled_categories,
    )
    db.add(platform)
    _audit(db, "platform", data.id, "created", "api", {}, data.model_dump())
    db.commit()
    db.refresh(platform)
    return platform


def update_platform(db: Session, platform_id: str, data: PlatformUpdate) -> Platform | None:
    platform = get_platform(db, platform_id)
    if not platform:
        return None

    before = {
        "name": platform.name,
        "thresholds": platform.thresholds,
        "enabled_categories": platform.enabled_categories,
    }

    if data.name is not None:
        platform.name = data.name
    if data.description is not None:
        platform.description = data.description
    if data.thresholds is not None:
        platform.thresholds = data.thresholds
    if data.enabled_categories is not None:
        platform.enabled_categories = data.enabled_categories
    platform.updated_at = datetime.utcnow()

    after = {
        "name": platform.name,
        "thresholds": platform.thresholds,
        "enabled_categories": platform.enabled_categories,
    }
    _audit(db, "platform", platform_id, "updated", "api", before, after)
    db.commit()
    db.refresh(platform)
    return platform


def _audit(db: Session, entity_type: str, entity_id: str, action: str, actor: str, before: dict, after: dict):
    log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        diff={"before": before, "after": after}
    )
    db.add(log)
