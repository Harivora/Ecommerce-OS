"""Celery task: recompute profit metrics for an organization."""
from __future__ import annotations

from app.core.database import SyncSessionLocal
from app.services.profit_engine import recompute_profit_metrics
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.profit.recompute_profit")
def recompute_profit(organization_id: str) -> int:
    with SyncSessionLocal() as session:
        written = recompute_profit_metrics(session, organization_id)
        session.commit()
    return written


@celery_app.task(name="app.tasks.profit.recompute_all_profit")
def recompute_all_profit() -> dict:
    """Beat task: recompute profit for every active org. Cheap (SQL aggregation),
    so the dashboard fills within the interval even mid-backfill."""
    from sqlalchemy import select

    from app.models.enums import OrgStatus
    from app.models.organization import Organization

    count = 0
    with SyncSessionLocal() as session:
        org_ids = [
            row[0]
            for row in session.execute(
                select(Organization.id).where(Organization.status == OrgStatus.active)
            )
        ]
        for org_id in org_ids:
            recompute_profit_metrics(session, org_id)
            session.commit()
            count += 1
    return {"recomputed": count}
