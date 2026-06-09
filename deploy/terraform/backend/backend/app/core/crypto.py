"""Symmetric encryption for integration credentials at rest (Fernet).

Credentials (Shopify tokens, Shiprocket passwords, etc.) are stored as an
encrypted JSON blob. The plaintext is only ever decrypted inside the API
process / Celery worker at sync time and is never serialized to clients.
"""
from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

from cryptography.fernet import Fernet

from app.core.config import settings


@lru_cache
def _fernet() -> Fernet:
    key = settings.encryption_key
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY is not set. Generate one with: "
            'python -c "from cryptography.fernet import Fernet; '
            'print(Fernet.generate_key().decode())"'
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_credentials(data: dict[str, Any]) -> str:
    """Encrypt a credentials dict into an opaque string for DB storage."""
    raw = json.dumps(data, separators=(",", ":")).encode()
    return _fernet().encrypt(raw).decode()


def decrypt_credentials(token: str) -> dict[str, Any]:
    """Decrypt a stored credentials blob back into a dict."""
    raw = _fernet().decrypt(token.encode())
    return json.loads(raw)
