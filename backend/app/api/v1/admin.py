"""Super-admin: CEO metrics, org provisioning, user creation, impersonation."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthContext, require_super_admin
from app.core.plans import PLAN_PRICE_INR as PLAN_PRICE
from app.core.security import create_access_token, hash_password
from app.models.ai import AIMessage
from app.models.enums import (
    ConnectionStatus,
    MessageRole,
    OrgStatus,
    PlanTier,
    UserRole,
    UserStatus,
)
from app.models.integration import Integration
from app.models.order import Order
from app.models.organization import Organization
from app.models.store import Store
from app.models.user import User
from app.schemas.admin import (
    AdminOrgOut,
    CEOMetrics,
    CreateOrgUserRequest,
    ImpersonateRequest,
    ImpersonateResult,
    ProvisionOrgRequest,
    ProvisionOrgResult,
)
from app.schemas.auth import OrganizationOut, UserOut

router = APIRouter()

# Monthly price per plan (INR) — single source of truth in app.core.plans
# (imported above as PLAN_PRICE), used for MRR/ARR.


@router.get("/metrics", response_model=CEOMetrics)
async def ceo_metrics(
    _: AuthContext = Depends(require_super_admin), db: AsyncSession = Depends(get_db)
) -> CEOMetrics:
    active_orgs = (
        await db.scalars(
            select(Organization).where(Organization.status == OrgStatus.active)
        )
    ).all()
    mrr = sum(PLAN_PRICE.get(o.plan, 0) for o in active_orgs)

    total_orgs = await db.scalar(select(func.count(Organization.id))) or 0
    cancelled = await db.scalar(
        select(func.count(Organization.id)).where(
            Organization.status == OrgStatus.cancelled
        )
    ) or 0
    active_stores = await db.scalar(
        select(func.count(Store.id)).where(Store.status == ConnectionStatus.connected)
    ) or 0
    connected_integrations = await db.scalar(
        select(func.count(Integration.id)).where(
            Integration.status == ConnectionStatus.connected
        )
    ) or 0
    total_orders = await db.scalar(select(func.count(Order.id))) or 0
    ai_queries = await db.scalar(
        select(func.count(AIMessage.id)).where(AIMessage.role == MessageRole.user)
    ) or 0

    churn = (cancelled / total_orgs * 100) if total_orgs else 0.0
    return CEOMetrics(
        mrr=float(mrr),
        arr=float(mrr * 12),
        active_organizations=len(active_orgs),
        active_stores=active_stores,
        connected_integrations=connected_integrations,
        total_orders_processed=total_orders,
        ai_queries_processed=ai_queries,
        churn_rate=round(churn, 2),
    )


@router.get("/organizations", response_model=list[AdminOrgOut])
async def list_organizations(
    _: AuthContext = Depends(require_super_admin), db: AsyncSession = Depends(get_db)
) -> list[AdminOrgOut]:
    orgs = (await db.scalars(select(Organization).order_by(Organization.created_at.desc()))).all()
    out: list[AdminOrgOut] = []
    for o in orgs:
        users = await db.scalar(
            select(func.count(User.id)).where(User.organization_id == o.id)
        ) or 0
        stores = await db.scalar(
            select(func.count(Store.id)).where(Store.organization_id == o.id)
        ) or 0
        out.append(
            AdminOrgOut(
                id=o.id,
                name=o.name,
                plan=o.plan,
                status=o.status,
                currency=o.currency,
                user_count=users,
                store_count=stores,
                created_at=o.created_at.isoformat(),
            )
        )
    return out


@router.post(
    "/organizations", response_model=ProvisionOrgResult, status_code=status.HTTP_201_CREATED
)
async def provision_organization(
    payload: ProvisionOrgRequest,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ProvisionOrgResult:
    """Create an org + its owner login — the 'give id/pass to the subscriber' flow."""
    existing = await db.scalar(select(User).where(User.email == payload.owner_email.lower()))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Owner email already registered")

    org = Organization(name=payload.organization_name, plan=payload.plan)
    db.add(org)
    await db.flush()

    owner = User(
        name=payload.owner_name,
        email=payload.owner_email.lower(),
        password_hash=hash_password(payload.owner_password),
        role=UserRole.owner,
        status=UserStatus.active,
        organization_id=org.id,
    )
    db.add(owner)
    await db.flush()
    return ProvisionOrgResult(
        organization=OrganizationOut.model_validate(org),
        owner=UserOut.model_validate(owner),
    )


@router.post("/organizations/{org_id}/users", response_model=UserOut)
async def create_org_user(
    org_id: str,
    payload: CreateOrgUserRequest,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> UserOut:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    if await db.scalar(select(User).where(User.email == payload.email.lower())):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")

    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=UserStatus.active,
        organization_id=org_id,
    )
    db.add(user)
    await db.flush()
    return UserOut.model_validate(user)


@router.post("/impersonate", response_model=ImpersonateResult)
async def impersonate(
    payload: ImpersonateRequest,
    ctx: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ImpersonateResult:
    """Issue an access token scoped to a target org for support/debugging."""
    org = await db.get(Organization, payload.organization_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    token = create_access_token(
        ctx.user.id,
        role=UserRole.admin.value,  # act as an org admin within the tenant
        organization_id=org.id,
        impersonated_by=ctx.user.id,
    )
    return ImpersonateResult(
        access_token=token, organization=OrganizationOut.model_validate(org)
    )
