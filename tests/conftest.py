"""Pytest fixtures and configuration for Kivo test suite."""

from __future__ import annotations

import os
from collections.abc import Generator

import pytest
from rest_framework.test import APIClient


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
