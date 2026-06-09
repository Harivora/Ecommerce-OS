from __future__ import annotations

from pydantic import EmailStr, Field

from app.models.enums import PlanTier, UserRole, UserStatus
from app.schemas.common import CamelModel


class OrganizationUpdate(CamelModel):
    name: str | None = None
    timezone: str | None = None
    currency: str | None = None
    logo: str | None = None
    plan: PlanTier | None = None


class TeamMemberOut(CamelModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    avatar: str | None = None
    last_active: str | None = None
    status: UserStatus


class InviteMemberRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    role: UserRole = UserRole.viewer


class UpdateMemberRequest(CamelModel):
    role: UserRole | None = None
    status: UserStatus | None = None
