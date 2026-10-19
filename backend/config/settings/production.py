"""Production environment settings for Kivo with strict security controls."""

from __future__ import annotations

import os
from urllib.parse import urlsplit

from common.db import parse_supabase_db_url
from config.settings.base import *  # noqa: F403
from django.core.exceptions import ImproperlyConfigured

# Enforce DEBUG=False in production
DEBUG = False
debug_env = os.environ.get("DEBUG", "False").strip().lower()
if debug_env in ("true", "1", "yes"):
    raise ImproperlyConfigured("CRITICAL: DEBUG cannot be enabled in production environments.")

# Secret Key Enforcement
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    raise ImproperlyConfigured(
        "CRITICAL: DJANGO_SECRET_KEY environment variable is required in production."
    )
if (
    "insecure" in SECRET_KEY.lower()
    or SECRET_KEY.lower().startswith(("replace-with-", "your-", "changeme"))
    or len(SECRET_KEY) < 50
    or len(set(SECRET_KEY)) < 5
):
    raise ImproperlyConfigured(
        "CRITICAL: DJANGO_SECRET_KEY is insecure or too short for production use."
    )

# Allowed Hosts Enforcement (Reject empty and reject wildcard)
allowed_hosts_raw = os.environ.get("ALLOWED_HOSTS", "").strip()
if not allowed_hosts_raw:
    raise ImproperlyConfigured(
        "CRITICAL: ALLOWED_HOSTS environment variable must be explicitly defined in production."
    )

ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_raw.split(",") if host.strip()]
if not ALLOWED_HOSTS:
    raise ImproperlyConfigured("CRITICAL: ALLOWED_HOSTS must contain at least one explicit host.")
if any("*" in host for host in ALLOWED_HOSTS):
    raise ImproperlyConfigured(
        "CRITICAL: Wildcard '*' in ALLOWED_HOSTS is strictly prohibited in production."
    )

# Remote Supabase Database Enforcement
supabase_url = os.environ.get("SUPABASE_DB_URL", "").strip()
if not supabase_url:
    raise ImproperlyConfigured(
        "CRITICAL: SUPABASE_DB_URL environment variable is required for production database."
    )

DATABASES = {
    "default": parse_supabase_db_url(supabase_url),
}

# One loopback ingress may supply a replaced X-Forwarded-For header. Default
# to peer-only identities until that network boundary is explicitly configured.
trusted_proxy_hops = os.environ.get("AUTH_TRUSTED_PROXY_HOPS", "0").strip()
if trusted_proxy_hops not in {"0", "1"}:
    raise ImproperlyConfigured("CRITICAL: AUTH_TRUSTED_PROXY_HOPS must be 0 or 1.")
REST_FRAMEWORK = {**REST_FRAMEWORK, "NUM_PROXIES": int(trusted_proxy_hops)}  # noqa: F405
SPECTACULAR_SETTINGS = {  # noqa: F405
    **SPECTACULAR_SETTINGS,  # noqa: F405
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAuthenticated"],
}

# Production HTTPS & Security Middleware Settings
if os.environ.get("SECURE_SSL_REDIRECT", "True").strip().lower() not in ("true", "1", "yes"):
    raise ImproperlyConfigured("CRITICAL: SECURE_SSL_REDIRECT cannot be disabled in production.")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = "DENY"

# Production CORS & CSRF
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]
for origin in CSRF_TRUSTED_ORIGINS:
    try:
        parsed_origin = urlsplit(origin)
        valid_origin = (
            parsed_origin.scheme == "https"
            and bool(parsed_origin.hostname)
            and "*" not in origin
            and not parsed_origin.path
            and not parsed_origin.query
            and not parsed_origin.fragment
            and parsed_origin.username is None
            and parsed_origin.password is None
        )
        valid_origin = valid_origin and (parsed_origin.port is None or parsed_origin.port > 0)
    except ValueError:
        valid_origin = False
    if not valid_origin:
        raise ImproperlyConfigured(
            "CRITICAL: CSRF_TRUSTED_ORIGINS requires explicit HTTPS origins without paths or wildcards."
        )
