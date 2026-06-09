"""Integration connect/disconnect (encrypted creds) and AI chat fallback."""
from __future__ import annotations

import uuid

import pytest


async def _signup_token(client) -> str:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={
            "name": "Owner",
            "email": f"u_{uuid.uuid4().hex[:8]}@ex.com",
            "password": "supersecret123",
        },
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["accessToken"]


@pytest.mark.asyncio
async def test_integration_catalog_and_connect(client):
    token = await _signup_token(client)
    h = {"Authorization": f"Bearer {token}"}

    catalog = await client.get("/api/v1/integrations", headers=h)
    providers = {i["provider"] for i in catalog.json()}
    assert {"shopify", "shiprocket", "meta", "razorpay"} <= providers

    # Connect a manual (no-connector) integration → no live validation needed.
    connect = await client.post(
        "/api/v1/integrations/razorpay/connect",
        headers=h,
        json={"credentials": {"key_id": "rzp_test", "key_secret": "secret123"}},
    )
    assert connect.status_code == 200, connect.text
    assert connect.json()["integration"]["status"] == "connected"

    after = await client.get("/api/v1/integrations", headers=h)
    rzp = next(i for i in after.json() if i["provider"] == "razorpay")
    assert rzp["status"] == "connected"

    disc = await client.post("/api/v1/integrations/razorpay/disconnect", headers=h)
    assert disc.status_code == 200
    assert disc.json()["integration"]["status"] == "available"


@pytest.mark.asyncio
async def test_ai_chat_fallback_persists(client):
    token = await _signup_token(client)
    h = {"Authorization": f"Bearer {token}"}

    chat = await client.post(
        "/api/v1/ai/chat", headers=h, json={"message": "Why did profit drop?"}
    )
    assert chat.status_code == 200, chat.text
    conv_id = chat.json()["conversationId"]
    assert chat.json()["reply"]["role"] == "assistant"

    convs = await client.get("/api/v1/ai/conversations", headers=h)
    assert any(c["id"] == conv_id for c in convs.json())

    full = await client.get(f"/api/v1/ai/conversations/{conv_id}", headers=h)
    roles = [m["role"] for m in full.json()["messages"]]
    assert roles == ["user", "assistant"]
