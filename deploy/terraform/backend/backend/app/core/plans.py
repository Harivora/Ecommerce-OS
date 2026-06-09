"""Subscription plan pricing (INR per month) — single source of truth for MRR.

Update these numbers to change billing across the platform (admin metrics, the
client console, and the client-facing billing screen all read from here).
"""
from __future__ import annotations

from app.models.enums import PlanTier

PLAN_PRICE_INR: dict[PlanTier, int] = {
    PlanTier.starter: 4599,
    PlanTier.growth: 8599,
    PlanTier.scale: 21599,
}


def monthly_price(plan: PlanTier) -> int:
    return PLAN_PRICE_INR.get(plan, 0)