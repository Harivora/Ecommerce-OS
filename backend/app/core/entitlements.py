"""Plan-based feature entitlements + usage limits.

Single source of truth for what each subscription plan unlocks. The frontend
mirrors this in ``lib/entitlements.ts`` for UI gating; the backend enforces it
(403) so it can't be bypassed.
"""
from __future__ import annotations

from app.models.enums import PlanTier

PLAN_RANK: dict[PlanTier, int] = {
    PlanTier.starter: 1,
    PlanTier.growth: 2,
    PlanTier.scale: 3,
}

# Feature key -> the minimum plan that unlocks it. Unlisted features are open
# to every plan.
FEATURE_MIN_PLAN: dict[str, PlanTier] = {
    "forecasting": PlanTier.growth,
    "shipping": PlanTier.growth,
    "payments": PlanTier.growth,
    "realtime": PlanTier.scale,
    "integration:google_ads": PlanTier.growth,
    "integration:razorpay": PlanTier.growth,
    "integration:cashfree": PlanTier.growth,
    "integration:shiprocket": PlanTier.growth,
}

STORE_LIMIT: dict[PlanTier, int] = {
    PlanTier.starter: 1,
    PlanTier.growth: 3,
    PlanTier.scale: 9999,
}

TEAM_LIMIT: dict[PlanTier, int] = {
    PlanTier.starter: 2,
    PlanTier.growth: 5,
    PlanTier.scale: 9999,
}


def plan_allows(plan: PlanTier, feature: str) -> bool:
    minimum = FEATURE_MIN_PLAN.get(feature)
    if minimum is None:
        return True
    return PLAN_RANK.get(plan, 0) >= PLAN_RANK[minimum]


def team_limit(plan: PlanTier) -> int:
    return TEAM_LIMIT.get(plan, 2)