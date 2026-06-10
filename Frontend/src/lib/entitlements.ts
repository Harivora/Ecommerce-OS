// ============================================================
// Plan entitlements (mirror of backend app/core/entitlements.py).
// UI gating only — the backend enforces the same rules with 403.
// ============================================================

export type Plan = "starter" | "growth" | "scale";

const RANK: Record<Plan, number> = { starter: 1, growth: 2, scale: 3 };

// Feature key -> minimum plan. Unlisted features are open to all plans.
const FEATURE_MIN: Record<string, Plan> = {
  forecasting: "growth",
  shipping: "growth",
  payments: "growth",
  realtime: "scale",
  "integration:google_ads": "growth",
  "integration:razorpay": "growth",
  "integration:cashfree": "growth",
  "integration:shiprocket": "growth",
};

export function planAllows(plan: string | undefined | null, feature: string): boolean {
  const min = FEATURE_MIN[feature];
  if (!min) return true;
  const p = (plan as Plan) || "starter";
  return (RANK[p] ?? 0) >= RANK[min];
}

export function requiredPlan(feature: string): Plan {
  return FEATURE_MIN[feature] ?? "starter";
}

// Sidebar href -> feature key (for nav lock indicators).
export const NAV_FEATURE: Record<string, string> = {
  "/dashboard/forecasting": "forecasting",
  "/dashboard/shipping": "shipping",
  "/dashboard/payments": "payments",
};