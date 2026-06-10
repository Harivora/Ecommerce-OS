"""Team management (settings page): list, invite, update members."""
from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
from app.core.email import password_reset_link, send_email
from app.models.auth import PasswordResetToken
from app.models.enums import UserStatus
from app.models.user import User
from app.schemas.organization import (
    InviteMemberRequest,
    TeamMemberOut,
    UpdateMemberRequest,
)

router = APIRouter()


def _to_member(u: User) -> TeamMemberOut:
    return TeamMemberOut(
        id=u.id,
        name=u.name,
        email=u.email,
        role=u.role,
        avatar=u.avatar,
        last_active=u.last_active.isoformat() if u.last_active else None,
        status=u.status,
    )


@router.get("", response_model=list[TeamMemberOut])
async def list_team(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[TeamMemberOut]:
    members = (
        await db.scalars(select(User).where(User.organization_id == org_id))
    ).all()
    return [_to_member(m) for m in members]


@router.post("", response_model=TeamMemberOut, status_code=status.HTTP_201_CREATED)
async def invite_member(
    payload: InviteMemberRequest,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> TeamMemberOut:
    if await db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    # Invited users have no password until they complete a reset flow.
    member = User(
        name=payload.name,
        email=payload.email.lower(),
        role=payload.role,
        status=UserStatus.invited,
        organization_id=org_id,
    )
    db.add(member)
    await db.flush()

    # Send an invite email with a set-password link (reuses the reset flow).
    raw_token = secrets.token_urlsafe(32)
    db.add(
        PasswordResetToken(
            user_id=member.id,
            token_hash=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    link = password_reset_link(raw_token)
    await run_in_threadpool(
        send_email,
        member.email,
        "You've been invited to AI Commerce OS",
        (
            "You've been invited to join a team on AI Commerce OS.\n\n"
            f"Set your password to get started (valid 7 days): {link}"
        ),
        (
            "<p>You've been invited to join a team on AI Commerce OS.</p>"
            f'<p><a href="{link}">Set your password</a> to get started (valid 7 days).</p>'
        ),
    )
    return _to_member(member)


@router.patch("/{user_id}", response_model=TeamMemberOut)
async def update_member(
    user_id: str,
    payload: UpdateMemberRequest,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> TeamMemberOut:
    member = await db.get(User, user_id)
    if member is None or member.organization_id != org_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Member not found")
    if payload.role is not None:
        member.role = payload.role
    if payload.status is not None:
        member.status = payload.status
    await db.flush()
    return _to_member(member)
