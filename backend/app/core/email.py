"""Transactional email via SMTP (e.g. the AWS SES SMTP endpoint).

If SMTP isn't configured, ``send_email`` logs and returns False so callers can
degrade gracefully. Synchronous (smtplib) — call via ``run_in_threadpool`` from
async request handlers so it doesn't block the event loop.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str, html: str | None = None) -> bool:
    """Send a plaintext (optionally HTML) email. Returns True on success."""
    if not settings.smtp_host:
        logger.info("SMTP not configured; skipping email to %s (%s)", to, subject)
        return False

    msg = EmailMessage()
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=20) as server:
            server.starttls()
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password)
            server.send_message(msg)
        logger.info("Sent email to %s (%s)", to, subject)
        return True
    except Exception as exc:  # don't let email failures break the request
        logger.warning("Failed to send email to %s: %s", to, exc)
        return False


def password_reset_link(token: str) -> str:
    """Build the reset URL on the configured frontend origin."""
    base = settings.cors_origin_list[0] if settings.cors_origin_list else ""
    return f"{base.rstrip('/')}/reset-password?token={token}"