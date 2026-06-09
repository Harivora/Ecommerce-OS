"""Organization profile (settings page)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
from app.models.organization import Organization
from app.schemas.auth import OrganizationOut
from app.schemas.organization import OrganizationUpdate

router = APIRouter()


@router.get("/me", response_model=OrganizationOut)
async def get_my_org(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> OrganizationOut:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    return OrganizationOut.model_validate(org)


@router.patch("/me", response_model=OrganizationOut)
async def update_my_org(
    payload: OrganizationUpdate,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> OrganizationOut:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organization not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(org, field, value)
    await db.flush()
    return OrganizationOut.model_validate(org)
