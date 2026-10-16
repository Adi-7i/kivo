"""Integration tests connecting to actual remote Supabase PostgreSQL.

Requires valid SUPABASE_DB_URL configured in .env.
If SUPABASE_DB_URL is not set or remote host is unreachable, tests are marked BLOCKED.
"""

from __future__ import annotations

import os

import pytest
from common.db import mask_db_url
from django.db import connection


@pytest.mark.integration
@pytest.mark.django_db
class TestSupabasePostgresIntegration:
    """Live PostgreSQL integration tests."""

    @pytest.fixture(autouse=True)
    def require_supabase_credentials(self) -> None:
        """Skip integration tests truthfully if SUPABASE_DB_URL is missing."""
        db_url = os.environ.get("SUPABASE_DB_URL", "").strip()
        if not db_url:
            pytest.skip(
                "BLOCKED: Remote Supabase credentials not provided. "
                "Set SUPABASE_DB_URL in .env to execute live PostgreSQL integration tests."
            )

    def test_remote_postgres_connectivity_and_version(self) -> None:
        """Verify real remote PostgreSQL connection and query version without leaking credentials."""
        db_url = os.environ.get("SUPABASE_DB_URL", "")
        masked_url = mask_db_url(db_url)

        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                row = cursor.fetchone()
                assert row is not None
                version_str = row[0]
                assert "PostgreSQL" in version_str
        except Exception as exc:
            pytest.fail(f"Failed to connect to remote Supabase database at '{masked_url}': {exc}")
