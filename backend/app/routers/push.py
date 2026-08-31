from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import PushSubscription, User
from app.schemas.schemas import PushSubscriptionCreate, PushSubscriptionDelete, VapidPublicKeyOut
from app.services.auth import get_current_user
from app.services.push import get_or_create_settings

router = APIRouter()


@router.get("/vapid-public-key", response_model=VapidPublicKeyOut)
def vapid_public_key(db: Session = Depends(get_db)):
    settings = get_or_create_settings(db)
    return VapidPublicKeyOut(public_key=settings.vapid_public_key)


@router.post("/subscribe")
def subscribe(body: PushSubscriptionCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(PushSubscription).filter_by(endpoint=body.endpoint).first()
    if existing:
        existing.user_id = user.id
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
    else:
        db.add(PushSubscription(user_id=user.id, endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth))
    db.commit()
    return {"ok": True}


@router.delete("/subscribe", status_code=204)
def unsubscribe(body: PushSubscriptionDelete, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(PushSubscription).filter_by(endpoint=body.endpoint, user_id=user.id).delete()
    db.commit()
