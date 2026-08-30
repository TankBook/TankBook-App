from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    RegisterRequest, LoginRequest, ChangePasswordRequest, UserOut,
    AuthConfigOut, AuthSettingsOut, AuthSettingsUpdate,
)
from app.services.auth import (
    hash_password, verify_password, create_session, revoke_session,
    set_session_cookie, clear_session_cookie, get_current_user,
    get_or_create_auth_settings, registration_allowed,
    oidc_enabled, oauth, OIDC_DISPLAY_NAME, SESSION_COOKIE,
)

router = APIRouter()

MIN_PASSWORD_LENGTH = 8


def _to_out(user: User) -> UserOut:
    return UserOut(id=user.id, email=user.email, display_name=user.display_name, has_password=bool(user.password_hash))


@router.get("/config", response_model=AuthConfigOut)
def auth_config(db: DBSession = Depends(get_db)):
    return AuthConfigOut(
        allow_registration_effective=registration_allowed(db),
        oidc_enabled=oidc_enabled,
        oidc_label=OIDC_DISPLAY_NAME if oidc_enabled else None,
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

    token = create_session(db, user)
    set_session_cookie(response, request, token)
    return _to_out(user)


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, request: Request, db: DBSession = Depends(get_db)):
    user = db.query(User).filter_by(email=body.email.strip().lower()).first()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Incorrect email or password")

    token = create_session(db, user)
    set_session_cookie(response, request, token)
    return _to_out(user)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: DBSession = Depends(get_db)):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        revoke_session(db, token)
    clear_session_cookie(response)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return _to_out(user)


@router.post("/change-password", response_model=UserOut)
def change_password(body: ChangePasswordRequest, user: User = Depends(get_current_user), db: DBSession = Depends(get_db)):
    if user.password_hash and not verify_password(body.current_password or "", user.password_hash):
        raise HTTPException(401, "Current password is incorrect")
    if len(body.new_password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(422, f"Password must be at least {MIN_PASSWORD_LENGTH} characters")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return _to_out(user)


@router.get("/settings", response_model=AuthSettingsOut)
def get_auth_settings(db: DBSession = Depends(get_db), _user: User = Depends(get_current_user)):
    return get_or_create_auth_settings(db)


@router.patch("/settings", response_model=AuthSettingsOut)
def update_auth_settings(body: AuthSettingsUpdate, db: DBSession = Depends(get_db), _user: User = Depends(get_current_user)):
    settings = get_or_create_auth_settings(db)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(settings, k, v)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/oidc/login")
async def oidc_login(request: Request):
    if not oidc_enabled:
        raise HTTPException(404, "OIDC is not configured")
    redirect_uri = str(request.url_for("oidc_callback"))
    return await oauth.oidc.authorize_redirect(request, redirect_uri)


@router.get("/oidc/callback")
async def oidc_callback(request: Request, db: DBSession = Depends(get_db)):
    if not oidc_enabled:
        raise HTTPException(404, "OIDC is not configured")
    token = await oauth.oidc.authorize_access_token(request)
    claims = token.get("userinfo") or await oauth.oidc.userinfo(token=token)
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
    elif not user.oidc_subject:
        user.oidc_subject = subject
        db.commit()

    session_token = create_session(db, user)
    redirect = RedirectResponse(url="/")
    set_session_cookie(redirect, request, session_token)
    return redirect
