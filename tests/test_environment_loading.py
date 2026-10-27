"""Configuration read failures must be visible without exposing secret content."""

from __future__ import annotations

from pathlib import Path
from unittest.mock import patch

import pytest
from common.env import load_dotenv
from django.core.exceptions import ImproperlyConfigured


@pytest.mark.unit
def test_existing_unreadable_environment_fails_without_secret_details(tmp_path: Path) -> None:
    env_path = tmp_path / ".env"
    env_path.write_text("PRIVATE_SETTING=secret-sentinel\n")
    with (
        patch("builtins.open", side_effect=PermissionError("secret-sentinel")),
        pytest.raises(ImproperlyConfigured, match="environment file") as error,
    ):
        load_dotenv(env_path)
    assert "secret-sentinel" not in str(error.value)


@pytest.mark.unit
def test_missing_optional_environment_file_is_allowed(tmp_path: Path) -> None:
    load_dotenv(tmp_path / "missing.env")
