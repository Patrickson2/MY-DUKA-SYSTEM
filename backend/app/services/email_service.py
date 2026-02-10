"""Email service helpers."""
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def build_admin_invite_link(token: str, expires_in_hours: int) -> str:
    """Build frontend invite URL from a token and expiry window."""
    base_url = settings.frontend_base_url.rstrip("/")
    return f"{base_url}/login?invite_token={token}&expires_in_hours={expires_in_hours}"


def send_admin_invite_email(email: str, invite_link: str, expires_in_hours: int) -> None:
    """Send an admin invite email using SendGrid (fallback to log)."""
    subject = "You're invited to join MyDuka as an Admin"
    plain_text = (
        "You have been invited to join MyDuka as an admin.\n\n"
        f"Use the link below to complete your registration. This invite expires in "
        f"{expires_in_hours} hours.\n\n"
        f"{invite_link}\n"
    )
    html_content = (
        "<p>You have been invited to join <strong>MyDuka</strong> as an admin.</p>"
        f"<p>This invite expires in <strong>{expires_in_hours} hours</strong>.</p>"
        f"<p><a href=\"{invite_link}\">Complete your registration</a></p>"
    )

    if settings.sendgrid_api_key:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=settings.email_from,
                to_emails=email,
                subject=subject,
                plain_text_content=plain_text,
                html_content=html_content,
            )
            response = SendGridAPIClient(settings.sendgrid_api_key).send(message)
            logger.info(
                "Admin invite sent to %s via SendGrid status=%s",
                email,
                getattr(response, "status_code", "unknown"),
            )
            return
        except Exception:
            logger.exception("Failed to send SendGrid invite to %s", email)

    logger.info(
        "Admin invite prepared for %s (expires in %s hours): %s",
        email,
        expires_in_hours,
        invite_link,
    )


def build_password_reset_link(token: str, expires_in_hours: int) -> str:
    """Build frontend password reset URL from a token and expiry window."""
    base_url = settings.frontend_base_url.rstrip("/")
    return f"{base_url}/reset-password?token={token}&expires_in_hours={expires_in_hours}"


def send_password_reset_email(email: str, reset_link: str, expires_in_hours: int) -> None:
    """Send a password reset email using SendGrid (fallback to log)."""
    subject = "Reset your MyDuka password"
    plain_text = (
        "We received a request to reset your MyDuka password.\n\n"
        f"Use the link below to set a new password. This link expires in "
        f"{expires_in_hours} hours.\n\n"
        f"{reset_link}\n\n"
        "If you did not request this, you can ignore this email."
    )
    html_content = (
        "<p>We received a request to reset your <strong>MyDuka</strong> password.</p>"
        f"<p>This link expires in <strong>{expires_in_hours} hours</strong>.</p>"
        f"<p><a href=\"{reset_link}\">Reset your password</a></p>"
        "<p>If you did not request this, you can ignore this email.</p>"
    )

    if settings.sendgrid_api_key:
        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail

            message = Mail(
                from_email=settings.email_from,
                to_emails=email,
                subject=subject,
                plain_text_content=plain_text,
                html_content=html_content,
            )
            response = SendGridAPIClient(settings.sendgrid_api_key).send(message)
            logger.info(
                "Password reset email sent to %s via SendGrid status=%s",
                email,
                getattr(response, "status_code", "unknown"),
            )
            return
        except Exception:
            logger.exception("Failed to send password reset email to %s", email)

    logger.info(
        "Password reset prepared for %s (expires in %s hours): %s",
        email,
        expires_in_hours,
        reset_link,
    )
