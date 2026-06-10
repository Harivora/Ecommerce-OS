"""Super-admin client console: rich client list, per-client detail, status
control (active / past-due / suspended), and owner password reset.

Mounted under /admin alongside the existing admin router. All routes are
super-admin only. Passwords are never exposed — reset issues a NEW temp password.
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import SyncSessionLocal, get_db
from app.core.deps import AuthContext, require_super_admin
from app.core.plans import monthly_price
from app.core.security import hash_password
from app.services.backup import (
    available_datasets,
    build_backup_archive,
    export_dataset_csv,
)
from app.models.ai import AIConversation, AIMessage
from app.models.enums import ConnectionStatus, MessageRole, UserRole
from app.models.finance import ProfitMetric
from app.models.integration import Integration
from app.models.order import Order
from app.models.organization import Organization
from app.models.store import Store
from app.models.user import User
from app.schemas.admin_console import (
    AdminClientDetail,
    AdminClientIntegrationOut,
    AdminClientOut,
    AdminClientUser,
    OrgStatusUpdate,
    PlanUpdate,
    ResetPasswordResult,
)

router = APIRouter()


async def _owner(db: AsyncSession, org_id: str) -> User | None:
    """The org's owner (fallback: earliest user)."""
    owner = await db.scalar(
        select(User)
        .where(User.organization_id == org_id, User.role == UserRole.owner)
        .order_by(User.created_at.asc())
    )
    if owner is None:
        owner = await db.scalar(
            select(User)
            .where(User.organization_id == org_id)
            .order_by(User.created_at.asc())
        )
    return owner


async def _client_out(db: AsyncSession, org: Organization) -> AdminClientOut:
    user_count = await db.scalar(
        select(func.count(User.id)).where(User.organization_id == org.id)
    ) or 0
    store_count = await db.scalar(
        select(func.count(Store.id)).where(Store.organization_id == org.id)
    ) or 0
    last_active = await db.scalar(
        select(func.max(User.last_active)).where(User.organization_id == org.id)
    )
    owner = await _owner(db, org.id)
    return AdminClientOut(
        id=org.id,
        name=org.name,
        plan=org.plan,
        status=org.status,
        currency=org.currency,
        monthly_price=float(monthly_price(org.plan)),
        owner_name=owner.name if owner else None,
        owner_email=owner.email if owner else None,
        user_count=user_count,
        store_count=store_count,
        last_active=last_active.isoformat() if last_active else None,
        created_at=org.created_at.isoformat(),
    )


@router.get("/clients", response_model=list[AdminClientOut])
async def list_clients(
    _: AuthContext = Depends(require_super_admin), db: AsyncSession = Depends(get_db)
) -> list[AdminClientOut]:
    orgs = (
        await db.scalars(select(Organization).order_by(Organization.created_at.desc()))
    ).all()
    return [await _client_out(db, o) for o in orgs]


@router.get("/clients/{org_id}", response_model=AdminClientDetail)
async def client_detail(
    org_id: str,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminClientDetail:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")

    total_revenue = await db.scalar(
        select(func.coalesce(func.sum(ProfitMetric.revenue), 0.0)).where(
            ProfitMetric.organization_id == org_id
        )
    ) or 0.0
    total_net = await db.scalar(
        select(func.coalesce(func.sum(ProfitMetric.net_profit), 0.0)).where(
            ProfitMetric.organization_id == org_id
        )
    ) or 0.0
    orders_count = await db.scalar(
        select(func.count(Order.id)).where(Order.organization_id == org_id)
    ) or 0
    connected = await db.scalar(
        select(func.count(Integration.id)).where(
            Integration.organization_id == org_id,
            Integration.status == ConnectionStatus.connected,
        )
    ) or 0
    store_count = await db.scalar(
        select(func.count(Store.id)).where(Store.organization_id == org_id)
    ) or 0
    ai_queries = await db.scalar(
        select(func.count(AIMessage.id))
        .join(AIConversation, AIMessage.conversation_id == AIConversation.id)
        .where(
            AIConversation.organization_id == org_id,
            AIMessage.role == MessageRole.user,
        )
    ) or 0

    users = (
        await db.scalars(
            select(User)
            .where(User.organization_id == org_id)
            .order_by(User.created_at.asc())
        )
    ).all()
    integrations = (
        await db.scalars(
            select(Integration).where(Integration.organization_id == org_id)
        )
    ).all()
    owner = await _owner(db, org_id)

    avg_margin = (total_net / total_revenue * 100) if total_revenue else 0.0
    return AdminClientDetail(
        id=org.id,
        name=org.name,
        plan=org.plan,
        status=org.status,
        currency=org.currency,
        monthly_price=float(monthly_price(org.plan)),
        created_at=org.created_at.isoformat(),
        owner_email=owner.email if owner else None,
        total_revenue=round(float(total_revenue), 2),
        total_net_profit=round(float(total_net), 2),
        avg_margin=round(avg_margin, 2),
        orders_count=orders_count,
        connected_integrations=connected,
        store_count=store_count,
        ai_queries=ai_queries,
        users=[
            AdminClientUser(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                status=u.status.value,
                last_active=u.last_active.isoformat() if u.last_active else None,
            )
            for u in users
        ],
        integrations=[
            AdminClientIntegrationOut(
                provider=i.provider,
                name=i.name,
                status=i.status.value,
                last_sync=i.last_sync.isoformat() if i.last_sync else None,
            )
            for i in integrations
        ],
    )


@router.patch("/clients/{org_id}/status", response_model=AdminClientOut)
async def set_client_status(
    org_id: str,
    payload: OrgStatusUpdate,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminClientOut:
    """Activate / mark past-due / suspend / cancel a client."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    org.status = payload.status
    await db.flush()
    return await _client_out(db, org)


@router.patch("/clients/{org_id}/plan", response_model=AdminClientOut)
async def set_client_plan(
    org_id: str,
    payload: PlanUpdate,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> AdminClientOut:
    """Change a client's subscription plan (gates their feature access)."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    org.plan = payload.plan
    await db.flush()
    return await _client_out(db, org)


@router.post("/clients/{org_id}/reset-password", response_model=ResetPasswordResult)
async def reset_owner_password(
    org_id: str,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> ResetPasswordResult:
    """Set a NEW temporary password for the client's owner and return it once.

    The real password is never recoverable (Argon2 hash); this replaces it.
    """
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    owner = await _owner(db, org_id)
    if owner is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This client has no user to reset.")

    temp_password = secrets.token_urlsafe(9)
    owner.password_hash = hash_password(temp_password)
    await db.flush()
    return ResetPasswordResult(
        email=owner.email,
        temporary_password=temp_password,
        detail="Temporary password set. Share it securely; the client should change it after logging in.",
    )


# ── Per-client data export (super-admin) ────────────────────
@router.get("/clients/{org_id}/export/datasets")
async def client_export_datasets(
    org_id: str,
    _: AuthContext = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> list[dict[str, str]]:
    if await db.get(Organization, org_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Client not found")
    return available_datasets()


@router.get("/clients/{org_id}/export/dataset/{key}")
async def client_export_dataset(
    org_id: str,
    key: str,
    _: AuthContext = Depends(require_super_admin),
    
) -> Response:
    def _build():
        with SyncSessionLocal() as session:
            return export_dataset_csv(session, org_id, key)

    result = await run_in_threadpool(_build)
    if result is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown dataset")
    filename, data = result
    return Response(
        content=data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/clients/{org_id}/export/all")
async def client_export_all(
    org_id: str,
    _: AuthContext = Depends(require_super_admin),
) -> Response:
    def _build():
        with SyncSessionLocal() as session:
            return build_backup_archive(session, org_id)

    filename, data, _counts = await run_in_threadpool(_build)
    return Response(
        content=data,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )