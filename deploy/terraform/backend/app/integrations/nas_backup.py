"""NAS off-site backup connector (SFTP push).

Reuses the integration plumbing end-to-end: ``connect`` validates the SFTP login
and target folder; each ``sync`` exports the org's full data to a timestamped
CSV-zip and uploads it to the customer's NAS over SFTP. Credentials are stored
Fernet-encrypted like every other integration. Throttled to roughly once a day
so the hourly scheduler/beat doesn't re-upload every cycle.

``paramiko`` is imported lazily so the app boots even if it isn't installed yet.
"""
from __future__ import annotations

import io
import logging
import posixpath
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.integrations.base import (
    BaseConnector,
    ConnectorError,
    IntegrationMeta,
    SyncResult,
)
from app.models.enums import IntegrationCategory
from app.services.backup import build_backup_archive

logger = logging.getLogger(__name__)

DEFAULT_PORT = 22
# Skip a backup if one already ran within this window (keeps the hourly
# scheduler from re-uploading; effectively daily).
MIN_HOURS_BETWEEN_BACKUPS = 20


class NasBackupConnector(BaseConnector):
    meta = IntegrationMeta(
        provider="nas",
        name="NAS Backup",
        description="Off-site backup of all your data to your own NAS over SFTP (daily, as CSV).",
        icon="HardDrive",
        category=IntegrationCategory.backup,
        phase=1,
        features=["Full CSV export", "SFTP push", "Encrypted credentials"],
        has_connector=True,
        # password OR private_key may be used; remote_path is the target folder.
        credential_fields=["host", "port", "username", "password", "private_key", "remote_path"],
    )

    # The data connectors trigger a profit recompute after sync; a backup must not.
    triggers_profit_recompute = False

    # ── SFTP helpers ────────────────────────────────────────
    def _connect(self, credentials: dict[str, Any]):
        import paramiko  # lazy import

        host = (credentials.get("host") or "").strip()
        if not host:
            raise ConnectorError("NAS host is required (IP or hostname).")
        try:
            port = int(credentials.get("port") or DEFAULT_PORT)
        except (TypeError, ValueError):
            port = DEFAULT_PORT

        username = (credentials.get("username") or "").strip()
        password = credentials.get("password") or None
        private_key = credentials.get("private_key") or None

        kwargs: dict[str, Any] = {
            "hostname": host,
            "port": port,
            "username": username,
            "timeout": 20,
            "allow_agent": False,
            "look_for_keys": False,
        }
        if private_key:
            kwargs["pkey"] = self._parse_key(private_key)
        else:
            if not password:
                raise ConnectorError("Provide a NAS password or a private key.")
            kwargs["password"] = password

        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        try:
            client.connect(**kwargs)
        except Exception as exc:  # auth/network/host errors
            raise ConnectorError(f"Could not connect to NAS over SFTP: {exc}") from exc
        return client

    @staticmethod
    def _parse_key(private_key: str):
        import paramiko

        for key_cls in (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey):
            try:
                return key_cls.from_private_key(io.StringIO(private_key))
            except Exception:
                continue
        raise ConnectorError("Could not parse the provided private key.")

    def _ensure_remote_dir(self, sftp, remote_path: str) -> None:
        """mkdir -p the target folder so the first upload doesn't fail."""
        if not remote_path or remote_path == ".":
            return
        absolute = remote_path.startswith("/")
        cur = "/" if absolute else ""
        for part in [p for p in remote_path.split("/") if p]:
            cur = posixpath.join(cur, part) if cur else part
            try:
                sftp.stat(cur)
            except FileNotFoundError:
                try:
                    sftp.mkdir(cur)
                except Exception as exc:
                    raise ConnectorError(f"Cannot create remote folder '{cur}': {exc}") from exc

    # ── Validate ────────────────────────────────────────────
    def validate(self, credentials: dict[str, Any]) -> dict[str, Any]:
        client = self._connect(credentials)
        try:
            sftp = client.open_sftp()
            self._ensure_remote_dir(sftp, (credentials.get("remote_path") or ".").strip() or ".")
            sftp.close()
        finally:
            client.close()
        return {
            "host": credentials.get("host"),
            "remote_path": (credentials.get("remote_path") or ".").strip() or ".",
        }

    # ── Sync == perform a backup ────────────────────────────
    def sync(
        self,
        session: Session,
        organization_id: str,
        credentials: dict[str, Any],
        on_page: Any = None,
        since: datetime | None = None,
    ) -> SyncResult:
        # Daily throttle. ``since`` is last_sync minus a small overlap; if the
        # last backup is recent, skip without re-uploading.
        if since is not None:
            since_utc = since if since.tzinfo else since.replace(tzinfo=timezone.utc)
            if datetime.now(timezone.utc) - since_utc < timedelta(hours=MIN_HOURS_BETWEEN_BACKUPS):
                return SyncResult(counts={"skipped": 1}, account_info={"reason": "recent backup"})

        filename, data, counts = build_backup_archive(session, organization_id)

        remote_path = (credentials.get("remote_path") or ".").strip() or "."
        client = self._connect(credentials)
        try:
            sftp = client.open_sftp()
            self._ensure_remote_dir(sftp, remote_path)
            remote_file = posixpath.join(remote_path, filename) if remote_path != "." else filename
            with sftp.open(remote_file, "wb") as fh:
                fh.write(data)
            sftp.close()
        except ConnectorError:
            raise
        except Exception as exc:
            raise ConnectorError(f"NAS backup upload failed: {exc}") from exc
        finally:
            client.close()

        logger.info(
            "NAS backup uploaded for org %s: %s (%d bytes)",
            organization_id, remote_file, len(data),
        )
        result_counts = {f"rows_{k}": v for k, v in counts.items()}
        result_counts["bytes"] = len(data)
        return SyncResult(counts=result_counts, account_info={"uploaded": remote_file})
