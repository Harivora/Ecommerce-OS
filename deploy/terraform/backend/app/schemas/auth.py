from __future__ import annotations

from pydantic import EmailStr, Field

from app.models.enums import PlanTier, UserRole, UserStatus
from app.schemas.common import CamelModel


class SignupRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    organization_name: str | None = Field(default=None, max_length=255)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class TokenPair(CamelModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(CamelModel):
    refresh_token: str


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class ResetPasswordRequest(CamelModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)


class OrganizationOut(CamelModel):
    id: str
    name: str
    logo: str | None = None
    plan: PlanTier
    timezone: str
    currency: str


class UserOut(CamelModel):
    id: str
    name: str
    email: EmailStr
    avatar: str | None = None
    role: UserRole
    status: UserStatus
    organization_id: str | None = None


class MeOut(CamelModel):
    user: UserOut
    organization: OrganizationOut | None = None


class AuthResponse(CamelModel):
    """Returned on signup/login: tokens + the resolved user/org."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut
    organization: OrganizationOut | None = None
