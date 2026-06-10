"""Schemas for the super-admin client console."""
from __future__ import annotations

from app.models.enums import OrgStatus, PlanTier, UserRole
from app.schemas.common import CamelModel


class AdminClientOut(CamelModel):
    """A row in the clients table."""

    id: str
    name: str
    plan: PlanTier
    status: OrgStatus
    currency: str
    monthly_price: float
    owner_name: str | None = None
    owner_email: str | None = None
    user_count: int
    store_count: int
    last_active: str | None = None
    created_at: str


class OrgStatusUpdate(CamelModel):
    status: OrgStatus


class PlanUpdate(CamelModel):
    plan: PlanTier


class ResetPasswordResult(CamelModel):
    email: str
    temporary_password: str
    detail: str


class AdminClientUser(CamelModel):
    id: str
    name: str
    email: str
    role: UserRole
    status: str
    last_active: str | None = None


class AdminClientIntegrationOut(CamelModel):
    provider: str
    name: str
    status: str
    last_sync: str | None = None


class AdminClientDetail(CamelModel):
    id: str
    name: str
    plan: PlanTier
    status: OrgStatus
    currency: str
    monthly_price: float
    created_at: str
    owner_email: str | None = None
    # Store performance (the client's own business).
    total_revenue: float
    total_net_profit: float
    avg_margin: float
    orders_count: int
    # Platform health.
    connected_integrations: int
    store_count: int
    ai_queries: int
    users: list[AdminClientUser]
    integrations: list[AdminClientIntegrationOut]