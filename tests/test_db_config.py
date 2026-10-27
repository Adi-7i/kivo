"""Tests for database configuration parsing and credential masking."""

from __future__ import annotations

import pytest
from common.db import mask_db_url, parse_supabase_db_url
from django.core.exceptions import ImproperlyConfigured


@pytest.mark.unit
class TestDatabaseUrlParser:
    """Validate parsing of Supabase PostgreSQL connection strings."""

    def test_parse_valid_supabase_url(self) -> None:
        """Properly extracts user, password, host, port, dbname, and sslmode."""
        url = "postgresql://postgres.myproject:secretpassword123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require"
        config = parse_supabase_db_url(url)

        assert config["ENGINE"] == "django.db.backends.postgresql"
        assert config["NAME"] == "postgres"
        assert config["USER"] == "postgres.myproject"
        assert config["PASSWORD"] == "secretpassword123"
        assert config["HOST"] == "aws-0-ap-south-1.pooler.supabase.com"
        assert config["PORT"] == 5432
        assert config["OPTIONS"]["sslmode"] == "require"

    def test_parse_missing_url_raises_improperly_configured(self) -> None:
        """Empty or missing URL raises ImproperlyConfigured."""
        with pytest.raises(ImproperlyConfigured, match="SUPABASE_DB_URL is not configured"):
            parse_supabase_db_url("")

    def test_preserves_explicit_tls_root_certificate(self) -> None:
        config = parse_supabase_db_url(
            "postgresql://app:secret@db.example/db?sslmode=verify-full"
            "&sslrootcert=%2Frun%2Fsecrets%2Fsupabase-ca.crt"
        )
        assert config["OPTIONS"]["sslrootcert"] == "/run/secrets/supabase-ca.crt"

    @pytest.mark.parametrize("query", ["sslmode=require&sslmode=disable", "sslrootcert="])
    def test_rejects_ambiguous_or_empty_tls_configuration(self, query: str) -> None:
        with pytest.raises(ImproperlyConfigured, match="TLS"):
            parse_supabase_db_url(f"postgresql://app:secret@db.example/db?{query}")

    def test_parse_invalid_scheme_raises_improperly_configured(self) -> None:
        """Schemes other than postgresql/postgres are rejected."""
        with pytest.raises(ImproperlyConfigured, match="Invalid database scheme 'mysql'"):
            parse_supabase_db_url("mysql://user:pass@localhost:3306/db")

    def test_parse_custom_port_and_dbname(self) -> None:
        """Custom port and database name are preserved."""
        url = "postgres://custom_user:pass@db.example.com:6543/custom_db?sslmode=verify-full"
        config = parse_supabase_db_url(url)

        assert config["NAME"] == "custom_db"
        assert config["PORT"] == 6543
        assert config["USER"] == "custom_user"
        assert config["OPTIONS"]["sslmode"] == "verify-full"

    @pytest.mark.parametrize("sslmode", ["disable", "allow", "prefer"])
    def test_rejects_tls_downgrade(self, sslmode: str) -> None:
        with pytest.raises(ImproperlyConfigured, match="TLS"):
            parse_supabase_db_url(
                f"postgresql://user:pass@db.example.com/postgres?sslmode={sslmode}"
            )


@pytest.mark.unit
class TestDatabaseUrlMasking:
    """Verify that credentials are safely masked for logging and reporting."""

    def test_mask_db_url_redacts_password(self) -> None:
        url = "postgresql://postgres.xyz:SuperSecret123@aws-0-ap-south-1.pooler.supabase.com:5432/postgres"
        masked = mask_db_url(url)
        assert "SuperSecret123" not in masked
        assert ":****@" in masked
        assert "postgres.xyz" in masked

    def test_mask_db_url_handles_empty(self) -> None:
        assert mask_db_url("") == ""
