from __future__ import annotations

from typing import Any

from pydantic import Field

from app.models.enums import ConnectionStatus, IntegrationCategory
from app.schemas.common import CamelModel


class IntegrationOut(CamelModel):
    id: str
    provider: str
    name: str
    description: str = ""
    icon: str = "Plug"
    status: ConnectionStatus
    phase: int = 1
    last_sync: str | None = None
    category: IntegrationCategory
    features: list[str] = Field(default_factory=list)
    # True when a live API connector exists (Shopify/Shiprocket). Others are
    # manual-entry: their credentials are stored but no automatic sync runs yet.
    has_connector: bool = False
    # Which credential inputs the connect form should collect for this provider.
    credential_fields: list[str] = Field(default_factory=list)
    sync_error: str | None = None


class ConnectRequest(CamelModel):
    """Credentials submitted by the subscriber.

    The accepted keys depend on the provider, e.g.
      - shopify:    {shop_url, access_token}
      - shiprocket: {email, password}
    """

    credentials: dict[str, Any]


class IntegrationActionResult(CamelModel):
    integration: IntegrationOut
    detail: str
    sync_enqueued: bool = False
