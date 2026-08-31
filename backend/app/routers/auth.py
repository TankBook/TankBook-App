import json
from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import User, AuthSettings, DASHBOARD_SECTION_IDS
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, ChangePasswordRequest, UserOut, UserListItemOut, UserUpdateRequest,
    AuthConfigOut, AuthSettingsOut, AuthSettingsUpdate, PermissionsOut, PermissionsUpdate, ProfileUpdate,
)
from app.services.auth import (
    hash_password, verify_password, create_session, revoke_session,
    set_session_cookie, clear_session_cookie, get_current_user,
    get_or_create_auth_settings, registration_allowed,
    oidc_configured, build_oidc_client, SESSION_COOKIE,
)
from app.services import permissions as permissions_service
from app.services.permissions import require_permission, PERMISSION_KEYS

router = APIRouter()

require_users_edit = Depends(require_permission("users", "edit"))

MIN_PASSWORD_LENGTH = 8
VALID_DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]
VALID_UNIT_SYSTEMS = ["mm", "cm", "m", "imperial"]

# In-process login attempt tracking — fine for this app's single-container deployment
# (no multi-replica concerns, same assumption already made by the push-notification
# sweep loop). Keyed by email so brute-forcing one known account is blocked regardless
# of source IP.
_failed_logins: dict[str, list[datetime]] = defaultdict(list)
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_WINDOW = timedelta(minutes=15)


def _check_login_rate_limit(email: str) -> None:
    now = datetime.utcnow()
    attempts = [t for t in _failed_logins[email] if now - t < LOGIN_LOCKOUT_WINDOW]
    _failed_logins[email] = attempts
    if len(attempts) >= LOGIN_MAX_ATTEMPTS:
        raise HTTPException(429, "Too many failed login attempts. Try again in a few minutes.")


def _record_login_failure(email: str) -> None:
    _failed_logins[email].append(datetime.utcnow())


def _to_out(db: DBSession, user: User) -> UserOut:
    return UserOut(
        id=user.id, email=user.email, display_name=user.display_name, has_password=bool(user.password_hash),
        permissions=permissions_service.get_all_for_user(db, user.id),
        date_format=user.date_format, unit_system=user.unit_system,
        notifications_enabled=user.notifications_enabled,
        dashboard_layout=user.dashboard_layout,
    )


def _to_list_item(user: User) -> UserListItemOut:
    return UserListItemOut(
        id=user.id, email=user.email, display_name=user.display_name,
        has_password=bool(user.password_hash), has_oidc=bool(user.oidc_subject),
        created_at=user.created_at, last_login_at=user.last_login_at,
    )


def _bootstrap_admin_if_first_user(db: DBSession, user: User) -> None:
    """New accounts get no permissions by default (see services/permissions.py) — except
    the very first account ever created on an instance, which needs to be able to
    administer the fresh install."""
    if db.query(User).count() == 1:
        for key in PERMISSION_KEYS:
            permissions_service.set_level(db, user.id, key, "edit")


def _settings_to_out(settings: AuthSettings) -> AuthSettingsOut:
    return AuthSettingsOut(
        allow_registration=settings.allow_registration,
        oidc_issuer_url=settings.oidc_issuer_url,
        oidc_client_id=settings.oidc_client_id,
        oidc_client_secret_set=bool(settings.oidc_client_secret),
        oidc_display_name=settings.oidc_display_name,
        updated_at=settings.updated_at,
    )


@router.get("/config", response_model=AuthConfigOut)
def auth_config(db: DBSession = Depends(get_db)):
    settings = get_or_create_auth_settings(db)
    configured = oidc_configured(settings)
    return AuthConfigOut(
        allow_registration_effective=registration_allowed(db),
        oidc_enabled=configured,
        oidc_label=(settings.oidc_display_name or "SSO") if configured else None,
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(body: RegisterRequest, response: Response, request: Request, db: DBSession = Depends(get_db)):
    if not registration_allowed(db):
        raise HTTPException(403, "Registration is currently disabled on this instance")
    if len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(422, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(422, "Enter a valid email address")
    if db.query(User).filter_by(email=email).first():
        raise HTTPException(409, "An account with that email already exists")

    user = User(email=email, display_name=body.display_name or None, password_hash=hash_password(body.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    _bootstrap_admin_if_first_user(db, user)

    token = create_session(db, user)
    set_session_cookie(response, request, token)
    return _to_out(db, user)


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, request: Request, db: DBSession = Depends(get_db)):
    email = body.email.strip().lower()
    _check_login_rate_limit(email)
    user = db.query(User).filter_by(email=email).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        _record_login_failure(email)
        raise HTTPException(401, "Incorrect email or password")
    _failed_logins.pop(email, None)

    token = create_session(db, user)
    set_session_cookie(response, request, token)
    return _to_out(db, user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DBSession = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        revoke_session(db, token)
    clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    return _to_out(db, user)


@router.patch("/me", response_model=UserOut)
def update_profile(body: ProfileUpdate, user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    data = body.model_dump(exclude_unset=True)
    if "date_format" in data and data["date_format"] not in VALID_DATE_FORMATS:
        data.pop("date_format")
    if "unit_system" in data and data["unit_system"] not in VALID_UNIT_SYSTEMS:
        data.pop("unit_system")
    if "dashboard_layout" in data:
        layout = data.pop("dashboard_layout")
        cleaned = [item for item in layout if item.get("id") in DASHBOARD_SECTION_IDS]
        user.dashboard_layout_json = json.dumps(cleaned) if cleaned else None
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return _to_out(db, user)


@router.get("/users", response_model=list[UserListItemOut])
def list_users(db: DBSession = Depends(get_db), _perm=require_users_edit):
    users = db.query(User).order_by(User.created_at.asc()).all()
    return [_to_list_item(u) for u in users]


@router.patch("/users/{user_id}", response_model=UserListItemOut)
def update_user(user_id: str, body: UserUpdateRequest, db: DBSession = Depends(get_db), _perm=require_users_edit):
    target = db.query(User).filter_by(id=user_id).first()
    if not target:
        raise HTTPException(404, "User not found")

    data = body.model_dump(exclude_unset=True)
    if "email" in data:
        email = (data["email"] or "").strip().lower()
        if not email or "@" not in email:
            raise HTTPException(422, "Enter a valid email address")
        existing = db.query(User).filter(User.email == email, User.id != target.id).first()
        if existing:
            raise HTTPException(409, "An account with that email already exists")
        target.email = email
    if "display_name" in data:
        target.display_name = data["display_name"] or None

    db.commit()
    db.refresh(target)
    return _to_list_item(target)


@router.delete("/users/{user_id}", status_code=204)
def delete_user(user_id: str, db: DBSession = Depends(get_db), user: User = require_users_edit):
    if user_id == user.id:
        raise HTTPException(400, "You can't delete your own account from here")
    target = db.query(User).filter_by(id=user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if db.query(User).count() <= 1:
        raise HTTPException(400, "Can't delete the only remaining account")
    db.delete(target)
    db.commit()


@router.get("/users/{user_id}/permissions", response_model=PermissionsOut)
def get_user_permissions(user_id: str, db: DBSession = Depends(get_db), _perm=require_users_edit):
    if not db.query(User).filter_by(id=user_id).first():
        raise HTTPException(404, "User not found")
    return PermissionsOut(**permissions_service.get_all_for_user(db, user_id))


@router.put("/users/{user_id}/permissions", response_model=PermissionsOut)
def update_user_permissions(user_id: str, body: PermissionsUpdate, db: DBSession = Depends(get_db), _perm=require_users_edit):
    if not db.query(User).filter_by(id=user_id).first():
        raise HTTPException(404, "User not found")
    for key, level in body.model_dump(exclude_unset=True).items():
        permissions_service.set_level(db, user_id, key, level)
    return PermissionsOut(**permissions_service.get_all_for_user(db, user_id))


@router.post("/change-password", response_model=UserOut)
def change_password(body: ChangePasswordRequest, user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if user.password_hash and not verify_password(body.current_password or "", user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(422, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return _to_out(db, user)


@router.get("/settings", response_model=AuthSettingsOut)
def get_auth_settings(db: DBSession = Depends(get_db), _perm=require_users_edit):
    return _settings_to_out(get_or_create_auth_settings(db))


@router.patch("/settings", response_model=AuthSettingsOut)
def update_auth_settings(body: AuthSettingsUpdate, db: DBSession = Depends(get_db), _perm=require_users_edit):
    settings = get_or_create_auth_settings(db)
    data = body.model_dump(exclude_unset=True)
    if "oidc_client_secret" in data:
        settings.oidc_client_secret = data.pop("oidc_client_secret") or None
    for k, v in data.items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return _settings_to_out(settings)


@router.get("/oidc/login")
async def oidc_login(request: Request, db: DBSession = Depends(get_db)):
    settings = get_or_create_auth_settings(db)
    if not oidc_configured(settings):
        raise HTTPException(404, "OIDC is not configured")
    client = build_oidc_client(settings)
    redirect_uri = str(request.url_for("oidc_callback"))
    return await client.authorize_redirect(request, redirect_uri)


@router.get("/oidc/callback")
async def oidc_callback(request: Request, db: DBSession = Depends(get_db)):
    settings = get_or_create_auth_settings(db)
    if not oidc_configured(settings):
        raise HTTPException(404, "OIDC is not configured")
    client = build_oidc_client(settings)
    token = await client.authorize_access_token(request)
    claims = token.get("userinfo") or await client.userinfo(token=token)
    subject = claims["sub"]
    email = claims.get("email")
    if not email:
        raise HTTPException(400, "OIDC provider did not return an email claim")
    email = email.strip().lower()

    user = db.query(User).filter_by(oidc_subject=subject).first()
    if not user:
        user = db.query(User).filter_by(email=email).first()
    if not user:
        user = User(email=email, display_name=claims.get("name"), oidc_subject=subject)
        db.add(user)
        db.commit()
        db.refresh(user)
        _bootstrap_admin_if_first_user(db, user)
    elif not user.oidc_subject:
        user.oidc_subject = subject
        db.commit()

    session_token = create_session(db, user)
    redirect = RedirectResponse(url="/")
    set_session_cookie(redirect, request, session_token)
    return redirect
