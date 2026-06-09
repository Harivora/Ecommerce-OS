"""One-off live Shopify pull for manual verification. Credentials come from env.

Hardened for large stores (10k+ orders): the connector retries on timeouts and
this runner commits after every page, so progress is durable even if the network
hiccups partway through. Re-running is safe — rows upsert by external_id, so an
interrupted pull simply resumes/refreshes on the next run.

Run:  SHOP_URL=... SHOP_TOKEN=... python _live_shopify.py
"""
from __future__ import annotations

import os
import time

from sqlalchemy import func, select

from app.core.database import Base, SyncSessionLocal, sync_engine
from app.integrations.shopify import ShopifyConnector
from app.models.customer import Customer
from app.models.finance import ProfitMetric
from app.models.order import Order
from app.models.product import Product
from app.models.organization import Organization
from app.services.profit_engine import recompute_profit_metrics

ORG_ID = "live-21gadget"
creds = {"shop_url": os.environ["SHOP_URL"], "access_token": os.environ["SHOP_TOKEN"]}

Base.metadata.create_all(bind=sync_engine)
conn = ShopifyConnector()

print(">> validating credentials …", flush=True)
info = conn.validate(creds)
print("   shop:", info, flush=True)

with SyncSessionLocal() as s:
    org = s.get(Organization, ORG_ID)
    if org is None:
        org = Organization(id=ORG_ID, name=info.get("shop_name") or "21Gadget",
                           currency=info.get("currency") or "INR")
        s.add(org)
        s.commit()

    print(">> syncing (products, customers, orders, refunds) …", flush=True)
    start = time.monotonic()
    running: dict[str, int] = {}

    def on_page(resource: str, n: int) -> None:
        """Commit each page as it lands and report cumulative progress."""
        s.commit()
        running[resource] = running.get(resource, 0) + n
        elapsed = time.monotonic() - start
        print(
            f"   [{elapsed:6.1f}s] {resource:<9} +{n:<3} -> {running[resource]:>6} total",
            flush=True,
        )

    result = conn.sync(s, ORG_ID, creds, on_page=on_page)
    s.commit()
    print("   sync counts:", result.counts, flush=True)

    written = recompute_profit_metrics(s, ORG_ID)
    s.commit()
    print("   profit-metric rows written:", written, flush=True)

    np_ = s.scalar(select(func.count(Product.id)).where(Product.organization_id == ORG_ID))
    no_ = s.scalar(select(func.count(Order.id)).where(Order.organization_id == ORG_ID))
    nc_ = s.scalar(select(func.count(Customer.id)).where(Customer.organization_id == ORG_ID))
    print(f"\n   DB totals → products={np_}  orders={no_}  customers={nc_}", flush=True)

    print("\n   Sample products:", flush=True)
    for p in s.scalars(
        select(Product).where(Product.organization_id == ORG_ID).limit(8)
    ):
        print(f"     - {(p.sku or '—'):14} {(p.name or '')[:42]:42} price={p.price} cost={p.cost} stock={p.stock}", flush=True)

    print("\n   Recent orders:", flush=True)
    for o in s.scalars(
        select(Order).where(Order.organization_id == ORG_ID)
        .order_by(Order.ordered_at.desc().nullslast()).limit(8)
    ):
        print(f"     - {o.order_number or o.external_id:12} {str(o.status.value):11} total={o.total} items={o.item_count} {o.ordered_at}", flush=True)

    print("\n   Monthly profit metrics:", flush=True)
    for m in s.scalars(
        select(ProfitMetric).where(ProfitMetric.organization_id == ORG_ID)
        .order_by(ProfitMetric.period)
    ):
        print(f"     - {m.period}  rev={m.revenue}  cogs={m.cogs}  net_profit={m.net_profit}  margin={m.margin}%  orders={m.orders_count}", flush=True)
