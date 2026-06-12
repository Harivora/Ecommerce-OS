"""AI CFO analyst backed by Claude.

Builds a structured, per-org data context (profit metrics, product margins,
recent orders, shipping/RTO) and asks Claude to answer the merchant's question
grounded in that data. The stable system + data block is marked for prompt
caching so repeated turns in a conversation reuse the prefix.
"""
from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.finance import ProfitMetric, ShippingCost
from app.models.order import Order, OrderItem
from app.models.product import Product

logger = logging.getLogger(__name__)

SYSTEM_PERSONA = (
    "You are the AI CFO for a direct-to-consumer e-commerce brand. You help the "
    "merchant understand their TRUE profit and make better decisions. Answer "
    "strictly from the DATA CONTEXT provided below — never invent numbers. Be "
    "concise and specific: cite figures, name products/SKUs, and give a clear "
    "recommendation. Use Markdown with **bold** for key numbers. If the data is "
    "insufficient to answer, say so and state what integration or input is missing."
)


async def build_org_context(db: AsyncSession, organization_id: str) -> str:
    """Assemble a compact textual snapshot of the org's finances."""
    lines: list[str] = ["# DATA CONTEXT", ""]

    # Profit metrics (most recent 6 months).
    metrics = (
        await db.scalars(
            select(ProfitMetric)
            .where(
                ProfitMetric.organization_id == organization_id,
                ProfitMetric.period_type == "month",
            )
            .order_by(ProfitMetric.period.desc())
            .limit(6)
        )
    ).all()
    if metrics:
        lines.append("## Monthly profit (most recent first)")
        for m in metrics:
            lines.append(
                f"- {m.period:%Y-%m}: revenue ₹{m.revenue:,.0f}, COGS ₹{m.cogs:,.0f}, "
                f"ad spend ₹{m.ad_spend:,.0f}, shipping ₹{m.shipping:,.0f}, "
                f"gateway fees ₹{m.gateway_fees:,.0f}, refunds ₹{m.refunds:,.0f}, "
                f"net profit ₹{m.net_profit:,.0f} ({m.margin:.1f}% margin), "
                f"{m.orders_count} orders"
            )
        lines.append("")
    else:
        lines.append("## Monthly profit\n- No profit metrics computed yet.\n")

    # Product margins (top + bottom by realized profit from order items).
    prod_rows = (
        await db.execute(
            select(
                Product.name,
                Product.sku,
                Product.price,
                Product.cost,
                func.coalesce(func.sum(OrderItem.quantity), 0).label("sold"),
                func.coalesce(
                    func.sum(OrderItem.quantity * (OrderItem.unit_price - OrderItem.unit_cost)),
                    0.0,
                ).label("profit"),
            )
            .where(Product.organization_id == organization_id)
            .outerjoin(OrderItem, OrderItem.product_id == Product.id)
            .group_by(Product.id)
        )
    ).all()
    if prod_rows:
        ranked = sorted(prod_rows, key=lambda r: r.profit, reverse=True)
        lines.append("## Top products by realized profit")
        for r in ranked[:5]:
            margin = ((r.price - r.cost) / r.price * 100) if r.price else 0
            lines.append(
                f"- {r.name} ({r.sku or 'no SKU'}): sold {int(r.sold)}, "
                f"profit ₹{r.profit:,.0f}, unit margin {margin:.0f}%"
            )
        losers = [r for r in ranked if r.profit < 0]
        if losers:
            lines.append("\n## Products losing money")
            for r in losers[:5]:
                lines.append(f"- {r.name} ({r.sku or 'no SKU'}): profit ₹{r.profit:,.0f}")
        lines.append("")

    # Shipping / RTO summary.
    ship = (
        await db.execute(
            select(
                func.count(ShippingCost.id),
                func.coalesce(func.sum(ShippingCost.cost), 0.0),
                func.coalesce(
                    func.sum(case((ShippingCost.is_rto.is_(True), 1), else_=0)), 0
                ),
            ).where(ShippingCost.organization_id == organization_id)
        )
    ).first()
    if ship and ship[0]:
        total, cost, rto = ship[0], ship[1], ship[2] or 0
        rto_rate = (rto / total * 100) if total else 0
        lines.append(
            f"## Shipping\n- {total} shipments, total cost ₹{cost:,.0f}, "
            f"RTO rate {rto_rate:.1f}%\n"
        )

    lines.append(f"\n(Context generated {date.today():%Y-%m-%d}.)")
    return "\n".join(lines)


async def generate_reply(
    context: str,
    history: list[dict[str, str]],
    user_message: str,
    api_key: str | None = None,
) -> tuple[str, int]:
    """Call Claude and return (reply_text, output_tokens).

    ``api_key`` is the resolved key for this org (per-org key preferred, else
    the global env key). Falls back to a clear message if none is configured.
    """
    key = api_key or settings.anthropic_api_key
    if not key:
        return (
            "AI analyst is not configured yet. Add an Anthropic API key in "
            "Settings → AI to enable grounded answers. Note: a Claude Pro "
            "subscription does not include API access — get a key at "
            "console.anthropic.com.",
            0,
        )

    # Imported lazily so the app boots without the dependency at hand.
    from anthropic import AsyncAnthropic

    # Bounded timeout so a slow/unreachable Anthropic call can't hang the request
    # (an unbounded hang means no response → no CORS header → browser "CORS error").
    client = AsyncAnthropic(api_key=key, timeout=30.0, max_retries=1)

    system = [
        {"type": "text", "text": SYSTEM_PERSONA},
        # Stable per-org data block — cache it so multi-turn chats reuse the prefix.
        {"type": "text", "text": context, "cache_control": {"type": "ephemeral"}},
    ]
    messages = [{"role": m["role"], "content": m["content"]} for m in history]
    messages.append({"role": "user", "content": user_message})

    try:
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=settings.ai_max_tokens,
            system=system,
            messages=messages,
        )
    except Exception as exc:  # timeout / network / model / key — fail gracefully
        logger.warning("AI reply generation failed: %s", exc)
        return (
            "I couldn't generate an answer just now — the AI service was slow or "
            "unreachable, or your Anthropic key/model was rejected. Please try again, "
            "and verify your API key in Settings → AI.",
            0,
        )
    text = next((b.text for b in response.content if b.type == "text"), "")
    return text, response.usage.output_tokens


async def generate_title(first_message: str, api_key: str | None = None) -> str | None:
    """Ask Claude for a short conversation title. Returns None on any failure."""
    key = api_key or settings.anthropic_api_key
    if not key:
        return None
    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic(api_key=key, timeout=15.0, max_retries=0)
        response = await client.messages.create(
            model=settings.anthropic_model,
            max_tokens=24,
            system=(
                "Generate a concise 3-6 word title for this e-commerce analytics "
                "question. Reply with ONLY the title — no quotes, no punctuation."
            ),
            messages=[{"role": "user", "content": first_message[:500]}],
        )
        title = next((b.text for b in response.content if b.type == "text"), "")
        title = title.strip().strip('"').strip()
        return title[:80] or None
    except Exception:
        return None
