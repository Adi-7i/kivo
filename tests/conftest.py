"""Pytest fixtures and configuration for Kivo test suite."""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from django.db import connections
from rest_framework.test import APIClient


def require_test_database_approval() -> str:
    """Never infer permission to create/flush a database from a test_ prefix."""
    name = os.environ.get("KIVO_TEST_DATABASE_NAME", "")
    if os.environ.get("KIVO_ALLOW_TEST_DATABASE_MUTATIONS") != "1" or not name.startswith("test_"):
        raise pytest.UsageError(
            "Database tests BLOCKED: explicitly authorize an isolated PostgreSQL target with "
            "KIVO_TEST_DATABASE_NAME=test_<approved_name> and "
            "KIVO_ALLOW_TEST_DATABASE_MUTATIONS=1. Setup may create, migrate, flush or drop "
            "that database; never use production credentials."
        )
    return name


@pytest.fixture(scope="session")
def django_db_modify_db_settings(django_db_modify_db_settings_parallel_suffix: None) -> None:
    """Fail closed before test setup could create, flush or reuse a development database."""
    requested_name = require_test_database_approval()
    for connection in connections.all():
        config = connection.settings_dict
        # Separate audit/CI sessions from another process using Django's default
        # test_postgres database. Validation below still fails closed before DDL.
        config["TEST"]["NAME"] = requested_name
        test_name = connection.creation._get_test_db_name()
        if (
            config["ENGINE"] != "django.db.backends.postgresql"
            or not config.get("HOST")
            or config.get("TEST", {}).get("MIRROR")
            or test_name == config["NAME"]
            or not test_name.startswith("test_")
        ):
            raise pytest.UsageError(
                "Isolated remote PostgreSQL test database required; refusing unsafe setup."
            )
        config["OPTIONS"]["connect_timeout"] = 10


@pytest.fixture
def api_client() -> APIClient:
    """Fixture providing an unauthenticated REST API client."""
    return APIClient()


@pytest.fixture
def clean_env() -> Generator[dict[str, str]]:
    """Fixture to safely isolate environment modifications during testing."""
    old_env = os.environ.copy()
    yield os.environ
    os.environ.clear()
    os.environ.update(old_env)
