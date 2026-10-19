"""Database connection utilities and URL parser for Supabase PostgreSQL."""

from __future__ import annotations

import os
from typing import Any
from urllib.parse import parse_qs, unquote, urlparse

from django.core.exceptions import ImproperlyConfigured


def mask_db_url(url_str: str) -> str:
    """Safely mask password in a database URL for diagnostic reporting."""
    if not url_str:
        return ""
    try:
        parsed = urlparse(url_str)
        if not parsed.hostname:
            return "<invalid-url-format>"
        netloc = parsed.netloc
        if parsed.password is not None:
            _, _, host_port = netloc.rpartition("@")
            netloc = f"{parsed.username}:****@{host_port}"
        # Connection query parameters and fragments can contain additional secrets.
        return parsed._replace(netloc=netloc, query="", fragment="").geturl()
    except Exception:
        return "<invalid-url-format>"


def parse_supabase_db_url(url_str: str | None = None) -> dict[str, Any]:
    """Parse SUPABASE_DB_URL into a Django DATABASES configuration dictionary.

    Requires an encrypted TLS connection ('sslmode=require').
    """
    raw_url = url_str if url_str is not None else os.environ.get("SUPABASE_DB_URL", "").strip()

    if not raw_url:
        raise ImproperlyConfigured(
            "SUPABASE_DB_URL is not configured in the environment. "
            "Kivo requires a valid remote Supabase PostgreSQL connection string. "
            "Please configure SUPABASE_DB_URL in your local .env file."
        )

    parsed = urlparse(raw_url)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise ImproperlyConfigured(
            f"Invalid database scheme '{parsed.scheme}'. Kivo requires 'postgresql' or 'postgres'."
        )
    if not parsed.hostname:
        raise ImproperlyConfigured(
            "A remote PostgreSQL host is required; local socket fallback is prohibited."
        )

    qs = parse_qs(parsed.query)
    sslmode = qs.get("sslmode", ["require"])[0]
    if sslmode not in {"require", "verify-ca", "verify-full"}:
        raise ImproperlyConfigured(
            "Kivo requires encrypted PostgreSQL TLS; insecure sslmode is rejected."
        )

    # Database name from URL path
    db_name = parsed.path.lstrip("/")
    if not db_name:
        db_name = "postgres"

    # Default to port 5432 if unspecified
    port = parsed.port if parsed.port is not None else 5432

    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": db_name,
        "USER": unquote(parsed.username) if parsed.username else "postgres",
        "PASSWORD": unquote(parsed.password) if parsed.password else "",
        "HOST": parsed.hostname or "",
        "PORT": port,
        "OPTIONS": {
            "sslmode": sslmode,
            "connect_timeout": 10,
        },
        "CONN_MAX_AGE": 600,
        "CONN_HEALTH_CHECKS": True,
    }
