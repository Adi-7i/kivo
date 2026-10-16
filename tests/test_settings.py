"""Tests for Django settings configuration and security boundaries."""

from __future__ import annotations

import importlib

import pytest
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


@pytest.mark.unit
class TestSettingsConfiguration:
    """Validate core settings values in the loaded development configuration."""

    def test_auth_user_model_is_configured(self) -> None:
        """AUTH_USER_MODEL must strictly point to 'users.User'."""
        assert settings.AUTH_USER_MODEL == "users.User"

    def test_timezone_and_i18n(self) -> None:
        """Timezone must be Asia/Kolkata and USE_TZ must be True."""
        assert settings.USE_TZ is True
        assert settings.TIME_ZONE == "Asia/Kolkata"

    def test_installed_apps_contain_required_modules(self) -> None:
        """Required core, third-party, and domain apps must be present."""
        expected_apps = [
            "apps.users",
            "common",
            "rest_framework",
            "drf_spectacular",
            "django_filters",
        ]
        for app in expected_apps:
            assert app in settings.INSTALLED_APPS

    def test_drf_default_permission_is_authenticated(self) -> None:
        """Future API endpoints must default to authenticated access."""
        drf_config = settings.REST_FRAMEWORK
        assert (
            "rest_framework.permissions.IsAuthenticated" in drf_config["DEFAULT_PERMISSION_CLASSES"]
        )

    def test_drf_json_renderer_is_default(self) -> None:
        """JSON renderer must be configured."""
        drf_config = settings.REST_FRAMEWORK
        assert "rest_framework.renderers.JSONRenderer" in drf_config["DEFAULT_RENDERER_CLASSES"]

    def test_drf_pagination_page_size(self) -> None:
        """Default page size must be 20."""
        drf_config = settings.REST_FRAMEWORK
        assert drf_config["PAGE_SIZE"] == 20


@pytest.mark.unit
class TestProductionSettingsGuards:
    """Verify that production settings enforce strict security assertions."""

    def test_production_rejects_debug_true(
        self, clean_env: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Production configuration must fail if DEBUG=True is requested."""
        monkeypatch.setenv("DEBUG", "True")
        monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 50)
        monkeypatch.setenv("ALLOWED_HOSTS", "api.kivo.app")
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@db.supabase.co:5432/postgres")

        with pytest.raises(ImproperlyConfigured, match="DEBUG cannot be enabled in production"):
            import config.settings.production

            importlib.reload(config.settings.production)

    def test_production_rejects_missing_secret_key(
        self, clean_env: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Production configuration must fail if DJANGO_SECRET_KEY is missing."""
        monkeypatch.setenv("DEBUG", "False")
        monkeypatch.delenv("DJANGO_SECRET_KEY", raising=False)
        monkeypatch.setenv("ALLOWED_HOSTS", "api.kivo.app")
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@db.supabase.co:5432/postgres")

        with pytest.raises(
            ImproperlyConfigured, match="DJANGO_SECRET_KEY environment variable is required"
        ):
            import config.settings.production

            importlib.reload(config.settings.production)

    def test_production_rejects_insecure_secret_key(
        self, clean_env: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Production configuration must fail if DJANGO_SECRET_KEY contains 'insecure' or is too short."""
        monkeypatch.setenv("DEBUG", "False")
        monkeypatch.setenv("DJANGO_SECRET_KEY", "django-insecure-short")
        monkeypatch.setenv("ALLOWED_HOSTS", "api.kivo.app")
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@db.supabase.co:5432/postgres")

        with pytest.raises(ImproperlyConfigured, match="insecure or too short"):
            import config.settings.production

            importlib.reload(config.settings.production)

    def test_production_rejects_empty_allowed_hosts(
        self, clean_env: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Production configuration must fail if ALLOWED_HOSTS is empty."""
        monkeypatch.setenv("DEBUG", "False")
        monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 50)
        monkeypatch.delenv("ALLOWED_HOSTS", raising=False)
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@db.supabase.co:5432/postgres")

        with pytest.raises(
            ImproperlyConfigured,
            match="ALLOWED_HOSTS environment variable must be explicitly defined",
        ):
            import config.settings.production

            importlib.reload(config.settings.production)

    def test_production_rejects_wildcard_allowed_hosts(
        self, clean_env: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Production configuration must strictly reject wildcard '*' host."""
        monkeypatch.setenv("DEBUG", "False")
        monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 50)
        monkeypatch.setenv("ALLOWED_HOSTS", "api.kivo.app,*")
        monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://u:p@db.supabase.co:5432/postgres")

        with pytest.raises(
            ImproperlyConfigured, match="Wildcard '\\*' in ALLOWED_HOSTS is strictly prohibited"
        ):
            import config.settings.production

            importlib.reload(config.settings.production)

    def test_production_rejects_missing_supabase_db_url(
        self, clean_env: dict[str, str], monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Production configuration must fail if SUPABASE_DB_URL is missing."""
        monkeypatch.setenv("DEBUG", "False")
        monkeypatch.setenv("DJANGO_SECRET_KEY", "a" * 50)
        monkeypatch.setenv("ALLOWED_HOSTS", "api.kivo.app")
        monkeypatch.delenv("SUPABASE_DB_URL", raising=False)

        with pytest.raises(
            ImproperlyConfigured, match="SUPABASE_DB_URL environment variable is required"
        ):
            import config.settings.production

            importlib.reload(config.settings.production)
