"""Connection lifecycle configuration only; no database creation or network access."""

from __future__ import annotations

import pytest
from common.db import parse_supabase_db_url
from django.core.exceptions import ImproperlyConfigured

URL = "postgresql://fixture:unused@db.example.test:5432/postgres"


@pytest.mark.unit
def test_pool_is_explicit_and_does_not_change_the_database_target() -> None:
    original = parse_supabase_db_url(URL)
    pooled = parse_supabase_db_url(URL, use_pool=True)
    for name in ("ENGINE", "NAME", "USER", "PASSWORD", "HOST", "PORT"):
        assert pooled[name] == original[name]
    assert original["CONN_MAX_AGE"] == 600
    assert "pool" not in original["OPTIONS"]
    assert pooled["CONN_MAX_AGE"] == 0
    assert pooled["CONN_HEALTH_CHECKS"] is True
    assert pooled["OPTIONS"]["pool"] == {
        "min_size": 1,
        "max_size": 4,
        "max_waiting": 4,
        "timeout": 5,
        "max_lifetime": 600,
        "max_idle": 60,
    }


@pytest.mark.unit
def test_pool_preserves_tls_and_bounded_socket_failure_detection() -> None:
    original = parse_supabase_db_url(URL)
    pooled = parse_supabase_db_url(URL, use_pool=True)
    assert {k: v for k, v in pooled["OPTIONS"].items() if k != "pool"} == original["OPTIONS"]
    assert pooled["OPTIONS"]["sslmode"] == "require"


@pytest.mark.unit
def test_pool_does_not_allow_insecure_database_transport() -> None:
    with pytest.raises(ImproperlyConfigured, match="encrypted"):
        parse_supabase_db_url(f"{URL}?sslmode=disable", use_pool=True)
