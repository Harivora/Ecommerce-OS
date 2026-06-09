"""Super-admin: CEO metrics, org provisioning, and impersonation scoping."""
from __future__ import annotations

import uuid

import pytest

from app.core.database import SyncSessionLocal
from app.core.security import hash_password
from app.models.enums import UserRole, UserStatus
from app.models.user import User


def _seed_super_admin() -> str:
    """Create a super-admin directly (lifespan seeding doesn't run under ASGITransport)."""
    email = f"admin_{uuid.uuid4().hex[:8]}@commerceos.ai"
    with SyncSessionLocal() as s:
        s.add(
            User(
                name="Platform Owner",
                email=email,
                password_hash=hash_password("adminpass123"),
                role=UserRole.super_admin,
                status=UserStatus.active,
                organization_id=None,
            )
        )
        s.commit()
    return email


@pytest.mark.asyncio
async def test_admin_metrics_provision_impersonate(client):
    email = _seed_super_admin()
    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "adminpass123"}
    )
    assert login.status_code == 200, login.text
    admin_token = login.json()["accessToken"]
    ah = {"Authorization": f"Bearer {admin_token}"}

    # CEO metrics are reachable by the super-admin.
    metrics = await client.get("/api/v1/admin/metrics", headers=ah)
    assert metrics.status_code == 200
    assert "mrr" in metrics.json()

    # A bare super-admin token has no org scope → tenant routes 400.
    no_scope = await client.get("/api/v1/dashboard/kpis", headers=ah)
    assert no_scope.status_code == 400

    # Provision a subscriber org + owner login.
    owner_email = f"owner_{uuid.uuid4().hex[:8]}@brand.com"
    prov = await client.post(
        "/api/v1/admin/organizations",
        headers=ah,
        json={
            "organizationName": "Acme D2C",
            "plan": "growth",
            "ownerName": "Acme Owner",
            "ownerEmail": owner_email,
            "ownerPassword": "ownerpass123",
        },
    )
    assert prov.status_code == 201, prov.text
    org_id = prov.json()["organization"]["id"]

    # The provisioned owner can log in with the given credentials.
    owner_login = await client.post(
        "/api/v1/auth/login", json={"email": owner_email, "password": "ownerpass123"}
    )
    assert owner_login.status_code == 200

    # Impersonation yields an org-scoped token usable on tenant routes.
    imp = await client.post(
        "/api/v1/admin/impersonate", headers=ah, json={"organizationId": org_id}
    )
    assert imp.status_code == 200
    imp_token = imp.json()["accessToken"]
    kpis = await client.get(
        "/api/v1/dashboard/kpis", headers={"Authorization": f"Bearer {imp_token}"}
    )
    assert kpis.status_code == 200
