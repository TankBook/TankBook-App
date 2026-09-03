import base64
import json
import logging
from datetime import datetime

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from pywebpush import webpush, WebPushException
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.models import AppSettings, MaintenanceTask, PushSubscription, Tank, User
from app.routers.settings import get_or_create_settings as _get_or_create_app_settings

logger = logging.getLogger(__name__)

SWEEP_INTERVAL_SECONDS = 60
VAPID_SUB = "mailto:noreply@tankbook.local"


def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()


def get_or_create_settings(db: Session) -> AppSettings:
    """Reuses the shared AppSettings singleton-row bootstrap, then lazily generates a
    VAPID keypair the first time it's needed — nothing else writes to the DB at
    container startup, so first-read is the natural place for this."""
    settings = _get_or_create_app_settings(db)
    if not settings.vapid_private_key:
        private_key = ec.generate_private_key(ec.SECP256R1())
        public_key = private_key.public_key()
        private_raw = private_key.private_numbers().private_value.to_bytes(32, "big")
        public_raw = public_key.public_bytes(
            encoding=serialization.Encoding.X962,
            format=serialization.PublicFormat.UncompressedPoint,
        )
        settings.vapid_private_key = _b64url(private_raw)
        settings.vapid_public_key = _b64url(public_raw)
        db.commit()
        db.refresh(settings)
    return settings


def _send_one(db: Session, settings: AppSettings, sub: PushSubscription, payload: str) -> None:
    try:
        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=payload,
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": VAPID_SUB},
        )
    except WebPushException as exc:
        status = exc.response.status_code if exc.response is not None else None
        if status in (404, 410):
            db.delete(sub)
            db.commit()
        else:
            logger.warning("push send failed (status=%s) for subscription %s", status, sub.id)
    except Exception:
        logger.exception("unexpected error sending push to subscription %s", sub.id)


def _notify_for_task(db: Session, settings: AppSettings, task: MaintenanceTask) -> None:
    tank = db.query(Tank).filter_by(id=task.tank_id).first()
    if not tank:
        return
    payload = json.dumps({
        "title": f"{task.task_type} due",
        "body": task.description or f"Due for {tank.name}",
        "url": f"/tanks/{task.tank_id}",
    })
    subs = (
        db.query(PushSubscription)
        .join(User, PushSubscription.user_id == User.id)
        .filter(User.notifications_enabled == True, User.id == tank.owner_id)  # noqa: E712
        .all()
    )
    for sub in subs:
        _send_one(db, settings, sub, payload)


def run_notification_sweep() -> None:
    db = SessionLocal()
    try:
        settings = get_or_create_settings(db)
        now = datetime.utcnow()
        due_tasks = (
            db.query(MaintenanceTask)
            .filter(
                MaintenanceTask.status == "pending",
                MaintenanceTask.due_at <= now,
                MaintenanceTask.notified_at.is_(None),
            )
            .all()
        )
        for task in due_tasks:
            try:
                _notify_for_task(db, settings, task)
            except Exception:
                logger.exception("failed processing notifications for task %s", task.id)
            finally:
                task.notified_at = now
                db.commit()
    finally:
        db.close()


async def notification_loop() -> None:
    import asyncio

    while True:
        try:
            await asyncio.to_thread(run_notification_sweep)
        except Exception:
            logger.exception("notification sweep iteration crashed")
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
