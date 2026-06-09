"""Shopify webhook receiver (near-real-time refresh).

Verifies the Shopify HMAC signature, resolves the org by shop domain, then
triggers a cheap **incremental sync** (reusing the connector via ``kick_sync``)
so changed records land within seconds — without duplicating field-mapping.

Requirements for webhooks to work:
  * a publicly reachable URL (``PUBLIC_WEBHOOK_BASE_URL``) registered with Shopify
  * the app's API secret stored in the Shopify integration creds (``api_secret``)
    so the HMAC can be verified.
Locally (no public URL) the in-process scheduler handles refresh instead.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import logging

from fastapi import APIRouter, Header, HTTPException, Request, status
from sqlalchemy import select

from app.core.crypto import decrypt_credentials
from app.core.database import AsyncSessionLocal
from app.integrations.shopify import _normalize_shop
from app.models.integration import Integration

router = APIRouter()
logger = logging.getLogger(__name__)


def _verify_hmac(secret: str, body: bytes, header_hmac: str) -> bool:
    digest = hmac.new(secret.encode(), body, hashlib.sha256).digest()
    expected = base64.b64encode(digest).decode()
    return hmac.compare_digest(expected, header_hmac or "")


async def _resolve_shop(shop_domain: str) -> tuple[str | None, str]:
    """Return (integration_id, api_secret) for the connected shop, or (None, '')."""
    norm = _normalize_shop(shop_domain)
    async with AsyncSessionLocal() as db:
        rows = (
            await db.scalars(
                select(Integration).where(
                    Integration.provider == "shopify",
                    Integration.credentials_encrypted.isnot(None),
                )
            )
        ).all()
        for row in rows:
            try:
                creds = decrypt_credentials(row.credentials_encrypted)
            except Exception:
                continue
            if _normalize_shop(creds.get("shop_url", "")) == norm:
                secret = (
                    creds.get("api_secret")
                    or creds.get("api_secret_key")
                    or creds.get("webhook_secret")
                    or ""
                )
                return row.id, secret
    return None, ""


@router.post("/shopify")
async def shopify_webhook(
    request: Request,
    x_shopify_hmac_sha256: str = Header(default=""),
    x_shopify_shop_domain: str = Header(default=""),
    x_shopify_topic: str = Header(default=""),
):
    body = await request.body()
    if not x_shopify_shop_domain:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing shop domain")

    integration_id, secret = await _resolve_shop(x_shopify_shop_domain)
    if not integration_id:
        # Unknown shop: ack so Shopify doesn't retry-storm, but record it.
        logger.warning("Webhook for unknown shop %s", x_shopify_shop_domain)
        return {"status": "ignored"}
    if not secret:
        # No secret → cannot verify authenticity; refuse to trust the payload.
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Webhook secret not configured for this shop (add api_secret).",
        )
    if not _verify_hmac(secret, body, x_shopify_hmac_sha256):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid HMAC signature")

    # Valid signature → kick a deduped incremental sync (pulls only what changed).
    from app.tasks.dispatch import kick_sync

    kick_sync(integration_id)
    logger.info(
        "Shopify webhook '%s' for %s → incremental sync triggered",
        x_shopify_topic,
        x_shopify_shop_domain,
    )
    return {"status": "ok"}
