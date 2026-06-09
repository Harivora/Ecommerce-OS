"""Authentication: signup, login, refresh, me, password reset."""
from __future__ import annotations

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_auth_context, AuthContext
from app.core.email import password_reset_link, send_email
from app.core.ratelimit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.auth import PasswordResetToken
from app.models.enums import OrgStatus, UserRole, UserStatus
from app.models.organization import Organization
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    LoginRequest,
    MeOut,
    OrganizationOut,
    RefreshRequest,
    ResetPasswordRequest,
    SignupRequest,
    TokenPair,
    UserOut,
)
from app.schemas.common import Message

router = APIRouter()
logger = logging.getLogger(__name__)


def _auth_response(user: User, org: Organization | None) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(
            user.id, role=user.role.value, organization_id=user.organization_id
        ),
        refresh_token=create_refresh_token(user.id),
        user=UserOut.model_validate(user),
        organization=OrganizationOut.model_validate(org) if org else None,
    )


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(5)),
) -> AuthResponse:
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    org = Organization(name=payload.organization_name or f"{payload.name}'s Brand")
    db.add(org)
    await db.flush()

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=UserRole.owner,
        status=UserStatus.active,
        organization_id=org.id,
        last_active=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.flush()
    return _auth_response(user, org)


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(10)),
) -> AuthResponse:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not user.password_hash or not verify_password(
        payload.password, user.password_hash
    ):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if user.status == UserStatus.inactive:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    org = await db.get(Organization, user.organization_id) if user.organization_id else None
    # Block suspended/cancelled tenants at login (the "stop service if payment
    # is due" enforcement). Past-due can still log in (flagged elsewhere).
    if org is not None and org.status in (OrgStatus.suspended, OrgStatus.cancelled):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            f"Your subscription is {org.status.value}. Please contact support to restore access.",
        )

    user.last_active = datetime.now(timezone.utc)
    return _auth_response(user, org)


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)) -> TokenPair:
    try:
        decoded = decode_token(payload.refresh_token)
        if decoded.get("type") != "refresh":
            raise ValueError
        user_id = decoded["sub"]
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")

    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    return TokenPair(
        access_token=create_access_token(
            user.id, role=user.role.value, organization_id=user.organization_id
        ),
        refresh_token=create_refresh_token(user.id),
    )


@router.get("/me", response_model=MeOut)
async def me(
    ctx: AuthContext = Depends(get_auth_context), db: AsyncSession = Depends(get_db)
) -> MeOut:
    org = (
        await db.get(Organization, ctx.organization_id) if ctx.organization_id else None
    )
    return MeOut(
        user=UserOut.model_validate(ctx.user),
        organization=OrganizationOut.model_validate(org) if org else None,
    )


@router.post("/forgot-password", response_model=Message)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(5)),
) -> Message:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    # Always respond the same way to avoid email enumeration.
    if user is None:
        return Message(detail="If that email exists, a reset link has been sent.")

    raw_token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
    )
    if settings.smtp_host:
        link = password_reset_link(raw_token)
        await run_in_threadpool(
            send_email,
            user.email,
            "Reset your AI Commerce OS password",
            (
                "We received a request to reset your password.\n\n"
                f"Reset it here (valid for 1 hour): {link}\n\n"
                "If you didn't request this, you can safely ignore this email."
            ),
            (
                "<p>We received a request to reset your password.</p>"
                f'<p><a href="{link}">Reset your password</a> (valid for 1 hour).</p>'
                "<p>If you didn't request this, you can safely ignore this email.</p>"
            ),
        )
        return Message(detail="If that email exists, a reset link has been sent.")
    # No SMTP: only expose the token OUTSIDE production (dev convenience).
    # Returning it in production would be an account-takeover hole.
    if settings.environment.lower() != "production":
        return Message(detail=f"Reset token (dev only, no SMTP): {raw_token}")
    logger.warning("Password reset requested but SMTP is not configured (production).")
    return Message(detail="If that email exists, a reset link has been sent.")


@router.post("/reset-password", response_model=Message)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(rate_limit(10)),
) -> Message:
    token_hash = hashlib.sha256(payload.token.encode()).hexdigest()
    record = await db.scalar(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    if (
        record is None
        or record.used
        or record.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired token")

    user = await db.get(User, record.user_id)
    if user is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid token")
    user.password_hash = hash_password(payload.new_password)
    record.used = True
    return Message(detail="Password updated successfully.")
