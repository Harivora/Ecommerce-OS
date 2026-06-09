"""Profit engine unit test against a sync SQLite session."""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from app.core.database import SyncSessionLocal
from app.models.enums import AdPlatform, OrderStatus, SettlementStatus
from app.models.finance import AdSpend, PaymentFee, ProfitMetric, ShippingCost
from app.models.order import Order, OrderItem, Refund
from app.models.organization import Organization
from app.services.profit_engine import recompute_profit_metrics


def test_recompute_profit_identity():
    org_id = uuid.uuid4().hex
    with SyncSessionLocal() as s:
        s.add(Organization(id=org_id, name="Test Brand"))
        s.flush()

        order = Order(
            organization_id=org_id,
            subtotal=1000.0,
            total=1100.0,
            status=OrderStatus.processing,
            ordered_at=datetime(2026, 1, 15, tzinfo=timezone.utc),
        )
        order.items.append(
            OrderItem(
                organization_id=org_id, quantity=2, unit_price=500.0, unit_cost=200.0
            )
        )  # COGS = 400
        order.refunds.append(
            Refund(
                organization_id=org_id,
                amount=100.0,
                refunded_at=datetime(2026, 1, 20, tzinfo=timezone.utc),
            )
        )
        s.add(order)
        s.add(ShippingCost(organization_id=org_id, cost=50.0, date=date(2026, 1, 10)))
        s.add(
            AdSpend(
                organization_id=org_id,
                platform=AdPlatform.meta,
                spend=200.0,
                date=date(2026, 1, 5),
            )
        )
        s.add(
            PaymentFee(
                organization_id=org_id,
                gateway="Razorpay",
                amount=1000.0,
                fees=20.0,
                net_amount=980.0,
                status=SettlementStatus.settled,
                date=date(2026, 1, 25),
            )
        )
        s.flush()

        written = recompute_profit_metrics(s, org_id)
        assert written == 1

        metric = s.query(ProfitMetric).filter_by(organization_id=org_id).one()
        assert metric.revenue == 1000.0
        assert metric.cogs == 400.0
        assert metric.ad_spend == 200.0
        assert metric.shipping == 50.0
        assert metric.gateway_fees == 20.0
        assert metric.refunds == 100.0
        # 1000 - 400 - 200 - 50 - 20 - 100 = 230
        assert metric.net_profit == 230.0
        assert metric.orders_count == 1
        assert round(metric.margin, 1) == 23.0


def test_cancelled_orders_excluded():
    org_id = uuid.uuid4().hex
    with SyncSessionLocal() as s:
        s.add(Organization(id=org_id, name="Cancel Co"))
        s.flush()
        order = Order(
            organization_id=org_id,
            subtotal=500.0,
            status=OrderStatus.cancelled,
            ordered_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
        )
        s.add(order)
        s.flush()
        recompute_profit_metrics(s, org_id)
        metrics = s.query(ProfitMetric).filter_by(organization_id=org_id).all()
        # Cancelled order contributes no revenue → no monthly bucket created.
        assert all(m.revenue == 0 for m in metrics) or metrics == []
