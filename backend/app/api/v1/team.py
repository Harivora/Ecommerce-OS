"""Team management (settings page): list, invite, update members."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
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
