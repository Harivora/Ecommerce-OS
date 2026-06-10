"""Revenue forecasting (MVP linear projection over monthly metrics)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_feature, require_org
from app.models.finance import ProfitMetric
from app.schemas.finance import ForecastDataPoint
from app.services.forecasting import generate_forecast

router = APIRouter()


@router.get("", response_model=list[ForecastDataPoint])
async def revenue_forecast(
    org_id: str = Depends(require_org),
    db: AsyncSession = Depends(get_db),
    periods: int = Query(3, ge=1, le=12),
    _: object = Depends(require_feature("forecasting")),
) -> list[ForecastDataPoint]:
    metrics = (
        await db.scalars(
            select(ProfitMetric)
            .where(
                ProfitMetric.organization_id == org_id,
                ProfitMetric.period_type == "month",
            )
            .order_by(ProfitMetric.period.asc())
        )
    ).all()
    history = [(m.period.strftime("%b"), m.revenue) for m in metrics]
    points = generate_forecast(history, periods=periods)
    return [
        ForecastDataPoint(
            month=p.month, actual=p.actual, predicted=p.predicted,
            lower=p.lower, upper=p.upper,
        )
        for p in points
    ]
