"""Production configuration must reject unsafe operator input before startup."""

from __future__ import annotations

import importlib
import os
import subprocess
import sys
from pathlib import Path

import pytest
from django.core.exceptions import ImproperlyConfigured

TEST_SECRET = "phase-seven-production-test-key-58f42a96c730b1e9a0d5"


@pytest.fixture
def production_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DEBUG", "False")
    monkeypatch.setenv("DJANGO_SECRET_KEY", TEST_SECRET)
    monkeypatch.setenv("ALLOWED_HOSTS", "api.example.invalid")
    monkeypatch.setenv("SUPABASE_DB_URL", "postgresql://user:example@db.example.invalid/postgres")
    monkeypatch.delenv("CSRF_TRUSTED_ORIGINS", raising=False)
    monkeypatch.delenv("SECURE_SSL_REDIRECT", raising=False)
    monkeypatch.delenv("AUTH_TRUSTED_PROXY_HOPS", raising=False)


@pytest.mark.unit
@pytest.mark.parametrize(
    "key,value",
    [
        ("ALLOWED_HOSTS", ", ,"),
        ("ALLOWED_HOSTS", "api.*.example.invalid"),
        ("CSRF_TRUSTED_ORIGINS", "http://example.invalid"),
        ("CSRF_TRUSTED_ORIGINS", "https://*.example.invalid"),
        ("CSRF_TRUSTED_ORIGINS", "https://example.invalid/path"),
        ("DJANGO_SECRET_KEY", "a" * 50),
        ("DJANGO_SECRET_KEY", "replace-with-a-secure-random-secret-key-at-least-50-characters"),
        ("SECURE_SSL_REDIRECT", "False"),
        ("AUTH_TRUSTED_PROXY_HOPS", "unbounded"),
    ],
)
def test_production_rejects_unsafe_configuration(
    production_environment: None, monkeypatch: pytest.MonkeyPatch, key: str, value: str
) -> None:
    monkeypatch.setenv(key, value)
    with pytest.raises(ImproperlyConfigured):
        module = importlib.import_module("config.settings.production")
        importlib.reload(module)


@pytest.mark.unit
def test_valid_production_configuration_retains_cookie_and_https_security(
    production_environment: None,
) -> None:
    module = importlib.import_module("config.settings.production")
    module = importlib.reload(module)
    assert module.DEBUG is False
    assert module.SECURE_SSL_REDIRECT and module.SESSION_COOKIE_SECURE and module.CSRF_COOKIE_SECURE
    assert module.SESSION_COOKIE_HTTPONLY and module.SESSION_COOKIE_SAMESITE == "Lax"
    assert module.REST_FRAMEWORK["NUM_PROXIES"] == 0
    assert module.SPECTACULAR_SETTINGS["SERVE_PERMISSIONS"] == [
        "rest_framework.permissions.IsAuthenticated"
    ]


@pytest.mark.unit
def test_proxy_trust_is_explicit_and_does_not_mutate_the_base_configuration(
    production_environment: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from config.settings import base

    monkeypatch.setenv("AUTH_TRUSTED_PROXY_HOPS", "1")
    module = importlib.import_module("config.settings.production")
    module = importlib.reload(module)
    assert module.REST_FRAMEWORK["NUM_PROXIES"] == 1
    assert base.REST_FRAMEWORK["NUM_PROXIES"] == 0


@pytest.mark.unit
@pytest.mark.parametrize("entrypoint", ["wsgi", "asgi"])
def test_server_entrypoints_default_to_production(
    production_environment: None,
    entrypoint: str,
) -> None:
    environment = os.environ.copy()
    environment.pop("DJANGO_SETTINGS_MODULE", None)
    environment["PYTHONPATH"] = str(Path(__file__).resolve().parents[1] / "backend")
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            f"import config.{entrypoint}; from django.conf import settings; assert settings.SETTINGS_MODULE == 'config.settings.production'; assert settings.DEBUG is False; from django.test import Client; response=Client().get('/api/schema/', secure=True, HTTP_HOST='api.example.invalid'); assert response.status_code == 401, response.status_code",
        ],
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
