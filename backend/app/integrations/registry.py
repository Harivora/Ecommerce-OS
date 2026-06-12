"""Registry of all integrations + their connectors.

Providers with ``has_connector=True`` (Shopify, Shiprocket) sync real data.
The others are listed in the UI and accept **manual data entry** until their
connectors are built (Phase 2+).
"""
from __future__ import annotations

from app.integrations.base import BaseConnector, IntegrationMeta
from app.integrations.google_ads import GoogleAdsConnector
from app.integrations.meta_ads import MetaAdsConnector
from app.integrations.nas_backup import NasBackupConnector
from app.integrations.shiprocket import ShiprocketConnector
from app.integrations.shopify import ShopifyConnector
from app.models.enums import IntegrationCategory

# Live connectors keyed by provider.
CONNECTORS: dict[str, BaseConnector] = {
    ShopifyConnector.meta.provider: ShopifyConnector(),
    ShiprocketConnector.meta.provider: ShiprocketConnector(),
    MetaAdsConnector.meta.provider: MetaAdsConnector(),
    GoogleAdsConnector.meta.provider: GoogleAdsConnector(),
    NasBackupConnector.meta.provider: NasBackupConnector(),
}

# Manual-entry integrations (no connector yet) shown in the catalog.
_MANUAL_META: list[IntegrationMeta] = [
    IntegrationMeta(
        provider="razorpay",
        name="Razorpay",
        description="Sync payment settlements, fee distributions, and UPI rates.",
        icon="CreditCard",
        category=IntegrationCategory.payments,
        phase=3,
        features=["Gateway fees tracking", "UPI vs Card breakdown", "Settlement timing alerts"],
        has_connector=False,
        credential_fields=["key_id", "key_secret"],
    ),
    IntegrationMeta(
        provider="cashfree",
        name="Cashfree",
        description="Sync settlements and gateway charges.",
        icon="CreditCard",
        category=IntegrationCategory.payments,
        phase=3,
        features=["Settlement sync", "Fee breakdown"],
        has_connector=False,
        credential_fields=["app_id", "secret_key"],
    ),
]

# provider -> IntegrationMeta for the entire catalog.
ALL_META: dict[str, IntegrationMeta] = {c.meta.provider: c.meta for c in CONNECTORS.values()}
for _m in _MANUAL_META:
    ALL_META[_m.provider] = _m


def get_connector(provider: str) -> BaseConnector | None:
    return CONNECTORS.get(provider)


def get_meta(provider: str) -> IntegrationMeta | None:
    return ALL_META.get(provider)


def list_meta() -> list[IntegrationMeta]:
    return list(ALL_META.values())
