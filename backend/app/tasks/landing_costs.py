"""Celery task: apply a landing-cost change (re-stamp orders + recompute profit).

The API applies cost edits inline (threadpool) so they take effect immediately
without a broker; this task exposes the same work to the worker/beat for large
re-stamps in production. Both call ``apply_landing_costs_sync``.
"""
from __future__ import annotations

from app.services.landing_costs import apply_landing_costs_sync
from app.tasks.celery_app import celery_app


@celery_app.task(name="app.tasks.landing_costs.apply_landing_costs")
def apply_landing_costs(organization_id: str, skus: list[str] | None = None) -> dict:
    return apply_landing_costs_sync(organization_id, skus)
