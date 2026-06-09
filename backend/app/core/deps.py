"""FastAPI dependencies: DB session, current user, tenant scoping, RBAC."""
from __future__ import annotations

from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.enums import OrgStatus, UserRole
from app.models.organization import Organization
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

_CRED_EXC = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


@dataclass
class AuthContext:
    """Resolved auth state for a request."""

    user: User
    role: UserRole
    organization_id: str | None
    impersonated_by: str | None = None

    @property
    def is_super_admin(self) -> bool:
        return self.role == UserRole.super_admin and self.impersonated_by is None


async def get_auth_context(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> AuthContext:
    if creds is None:
        raise _CRED_EXC
    try:
        payload = decode_token(creds.credentials)
        if payload.get("type") != "access":
            raise _CRED_EXC
        user_id = payload["sub"]
    except (jwt.PyJWTError, KeyError):
        raise _CRED_EXC

    user = await db.get(User, user_id)
    if user is None:
        raise _CRED_EXC

    return AuthContext(
        user=user,
        role=UserRole(payload.get("role", user.role.value)),
        # The token's org claim is authoritative (supports impersonation);
        # falls back to the user's own org.
        organization_id=payload.get("org") or user.organization_id,
        impersonated_by=payload.get("imp"),
    )


async def get_current_user(ctx: AuthContext = Depends(get_auth_context)) -> User:
    return ctx.user


async def require_org(
    ctx: AuthContext = Depends(get_auth_context),
    db: AsyncSession = Depends(get_db),
) -> str:
    """Return the tenant id for the request, or 400 if the token isn't scoped.

    A bare super-admin token has no org; it must impersonate (or use admin
    routes) to access tenant data. Suspended/cancelled tenants are blocked here
    too (so an already-logged-in session loses access), except when a super-admin
    is impersonating — support must still be able to investigate.
    """
    if not ctx.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No organization in scope. Super-admins must impersonate an org.",
        )
    if ctx.impersonated_by is None:
        org = await db.get(Organization, ctx.organization_id)
        if org is not None and org.status in (OrgStatus.suspended, OrgStatus.cancelled):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Subscription {org.status.value}. Access is paused — contact support.",
            )
    return ctx.organization_id


def require_roles(*roles: UserRole):
    """Dependency factory enforcing that the caller holds one of ``roles``."""

    async def _checker(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if ctx.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return ctx

    return _checker


async def require_super_admin(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if ctx.role != UserRole.super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Super-admin only"
        )
    return ctx


# Roles allowed to mutate org data (everything except viewer).
require_editor = require_roles(UserRole.owner, UserRole.admin, UserRole.super_admin)
