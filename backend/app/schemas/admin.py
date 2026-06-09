from __future__ import annotations

from pydantic import EmailStr, Field

from app.models.enums import OrgStatus, PlanTier, UserRole
from app.schemas.auth import OrganizationOut, UserOut
from app.schemas.common import CamelModel


class CEOMetrics(CamelModel):
    mrr: float
    arr: float
    active_organizations: int
    active_stores: int
    connected_integrations: int
    total_orders_processed: int
    ai_queries_processed: int
    churn_rate: float


class ProvisionOrgRequest(CamelModel):
    organization_name: str = Field(min_length=1, max_length=255)
    plan: PlanTier = PlanTier.starter
    owner_name: str = Field(min_length=1, max_length=255)
    owner_email: EmailStr
    owner_password: str = Field(min_length=8, max_length=128)


class ProvisionOrgResult(CamelModel):
    organization: OrganizationOut
    owner: UserOut


class CreateOrgUserRequest(CamelModel):
    name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.admin


class AdminOrgOut(CamelModel):
    id: str
    name: str
    plan: PlanTier
    status: OrgStatus
    currency: str
    user_count: int
    store_count: int
    created_at: str


class ImpersonateRequest(CamelModel):
    organization_id: str


class ImpersonateResult(CamelModel):
    access_token: str
    token_type: str = "bearer"
    organization: OrganizationOut
