import secrets
from datetime import datetime, timedelta

import bcrypt
from authlib.integrations.starlette_client import OAuth
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import User, Session as SessionModel, AuthSettings

SESSION_COOKIE = "tankbook_session"
SESSION_TTL_DAYS = 30


def oidc_configured(settings: AuthSettings) -> bool:
    return bool(settings.oidc_issuer_url and settings.oidc_client_id and settings.oidc_client_secret)


def build_oidc_client(settings: AuthSettings):
    """OIDC config lives in the database and can change at runtime (via the Users settings tab),
    so the client is built fresh per request rather than registered once at startup."""
    oauth = OAuth()
    oauth.register(
        name="oidc",
        server_metadata_url=f"{settings.oidc_issuer_url.rstrip('/')}/.well-known/openid-configuration",
        client_id=settings.oidc_client_id,
        client_secret=settings.oidc_client_secret,
        client_kwargs={"scope": "openid email profile"},
    )
    return oauth.oidc


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def get_or_create_auth_settings(db: DBSession) -> AuthSettings:
    settings = db.query(AuthSettings).filter_by(id="default").first()
    if not settings:
        settings = AuthSettings(id="default")
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def registration_allowed(db: DBSession) -> bool:
    if db.query(User).count() == 0:
        return True
    return get_or_create_auth_settings(db).allow_registration


def create_session(db: DBSession, user: User) -> str:
    token = secrets.token_urlsafe(32)
    session = SessionModel(id=token, user_id=user.id, expires_at=datetime.utcnow() + timedelta(days=SESSION_TTL_DAYS))
    db.add(session)
    user.last_login_at = datetime.utcnow()
    db.commit()
    return token


def revoke_session(db: DBSession, token: str) -> None:
    db.query(SessionModel).filter_by(id=token).delete()
    db.commit()


def set_session_cookie(response: Response, request: Request, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE, token,
        httponly=True, samesite="lax", secure=request.url.scheme == "https",
        max_age=SESSION_TTL_DAYS * 24 * 3600, path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/")


def get_current_user(request: Request, db: DBSession = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        raise HTTPException(401, "Not authenticated")
    session = db.query(SessionModel).filter_by(id=token).first()
    if not session or session.expires_at < datetime.utcnow():
        raise HTTPException(401, "Session expired")
    user = db.query(User).filter_by(id=session.user_id).first()
    if not user:
        raise HTTPException(401, "Not authenticated")
    return user
