"""Ad spend: report + manual entry (until Meta/Google connectors exist)."""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import AuthContext, require_editor, require_org
from app.models.finance import AdSpend
from app.schemas.finance import AdCampaignOut, AdSpendCreate

router = APIRouter()
logger = logging.getLogger(__name__)


def _enqueue_recompute(org_id: str) -> None:
    """Best-effort profit recompute; tolerate a missing Celery broker."""
    try:
        from app.tasks.profit import recompute_profit

        recompute_profit.delay(org_id)
    except Exception as exc:
        logger.warning("Could not enqueue profit recompute: %s", exc)


def _to_campaign(a: AdSpend) -> AdCampaignOut:
    roas = (a.revenue / a.spend) if a.spend else 0.0
    cpa = (a.spend / a.conversions) if a.conversions else 0.0
    return AdCampaignOut(
        id=a.id,
        name=a.campaign,
        platform=a.platform,
        status=a.status,
        spend=a.spend,
        impressions=a.impressions,
        clicks=a.clicks,
        conversions=a.conversions,
        revenue=a.revenue,
        roas=round(roas, 2),
        cpa=round(cpa, 2),
    )


@router.get("", response_model=list[AdCampaignOut])
async def list_campaigns(
    org_id: str = Depends(require_org), db: AsyncSession = Depends(get_db)
) -> list[AdCampaignOut]:
    rows = (
        await db.scalars(
            select(AdSpend)
            .where(AdSpend.organization_id == org_id)
            .order_by(AdSpend.date.desc().nullslast())
        )
    ).all()
    return [_to_campaign(a) for a in rows]


@router.post("", response_model=AdCampaignOut, status_code=201)
async def create_ad_spend(
    payload: AdSpendCreate,
    _: AuthContext = Depends(require_editor),
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
) -> AdCampaignOut:
    data = payload.model_dump()
    data["campaign"] = data.pop("name")  # schema field → model column
    row = AdSpend(organization_id=org_id, **data)
    db.add(row)
    await db.flush()
    _enqueue_recompute(org_id)
    return _to_campaign(row)
