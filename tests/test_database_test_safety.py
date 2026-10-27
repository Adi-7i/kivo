"""Test setup must require explicit authorization before PostgreSQL mutations."""

from __future__ import annotations

import pytest

from tests.conftest import require_test_database_approval


@pytest.mark.unit
@pytest.mark.parametrize("name,approval", [("", ""), ("test_kivo", ""), ("postgres", "1")])
def test_unapproved_database_setup_fails_closed(
    monkeypatch: pytest.MonkeyPatch, name: str, approval: str
) -> None:
    monkeypatch.setenv("KIVO_TEST_DATABASE_NAME", name)
    monkeypatch.setenv("KIVO_ALLOW_TEST_DATABASE_MUTATIONS", approval)
    with pytest.raises(pytest.UsageError, match="BLOCKED"):
        require_test_database_approval()


@pytest.mark.unit
def test_explicit_isolated_target_is_accepted(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("KIVO_TEST_DATABASE_NAME", "test_approved_staging")
    monkeypatch.setenv("KIVO_ALLOW_TEST_DATABASE_MUTATIONS", "1")
    assert require_test_database_approval() == "test_approved_staging"
