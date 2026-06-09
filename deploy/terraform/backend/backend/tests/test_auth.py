"""Auth + multi-tenant isolation tests against the running ASGI app."""
from __future__ import annotations

import uuid

import pytest


def _email() -> str:
    return f"user_{uuid.uuid4().hex[:8]}@example.com"


async def _signup(client, email: str):
    resp = await client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Owner",
            "email": email,
            "password": "supersecret123",
            "organizationName": "Brand",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest.mark.asyncio
async def test_signup_login_me(client):
    email = _email()
    data = await _signup(client, email)
    assert data["user"]["email"] == email
    assert data["organization"]["id"]
    token = data["accessToken"]  # camelCase serialization

    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == email

    login = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "supersecret123"}
    )
    assert login.status_code == 200
    assert login.json()["accessToken"]


@pytest.mark.asyncio
async def test_login_rejects_bad_password(client):
    email = _email()
    await _signup(client, email)
    resp = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": "wrongpassword"}
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_tenant_isolation(client):
    # Two separate orgs.
    a = await _signup(client, _email())
    b = await _signup(client, _email())
    token_a = a["accessToken"]
    token_b = b["accessToken"]

    # Org A records a manual ad spend.
    created = await client.post(
        "/api/v1/ads",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"platform": "meta", "name": "A-only", "spend": 1000, "revenue": 4000},
    )
    assert created.status_code == 201, created.text

    # Org A sees it; Org B must not.
    list_a = await client.get("/api/v1/ads", headers={"Authorization": f"Bearer {token_a}"})
    list_b = await client.get("/api/v1/ads", headers={"Authorization": f"Bearer {token_b}"})
    assert any(c["name"] == "A-only" for c in list_a.json())
    assert all(c["name"] != "A-only" for c in list_b.json())


@pytest.mark.asyncio
async def test_requires_auth(client):
    resp = await client.get("/api/v1/dashboard/kpis")
    assert resp.status_code == 401
