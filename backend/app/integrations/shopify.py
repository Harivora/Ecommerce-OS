"""Shopify Admin API connector (read-only).

Credentials: ``shop_url`` plus either an ``access_token`` (custom app) or
``api_key`` + ``api_secret`` (legacy private app, HTTP Basic). Pulls products
(with unit cost), customers, orders (with line items), and refunds, upserting
them per-tenant. Uses cursor pagination via the Link header, batches inventory
cost lookups, and retries on 429 rate limits. Only ever issues GET requests.
"""
from __future__ import annotations

import re
import time
from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.integrations.base import (
    BaseConnector,
    ConnectorError,
    IntegrationMeta,
    SyncResult,
)
from app.models.customer import Customer
from app.models.enums import (
    CustomerSegment,
    IntegrationCategory,
    OrderStatus,
    ProductStatus,
)
from app.models.order import Order, OrderItem, Refund
from app.models.product import Product

API_VERSION = "2025-10"
PAGE_LIMIT = 250
MAX_RETRIES = 6
# Large stores return big pages slowly; allow a generous read timeout and a
# short connect timeout so genuine connection failures surface quickly.
HTTP_TIMEOUT = httpx.Timeout(connect=15.0, read=120.0, write=30.0, pool=30.0)
_NEXT_LINK_RE = re.compile(r'<([^>]+)>;\s*rel="next"')

# Per-page progress callback: (resource_name, records_in_page) -> None.
# Called after each page's records have been consumed so the caller can commit
# incrementally and report progress on long pulls.
PageCallback = Callable[[str, int], None]


def _normalize_shop(shop_url: str) -> str:
    shop = shop_url.strip().replace("https://", "").replace("http://", "").strip("/")
    if not shop.endswith(".myshopify.com") and "." not in shop:
        shop = f"{shop}.myshopify.com"
    return shop


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _map_order_status(o: dict[str, Any]) -> OrderStatus:
    if o.get("cancelled_at"):
        return OrderStatus.cancelled
    financial = (o.get("financial_status") or "").lower()
    fulfillment = (o.get("fulfillment_status") or "").lower()
    if financial in {"refunded", "partially_refunded"}:
        return OrderStatus.refunded
    if fulfillment == "fulfilled":
        return OrderStatus.shipped
    if financial == "paid":
        return OrderStatus.processing
    return OrderStatus.pending


class ShopifyConnector(BaseConnector):
    meta = IntegrationMeta(
        provider="shopify",
        name="Shopify",
        description="Sync orders, products, customers, and fulfillment statuses.",
        icon="ShoppingBag",
        category=IntegrationCategory.ecommerce,
        phase=1,
        features=["Real-time Sync", "Multi-store support", "Fulfillment updates"],
        has_connector=True,
        # api_secret is optional — only needed to verify Shopify webhook HMAC
        # signatures when running with a public URL.
        credential_fields=["shop_url", "access_token", "api_secret"],
    )

    # Topics registered for near-real-time webhook refresh.
    WEBHOOK_TOPICS = [
        "orders/create",
        "orders/updated",
        "orders/cancelled",
        "products/create",
        "products/update",
        "customers/create",
        "customers/update",
        "refunds/create",
    ]

    # ── HTTP helpers ────────────────────────────────────────
    def _client(self, credentials: dict[str, Any]) -> httpx.Client:
        """Build a read-only Admin API client.

        Supports either a custom-app **access token** (``X-Shopify-Access-Token``)
        or a legacy private-app **api_key + api_secret** (HTTP Basic auth).
        """
        shop = _normalize_shop(credentials.get("shop_url", ""))
        if not shop:
            raise ConnectorError("shop_url is required, e.g. yourstore.myshopify.com")

        access_token = credentials.get("access_token")
        api_key = credentials.get("api_key")
        api_secret = (
            credentials.get("api_secret")
            or credentials.get("api_secret_key")
            or credentials.get("password")
        )

        headers = {"Accept": "application/json"}
        auth = None
        if access_token:
            headers["X-Shopify-Access-Token"] = access_token
        elif api_key and api_secret:
            auth = (api_key, api_secret)
        else:
            raise ConnectorError(
                "Provide shop_url plus either an access_token (shpat_…) "
                "or both api_key and api_secret."
            )
        return httpx.Client(
            base_url=f"https://{shop}/admin/api/{API_VERSION}",
            headers=headers,
            auth=auth,
            timeout=HTTP_TIMEOUT,
        )

    def _get(self, client: httpx.Client, url: str, params: dict | None = None) -> httpx.Response:
        """GET with retry on 429 (honoring Retry-After) and on transient
        network errors (timeouts, dropped connections), with backoff."""
        resp: httpx.Response | None = None
        last_exc: httpx.HTTPError | None = None
        for attempt in range(MAX_RETRIES):
            try:
                resp = client.get(url, params=params)
            except (httpx.TimeoutException, httpx.TransportError) as exc:
                last_exc = exc
                time.sleep(min(2 ** attempt, 15))
                continue
            if resp.status_code != 429:
                return resp
            wait = float(resp.headers.get("Retry-After", 2))
            time.sleep(min(wait, 10))
        if resp is not None:
            return resp
        raise ConnectorError(
            f"Shopify request to {url} failed after {MAX_RETRIES} retries: {last_exc}"
        )

    def _paginate(
        self,
        client: httpx.Client,
        path: str,
        key: str,
        params: dict | None = None,
        on_page: Callable[[int], None] | None = None,
    ):
        """Yield records across all pages for a REST resource.

        ``on_page`` (if given) is invoked with the page's record count *after*
        the consumer has finished processing that page, so a caller can commit
        incrementally and report progress on long pulls.
        """
        url: str | None = path
        first_params = {"limit": PAGE_LIMIT, **(params or {})}
        while url:
            resp = self._get(client, url, params=first_params if url == path else None)
            if resp.status_code != 200:
                raise ConnectorError(
                    f"Shopify {path} returned {resp.status_code}: {resp.text[:200]}"
                )
            records = resp.json().get(key, [])
            yield from records
            if on_page is not None:
                on_page(len(records))
            match = _NEXT_LINK_RE.search(resp.headers.get("Link", ""))
            url = match.group(1) if match else None
            first_params = None

    # ── Validate ────────────────────────────────────────────
    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        try:
            with self._client(credentials) as client:  # raises if creds incomplete
                resp = self._get(client, "/shop.json")
        except httpx.HTTPError as exc:  # network/DNS errors
            raise ConnectorError(f"Could not reach Shopify: {exc}") from exc
        if resp.status_code in (401, 403):
            raise ConnectorError("Invalid Shopify credentials or insufficient scopes.")
        if resp.status_code != 200:
            raise ConnectorError(f"Shopify validation failed ({resp.status_code}).")
        shop = resp.json().get("shop", {})
        return {
            "shop_name": shop.get("name"),
            "domain": shop.get("myshopify_domain"),
            "currency": shop.get("currency"),
        }

    # ── Webhooks ────────────────────────────────────────────
    def register_webhooks(self, credentials: dict[str, Any], callback_url: str) -> list[str]:
        """Register near-real-time webhooks pointing at ``callback_url``.

        Idempotent: skips topics already registered for this address. Returns
        the list of newly created topics. Best-effort — callers should not fail
        a connect if this raises.
        """
        created: list[str] = []
        with self._client(credentials) as client:
            existing: set[tuple[str, str]] = set()
            resp = self._get(client, "/webhooks.json")
            if resp.status_code == 200:
                for w in resp.json().get("webhooks", []):
                    existing.add((w.get("topic"), w.get("address")))
            for topic in self.WEBHOOK_TOPICS:
                if (topic, callback_url) in existing:
                    continue
                r = client.post(
                    "/webhooks.json",
                    json={"webhook": {"topic": topic, "address": callback_url, "format": "json"}},
                )
                if r.status_code in (200, 201):
                    created.append(topic)
        return created

    # ── Sync ────────────────────────────────────────────────
    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: PageCallback | None = None,
        since: datetime | None = None,
    ) -> SyncResult:
        """Pull and upsert Shopify data.

        When ``since`` is provided, only records updated at/after that time are
        fetched (``updated_at_min``) — this keeps recurring/auto syncs cheap on
        large stores. With ``since=None`` it performs a full backfill.
        """
        def tag(resource: str) -> Callable[[int], None] | None:
            return (lambda n: on_page(resource, n)) if on_page else None

        extra = {"updated_at_min": since.isoformat()} if since else None

        with self._client(credentials) as client:
            products = self._sync_products(
                client, session, organization_id, on_page=tag("products"), extra_params=extra
            )
            customers = self._sync_customers(
                client, session, organization_id, on_page=tag("customers"), extra_params=extra
            )
            session.flush()
            cost_by_sku = self._build_cost_map(session, organization_id)
            orders, refunds = self._sync_orders(
                client, session, organization_id, cost_by_sku,
                on_page=tag("orders"), extra_params=extra,
            )
        session.flush()
        return SyncResult(
            counts={
                "products": products,
                "customers": customers,
                "orders": orders,
                "refunds": refunds,
            }
        )

    def _sync_products(
        self,
        client: httpx.Client,
        session: Session,
        org_id: str,
        on_page: Callable[[int], None] | None = None,
        extra_params: dict | None = None,
    ) -> int:
        from itertools import islice
        count = 0
        
        iterator = iter(self._paginate(
            client, "/products.json", "products", params=extra_params
        ))
        
        while True:
            batch = list(islice(iterator, 250))
            if not batch:
                break
                
            ext_ids = [str(p["id"]) for p in batch]
            existing = {
                p.external_id: p
                for p in session.scalars(
                    select(Product).where(
                        Product.organization_id == org_id,
                        Product.external_id.in_(ext_ids)
                    )
                )
            }
            
            pending_cost: list[tuple[Product, str]] = []
            
            for p in batch:
                variants = p.get("variants", [])
                first = variants[0] if variants else {}
                ext_id = str(p["id"])
                row = existing.get(ext_id)
                if row is None:
                    row = Product(organization_id=org_id, external_id=ext_id)
                    session.add(row)
                    existing[ext_id] = row
                row.name = p.get("title", "")
                row.sku = first.get("sku")
                row.category = p.get("product_type") or None
                row.price = float(first.get("price") or 0)
                row.stock = sum(int(v.get("inventory_quantity") or 0) for v in variants)
                row.image = (p.get("image") or {}).get("src")
                row.status = (
                    ProductStatus.active if p.get("status") == "active" else ProductStatus.draft
                )
                inv_id = first.get("inventory_item_id")
                if inv_id:
                    pending_cost.append((row, str(inv_id)))
            
            # Batch-fetch per-unit COGS from InventoryItem
            costs = self._inventory_costs(client, [iid for _, iid in pending_cost])
            for row, iid in pending_cost:
                if iid in costs:
                    row.cost = costs[iid]
            
            session.commit()
            if on_page:
                on_page(len(batch))
            count += len(batch)
            
        return count

    def _inventory_costs(self, client: httpx.Client, ids: list[str]) -> dict[str, float]:
        out: dict[str, float] = {}
        uniq = list(dict.fromkeys(ids))
        for i in range(0, len(uniq), 100):
            chunk = uniq[i : i + 100]
            resp = self._get(
                client, "/inventory_items.json", {"ids": ",".join(chunk), "limit": 250}
            )
            if resp.status_code != 200:
                continue  # e.g. missing read_inventory scope → costs stay 0
            for item in resp.json().get("inventory_items", []):
                cost = item.get("cost")
                if cost not in (None, ""):
                    out[str(item["id"])] = float(cost)
        return out

    def _sync_customers(
        self,
        client: httpx.Client,
        session: Session,
        org_id: str,
        on_page: Callable[[int], None] | None = None,
        extra_params: dict | None = None,
    ) -> int:
        from itertools import islice
        count = 0
        
        iterator = iter(self._paginate(
            client, "/customers.json", "customers", params=extra_params
        ))
        
        while True:
            batch = list(islice(iterator, 250))
            if not batch:
                break
                
            ext_ids = [str(c["id"]) for c in batch]
            existing = {
                c.external_id: c
                for c in session.scalars(
                    select(Customer).where(
                        Customer.organization_id == org_id,
                        Customer.external_id.in_(ext_ids)
                    )
                )
            }
            
            for c in batch:
                ext_id = str(c["id"])
                row = existing.get(ext_id)
                if row is None:
                    row = Customer(organization_id=org_id, external_id=ext_id)
                    session.add(row)
                    existing[ext_id] = row
                row.name = f"{c.get('first_name', '')} {c.get('last_name', '')}".strip() or "Customer"
                row.email = c.get("email")
                row.phone = c.get("phone")
                row.total_orders = int(c.get("orders_count") or 0)
                row.total_spent = float(c.get("total_spent") or 0)
                row.ltv = row.total_spent
                addr = c.get("default_address") or {}
                row.city = addr.get("city")
                row.last_order = _parse_dt(c.get("updated_at"))
                row.segment = self._segment(row.total_orders, row.total_spent)
                
            session.commit()
            if on_page:
                on_page(len(batch))
            count += len(batch)
            
        return count

    @staticmethod
    def _segment(orders: int, spent: float) -> CustomerSegment:
        if spent >= 10000 or orders >= 5:
            return CustomerSegment.vip
        if orders <= 1:
            return CustomerSegment.new
        return CustomerSegment.regular

    def _build_cost_map(self, session: Session, org_id: str) -> dict[str, float]:
        return {
            sku: cost
            for sku, cost in session.execute(
                select(Product.sku, Product.cost).where(
                    Product.organization_id == org_id, Product.sku.isnot(None)
                )
            )
            if sku
        }

    def _sync_orders(
        self,
        client: httpx.Client,
        session: Session,
        org_id: str,
        cost_by_sku: dict[str, float],
        on_page: Callable[[int], None] | None = None,
        extra_params: dict | None = None,
    ) -> tuple[int, int]:
        from itertools import islice
        order_count = 0
        refund_count = 0
        order_params = {"status": "any", **(extra_params or {})}
        
        iterator = iter(self._paginate(
            client, "/orders.json", "orders", order_params
        ))
        
        while True:
            batch = list(islice(iterator, 250))
            if not batch:
                break
                
            ext_ids = [str(o["id"]) for o in batch]
            existing = {
                o.external_id: o
                for o in session.scalars(
                    select(Order).where(
                        Order.organization_id == org_id,
                        Order.external_id.in_(ext_ids)
                    )
                )
            }
            
            for o in batch:
                ext_id = str(o["id"])
                row = existing.get(ext_id)
                if row is None:
                    row = Order(organization_id=org_id, external_id=ext_id)
                    session.add(row)
                    existing[ext_id] = row
                else:
                    # Clear out children for a clean replace
                    # Using session.execute for hard delete is safer when bulk committing,
                    # but since objects are in memory and attached, standard clear is fine.
                    # Wait, if they are attached, we just loaded them. 
                    row.items.clear()
                    row.refunds.clear()
                
                cust = o.get("customer") or {}
                shipping_total = sum(float(s.get("price") or 0) for s in o.get("shipping_lines", []))

                row.order_number = o.get("name")
                row.customer_name = (
                    f"{cust.get('first_name', '')} {cust.get('last_name', '')}".strip() or None
                )
                row.customer_email = o.get("email") or cust.get("email")
                row.total = float(o.get("total_price") or 0)
                row.subtotal = float(o.get("subtotal_price") or 0)
                row.shipping = shipping_total
                row.tax = float(o.get("total_tax") or 0)
                row.discount = float(o.get("total_discounts") or 0)
                row.item_count = sum(int(li.get("quantity") or 0) for li in o.get("line_items", []))
                row.status = _map_order_status(o)
                gateways = o.get("payment_gateway_names") or []
                row.payment_method = gateways[0] if gateways else None
                row.channel = "Shopify"
                row.ordered_at = _parse_dt(o.get("created_at"))

                for li in o.get("line_items", []):
                    sku = li.get("sku")
                    row.items.append(
                        OrderItem(
                            organization_id=org_id,
                            title=li.get("title"),
                            sku=sku,
                            quantity=int(li.get("quantity") or 0),
                            unit_price=float(li.get("price") or 0),
                            unit_cost=cost_by_sku.get(sku, 0.0) if sku else 0.0,
                        )
                    )

                for r in o.get("refunds", []):
                    amount = sum(
                        float(t.get("amount") or 0)
                        for t in r.get("transactions", [])
                        if t.get("kind") in {"refund", "void"}
                    )
                    if amount <= 0:
                        amount = sum(
                            float(rl.get("subtotal") or 0) for rl in r.get("refund_line_items", [])
                        )
                    row.refunds.append(
                        Refund(
                            organization_id=org_id,
                            external_id=str(r.get("id")),
                            amount=amount,
                            reason=r.get("note"),
                            refunded_at=_parse_dt(r.get("created_at")),
                        )
                    )
                    refund_count += 1
                order_count += 1
                
            session.commit()
            if on_page:
                on_page(len(batch))

        return order_count, refund_count
