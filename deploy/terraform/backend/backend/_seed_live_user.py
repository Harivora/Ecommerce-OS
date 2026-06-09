"""Seed a login + connected Shopify integration for the already-backfilled
``live-21gadget`` org, so you can log into the platform and immediately see the
real data the backfill pulled.

Run (after the backfill completes):
  SHOP_URL=... SHOP_TOKEN=... LOGIN_EMAIL=you@brand.com LOGIN_PASSWORD=Secret123 \
      python _seed_live_user.py

Idempotent: re-running updates the existing user/integration in place.
"""
from __future__ import annotations

import os
from datetime import datetime, timezone

from app.core.crypto import encrypt_credentials
from app.core.database import Base, SyncSessionLocal, sync_engine
from app.core.security import hash_password
from app.models.enums import (
    ConnectionStatus,
    IntegrationCategory,
    StorePlatform,
    UserRole,
    UserStatus,
)
from app.models.integration import Integration
from app.models.organization import Organization
from app.models.store import Store
from app.models.user import User

ORG_ID = "live-21gadget"
SHOP_URL = os.environ.get("SHOP_URL", "https://21gadget-in.myshopify.com")
SHOP_TOKEN = os.environ["SHOP_TOKEN"]
SHOP_SECRET = os.environ.get("SHOP_API_SECRET")  # optional, only for webhooks
EMAIL = os.environ.get("LOGIN_EMAIL", "owner@21gadget.in").lower()
PASSWORD = os.environ.get("LOGIN_PASSWORD", "Gadget12345")
NAME = os.environ.get("LOGIN_NAME", "21Gadget Owner")

Base.metadata.create_all(bind=sync_engine)

with SyncSessionLocal() as s:
    org = s.get(Organization, ORG_ID)
    if org is None:
        org = Organization(id=ORG_ID, name="21Gadget.in", currency="INR")
        s.add(org)
        s.flush()

    # Owner user bound to the populated org.
    user = s.query(User).filter(User.email == EMAIL).one_or_none()
    if user is None:
        user = User(name=NAME, email=EMAIL, organization_id=ORG_ID)
        s.add(user)
    user.password_hash = hash_password(PASSWORD)
    user.role = UserRole.owner
    user.status = UserStatus.active
    user.organization_id = ORG_ID

    # Shopify integration marked connected; last_sync=now so the scheduler does
    # cheap incremental syncs instead of re-pulling the whole store.
    creds = {"shop_url": SHOP_URL, "access_token": SHOP_TOKEN}
    if SHOP_SECRET:
        creds["api_secret"] = SHOP_SECRET
    integ = (
        s.query(Integration)
        .filter(Integration.organization_id == ORG_ID, Integration.provider == "shopify")
        .one_or_none()
    )
    if integ is None:
        integ = Integration(
            organization_id=ORG_ID,
            provider="shopify",
            name="Shopify",
            category=IntegrationCategory.ecommerce,
        )
        s.add(integ)
    integ.credentials_encrypted = encrypt_credentials(creds)
    integ.status = ConnectionStatus.connected
    integ.last_sync = datetime.now(timezone.utc)
    integ.sync_error = None

    # Store row (used by the stores listing).
    store = (
        s.query(Store)
        .filter(Store.organization_id == ORG_ID, Store.url == SHOP_URL)
        .one_or_none()
    )
    if store is None:
        s.add(
            Store(
                organization_id=ORG_ID,
                name="21Gadget.in",
                platform=StorePlatform.shopify,
                url=SHOP_URL,
                status=ConnectionStatus.connected,
            )
        )

    s.commit()
    print(f"Seeded login {EMAIL} (org={ORG_ID}) + connected Shopify integration.")
    print(f"  Log in at the frontend with: {EMAIL} / {PASSWORD}")
