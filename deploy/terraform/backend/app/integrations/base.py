"""Connector interface + shared metadata.

Connectors run **synchronously** (httpx.Client) so they can be called directly
from Celery workers. The API validates credentials at connect-time by running
``validate`` in a threadpool.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from app.models.enums import IntegrationCategory


class ConnectorError(Exception):
    """Raised when a connector fails to validate credentials or sync."""


@dataclass
class IntegrationMeta:
    provider: str
    name: str
    description: str
    icon: str
    category: IntegrationCategory
    phase: int
    features: list[str] = field(default_factory=list)
    has_connector: bool = False
    # Which credential fields the connect form should collect.
    credential_fields: list[str] = field(default_factory=list)


@dataclass
class SyncResult:
    counts: dict[str, int]
    account_info: dict[str, Any] = field(default_factory=dict)


class BaseConnector:
    meta: IntegrationMeta

    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        """Validate credentials against the live API.

        Returns normalized account info on success; raises ConnectorError
        otherwise. Must not persist anything.
        """
        raise NotImplementedError

    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: Any = None,
        since: Any = None,
    ) -> SyncResult:
        """Pull data from the provider and upsert it into the DB.

        ``on_page`` is an optional progress/commit callback; ``since`` an
        optional datetime enabling incremental sync. Connectors may ignore both.
        """
        raise NotImplementedError
