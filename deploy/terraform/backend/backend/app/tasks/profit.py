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
