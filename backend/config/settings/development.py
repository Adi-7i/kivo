"""Development environment settings for Kivo."""

from __future__ import annotations

import os

from common.db import parse_supabase_db_url
from common.env import load_dotenv
from config.settings.base import *  # noqa: F403
from django.core.exceptions import ImproperlyConfigured

# Load local environment variables from .env if present
load_dotenv()

# Security & Debugging
DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "yes")

SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY",
    "django-insecure-development-key-kivo-do-not-use-in-production-2026",
)

allowed_hosts_raw = os.environ.get("ALLOWED_HOSTS", "127.0.0.1,localhost")
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_raw.split(",") if host.strip()]

# Remote Supabase PostgreSQL Database Configuration
supabase_url = os.environ.get("SUPABASE_DB_URL", "").strip()

if supabase_url:
    DATABASES = {
        "default": parse_supabase_db_url(supabase_url),
    }
else:
    # Development stub when SUPABASE_DB_URL is pending user input.
    # Allows non-database checks and commands to load without crashing,
    # while database operations will explicitly require the remote Supabase URL.
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": "kivo_unconfigured",
            "USER": "",
            "PASSWORD": "",
            "HOST": "",
            "PORT": 5432,
            "OPTIONS": {
                "sslmode": "require",
            },
        }
    }

# Development CORS & CSRF
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get(
        "CSRF_TRUSTED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
