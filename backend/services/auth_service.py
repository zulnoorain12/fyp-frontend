"""
Authentication service for JWT token management, password hashing, and email.
"""

import os
import logging
import smtplib
import secrets
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

import bcrypt
from jose import JWTError, jwt
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── Configuration ────────────────────────────────────────────────
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cyberisai-super-secret-key-change-in-production")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "15"))

# ── SMTP Configuration ──────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
EMAIL_USER = os.getenv("EMAIL_USER", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_FROM = os.getenv("EMAIL_FROM", "CyberisAI <noreply@cyberisai.com>")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class AuthService:
    """Handles password hashing, JWT creation, token verification, and email."""

    # ── Password utilities (using bcrypt directly) ───────────────

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a plaintext password using bcrypt."""
        password_bytes = password.encode("utf-8")
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode("utf-8")

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a plaintext password against its bcrypt hash."""
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False

    # ── Token creation ───────────────────────────────────────────

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a short-lived JWT access token.

        Args:
            data: Payload to encode (must include 'sub' with user email).
            expires_delta: Optional custom expiry duration.

        Returns:
            Encoded JWT string.
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Create a long-lived JWT refresh token.

        Args:
            data: Payload to encode (must include 'sub' with user email).
            expires_delta: Optional custom expiry duration.

        Returns:
            Encoded JWT string.
        """
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    # ── Password reset token ─────────────────────────────────────

    @staticmethod
    def create_reset_token(email: str) -> str:
        """
        Create a short-lived JWT token for password reset.

        Args:
            email: The user's email address.

        Returns:
            Encoded JWT string valid for RESET_TOKEN_EXPIRE_MINUTES.
        """
        to_encode = {
            "sub": email,
            "type": "reset",
            "jti": secrets.token_hex(16),  # unique ID to prevent reuse
        }
        expire = datetime.utcnow() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        to_encode["exp"] = expire
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    @staticmethod
    def verify_reset_token(token: str) -> Optional[str]:
        """
        Verify a password-reset JWT token.

        Args:
            token: The JWT reset token string.

        Returns:
            The user's email if the token is valid, None otherwise.
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

            if payload.get("type") != "reset":
                logger.warning("Token type is not 'reset'")
                return None

            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                logger.warning("Reset token has expired")
                return None

            return payload.get("sub")

        except JWTError as e:
            logger.warning(f"Reset token verification failed: {e}")
            return None

    # ── Token verification ───────────────────────────────────────

    @staticmethod
    def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
        """
        Decode and verify a JWT token.

        Args:
            token: The JWT string to verify.
            token_type: Expected token type ('access' or 'refresh').

        Returns:
            Decoded payload dict if valid, None otherwise.
        """
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

            # Check token type matches
            if payload.get("type") != token_type:
                logger.warning(f"Token type mismatch: expected {token_type}, got {payload.get('type')}")
                return None

            # Check expiry
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                logger.warning("Token has expired")
                return None

            return payload

        except JWTError as e:
            logger.warning(f"JWT verification failed: {e}")
            return None

    # ── Helper: generate token pair ──────────────────────────────

    @staticmethod
    def create_tokens(user_id: int, email: str, name: str, role: str = "user") -> Dict[str, str]:
        """
        Generate both access and refresh tokens for a user.

        Returns:
            Dict with 'access_token' and 'refresh_token'.
        """
        token_data = {
            "sub": email,
            "user_id": user_id,
            "name": name,
            "role": role,
        }

        return {
            "access_token": AuthService.create_access_token(token_data),
            "refresh_token": AuthService.create_refresh_token(token_data),
            "token_type": "bearer",
        }

    # ── Email utilities ──────────────────────────────────────────

    @staticmethod
    def send_reset_email(to_email: str, reset_token: str) -> bool:
        """
        Send a password-reset email with a link containing the reset token.

        Args:
            to_email: Recipient email address.
            reset_token: The JWT reset token to embed in the link.

        Returns:
            True if the email was sent successfully, False otherwise.
        """
        if not EMAIL_USER or not EMAIL_PASSWORD:
            logger.error("SMTP credentials not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env")
            return False

        reset_link = f"{FRONTEND_URL}?reset_token={reset_token}"

        subject = "CyberisAI – Reset Your Password"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background-color:#0f172a;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 20px;">
                <tr>
                    <td align="center">
                        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.1);border-radius:24px;padding:48px 40px;">
                            <!-- Logo -->
                            <tr>
                                <td align="center" style="padding-bottom:32px;">
                                    <div style="display:inline-block;width:56px;height:56px;background:linear-gradient(135deg,#06b6d4,#3b82f6);border-radius:16px;line-height:56px;text-align:center;">
                                        <span style="font-size:28px;color:#ffffff;">🔒</span>
                                    </div>
                                    <h1 style="margin:16px 0 0;font-size:28px;font-weight:700;background:linear-gradient(90deg,#06b6d4,#3b82f6,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">CyberisAI</h1>
                                </td>
                            </tr>
                            <!-- Content -->
                            <tr>
                                <td>
                                    <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#ffffff;text-align:center;">Password Reset Request</h2>
                                    <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#94a3b8;text-align:center;">
                                        We received a request to reset the password for your CyberisAI account. Click the button below to set a new password. This link expires in <strong style="color:#e2e8f0;">{RESET_TOKEN_EXPIRE_MINUTES} minutes</strong>.
                                    </p>
                                </td>
                            </tr>
                            <!-- Button -->
                            <tr>
                                <td align="center" style="padding:8px 0 32px;">
                                    <a href="{reset_link}" style="display:inline-block;padding:16px 48px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;border-radius:14px;letter-spacing:0.3px;">
                                        Reset My Password
                                    </a>
                                </td>
                            </tr>
                            <!-- Footer note -->
                            <tr>
                                <td style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;">
                                    <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;text-align:center;">
                                        If you did not request this password reset, you can safely ignore this email. Your password will not be changed.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """

        plain_body = (
            f"CyberisAI – Password Reset\n\n"
            f"We received a request to reset your password.\n"
            f"Click the link below to set a new password (expires in {RESET_TOKEN_EXPIRE_MINUTES} minutes):\n\n"
            f"{reset_link}\n\n"
            f"If you did not request this, ignore this email."
        )

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = EMAIL_FROM
            msg["To"] = to_email

            msg.attach(MIMEText(plain_body, "plain"))
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(EMAIL_USER, EMAIL_PASSWORD)
                server.sendmail(EMAIL_USER, to_email, msg.as_string())

            logger.info(f"Password reset email sent to {to_email}")
            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            return False
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error sending reset email: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error sending reset email: {e}")
            return False
