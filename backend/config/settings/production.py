"""Production environment settings for Kivo with strict security controls."""

from __future__ import annotations

import os

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
if "insecure" in SECRET_KEY.lower() or len(SECRET_KEY) < 32:
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
if "*" in ALLOWED_HOSTS:
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

# Production HTTPS & Security Middleware Settings
SECURE_SSL_REDIRECT = os.environ.get("SECURE_SSL_REDIRECT", "True").lower() in ("true", "1")
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
