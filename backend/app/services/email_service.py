"""Email service helpers.

Current implementation logs invite links for local/dev use.
"""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_admin_invite_link(token: str) -> str:
    """Build frontend invite URL from a token."""
    base_url = settings.frontend_base_url.rstrip("/")
    return f"{base_url}/?invite_token={token}"


def send_admin_invite_email(email: str, invite_link: str) -> None:
    """Send (or log) admin invite email."""
    logger.info("Admin invite prepared for %s: %s", email, invite_link)
