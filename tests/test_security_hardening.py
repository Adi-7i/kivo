"""Security boundaries and explicit unit fault injection; no mocked DB integration."""

from __future__ import annotations

import logging
from unittest.mock import patch
from uuid import uuid4

import pytest
from apps.users.models import User
from apps.users.views import MeView
from common.db import mask_db_url, parse_supabase_db_url
from common.exceptions import kivo_exception_handler
from common.observability import RequestCorrelationMiddleware
from django.core.exceptions import ImproperlyConfigured
from django.db import OperationalError, connection
from django.http import HttpResponse
from django.test import RequestFactory, override_settings
from django.utils.functional import SimpleLazyObject
from rest_framework.test import APIClient
from rest_framework.views import APIView


@pytest.mark.unit
def test_exception_messages_and_tracebacks_are_not_sent_to_log_handlers(
    caplog: pytest.LogCaptureFixture,
) -> None:
    with caplog.at_level(logging.ERROR, logger="kivo.api"):
        try:
            raise RuntimeError("password-and-token-sentinel")
        except RuntimeError as exc:
            response = kivo_exception_handler(exc, {"view": APIView()})
    assert response.status_code == 500
    assert "password-and-token-sentinel" not in str(response.data)
    assert "password-and-token-sentinel" not in caplog.text
    assert all(record.exc_info is None for record in caplog.records)


@pytest.mark.unit
def test_database_outage_is_sanitized_and_does_not_promise_a_safe_new_write() -> None:
    response = kivo_exception_handler(OperationalError("private-dsn-sentinel"), {"view": APIView()})
    assert response.status_code == 503
    assert response.data["error"]["type"] == "database_unavailable"
    assert "private-dsn-sentinel" not in str(response.data)
    assert "Idempotency-Key" in response.data["error"]["message"]
    assert "Retry-After" not in response


@pytest.mark.unit
@pytest.mark.parametrize("path,expected_status", [("health/", 200), ("health/db/", 503)])
@override_settings(DEBUG=False)
def test_health_checks_ignore_session_cookies_during_database_outage(
    path: str, expected_status: int
) -> None:
    client = APIClient(raise_request_exception=False)
    client.cookies["sessionid"] = "a" * 32
    with (
        patch(
            "django.contrib.sessions.backends.db.SessionStore.load",
            side_effect=OperationalError("session outage"),
        ) as load,
        patch(
            "common.health.views.connection.cursor", side_effect=OperationalError("database outage")
        ),
    ):
        response = client.get(f"/api/v1/{path}")
    assert response.status_code == expected_status
    assert response["Content-Type"].startswith("application/json")
    load.assert_not_called()


@pytest.mark.unit
def test_request_logging_never_forces_lazy_authentication() -> None:
    request = RequestFactory().get("/api/v1/health/")

    def unavailable_user() -> None:
        raise OperationalError("The logger must not load this session.")

    request.user = SimpleLazyObject(unavailable_user)
    response = RequestCorrelationMiddleware(lambda request: HttpResponse("ok"))(request)
    assert response.status_code == 200


@pytest.mark.unit
def test_anonymous_login_csrf_failure_is_json() -> None:
    response = APIClient(enforce_csrf_checks=True).post(
        "/api/v1/auth/login/", {"email": "nobody@example.com", "password": "example"}, format="json"
    )
    assert response.status_code == 403
    assert response["Content-Type"].startswith("application/json")
    assert response.json()["error"]["type"] == "permission_denied"


@pytest.mark.unit
def test_api_errors_and_financial_responses_are_never_cacheable() -> None:
    request = RequestFactory().get("/api/v1/accounts/")
    response = RequestCorrelationMiddleware(
        lambda request: HttpResponse("[]", content_type="application/json")
    )(request)
    assert "no-store" in response["Cache-Control"]
    assert "private" in response["Cache-Control"]


@pytest.mark.unit
def test_database_url_cannot_fall_back_to_a_local_socket() -> None:
    with pytest.raises(ImproperlyConfigured, match="host"):
        parse_supabase_db_url("postgresql:///postgres")


@pytest.mark.unit
def test_database_url_masking_also_removes_query_and_fragment_secrets() -> None:
    masked = mask_db_url(
        "postgresql://user:password-sentinel@db.example/db?token=query-sentinel#fragment-sentinel"
    )
    assert all(
        value not in masked
        for value in ("password-sentinel", "query-sentinel", "fragment-sentinel")
    )


@pytest.mark.unit
def test_reused_database_connections_are_health_checked() -> None:
    config = parse_supabase_db_url("postgresql://user:password@db.example/db")
    assert config["CONN_HEALTH_CHECKS"] is True


@pytest.mark.unit
def test_middleware_server_errors_use_the_json_contract() -> None:
    request = RequestFactory().get("/api/v1/accounts/")
    response = RequestCorrelationMiddleware(
        lambda request: HttpResponse("private-error-sentinel", status=500)
    )(request)
    assert response.status_code == 500
    assert response["Content-Type"].startswith("application/json")
    assert b"private-error-sentinel" not in response.content
    assert b"Idempotency-Key" in response.content


@pytest.mark.unit
def test_unknown_api_route_uses_the_json_not_found_contract() -> None:
    response = APIClient().get("/api/v1/no-such-endpoint/")
    assert response.status_code == 404
    assert response["Content-Type"].startswith("application/json")
    assert response.json()["error"]["type"] == "not_found"


@pytest.mark.django_db(transaction=True)
def test_unhandled_api_error_rolls_back_a_real_postgresql_atomic_request(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Inject an exception after an actual insert, without mocking persistence."""
    user = User.objects.create_user(email=f"atomic-owner-{uuid4().hex}@example.com")
    identity = f"must-rollback-{uuid4().hex}@example.com"
    monkeypatch.setitem(connection.settings_dict, "ATOMIC_REQUESTS", True)

    def fail_after_insert(self: MeView, request: object) -> None:
        User.objects.create_user(email=identity)
        raise RuntimeError("injected after a real PostgreSQL insert")

    monkeypatch.setattr(MeView, "get", fail_after_insert)
    client = APIClient()
    client.force_authenticate(user)
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 500
    assert not User.objects.filter(email=identity).exists()
