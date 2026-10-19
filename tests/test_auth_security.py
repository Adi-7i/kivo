"""Phase 7 security regressions, using PostgreSQL for persistence and races."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier
from uuid import uuid4

import pytest
from apps.users.models import User
from apps.users.serializers import UserLoginSerializer, UserRegistrationSerializer
from apps.users.services import register_user
from apps.users.throttling import LoginRateThrottle, RegisterRateThrottle
from django.contrib.auth.password_validation import validate_password
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, close_old_connections, connections, transaction
from django.test import override_settings
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.test import APIClient, APIRequestFactory

PASSWORD = "PhaseSeven!Mountain47"


@pytest.mark.unit
def test_password_similarity_includes_the_custom_display_name() -> None:
    with pytest.raises(ValidationError, match="similar"):
        validate_password(
            "mountainwaterfall", user=User(email="unrelated@example.com", name="mountainwaterfall")
        )


@pytest.fixture(autouse=True)
def clear_auth_throttles() -> None:
    cache.clear()


@pytest.mark.unit
@pytest.mark.parametrize("serializer", [UserLoginSerializer, UserRegistrationSerializer])
def test_password_whitespace_is_preserved(serializer: type) -> None:
    assert serializer().fields["password"].run_validation(f" {PASSWORD} ") == f" {PASSWORD} "


@pytest.mark.unit
@pytest.mark.parametrize("throttle_type", [LoginRateThrottle, RegisterRateThrottle])
def test_authentication_throttles_also_limit_authenticated_callers(throttle_type: type) -> None:
    request = Request(APIRequestFactory().post("/", REMOTE_ADDR="192.0.2.1"))
    request.user = User(id=123, email="authenticated@example.com")
    throttle = throttle_type()
    results = [throttle.allow_request(request, None) for _ in range(throttle.num_requests + 1)]
    assert results[-1] is False


@pytest.mark.unit
def test_untrusted_forwarded_ip_cannot_change_authentication_throttle_identity() -> None:
    factory = APIRequestFactory()
    first = Request(factory.post("/", REMOTE_ADDR="192.0.2.1", HTTP_X_FORWARDED_FOR="198.51.100.1"))
    second = Request(
        factory.post("/", REMOTE_ADDR="192.0.2.1", HTTP_X_FORWARDED_FOR="198.51.100.2")
    )
    throttle = LoginRateThrottle()
    assert throttle.get_ident(first) == throttle.get_ident(second) == "192.0.2.1"


@pytest.mark.unit
def test_authentication_responses_cannot_be_cached() -> None:
    client = APIClient()
    for path in ("csrf", "me"):
        response = client.get(f"/api/v1/auth/{path}/")
        assert "no-store" in response.get("Cache-Control", "")


@pytest.mark.django_db
def test_database_rejects_case_variant_email_even_outside_registration() -> None:
    User.objects.create_user(email="database-identity@example.com", password=PASSWORD)
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.bulk_create([User(email="DATABASE-IDENTITY@EXAMPLE.COM")])
    assert User.objects.filter(email__iexact="database-identity@example.com").count() == 1


@pytest.mark.django_db
def test_registration_validates_password_similarity_to_email() -> None:
    with pytest.raises(ValidationError, match="similar"):
        register_user(email="mountainwaterfall@example.com", password="mountainwaterfall")
    assert not User.objects.filter(email="mountainwaterfall@example.com").exists()


@pytest.mark.django_db(transaction=True)
def test_concurrent_case_variant_registration_has_one_winner_and_a_validation_error() -> None:
    barrier = Barrier(2)
    identity = f"race-{uuid4().hex}@example.com"

    def register(email: str) -> str:
        close_old_connections()
        try:
            serializer = UserRegistrationSerializer(data={"email": email, "password": PASSWORD})
            assert serializer.is_valid(), serializer.errors
            barrier.wait(timeout=30)
            try:
                serializer.save()
            except Exception as exc:
                from rest_framework.exceptions import ValidationError as APIValidationError

                assert isinstance(exc, APIValidationError), type(exc).__name__
                assert "email" in exc.detail
                return "duplicate"
            return "created"
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=2) as workers:
        results = list(workers.map(register, [identity, identity.upper()]))
    assert sorted(results) == ["created", "duplicate"]
    assert User.objects.filter(email__iexact=identity).count() == 1


@pytest.mark.django_db
def test_real_session_rotation_csrf_logout_expiry_and_no_privilege_assignment() -> None:
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/csrf/")
    csrf = client.cookies["csrftoken"].value
    password = f" {PASSWORD} "
    response = client.post(
        "/api/v1/auth/register/",
        {
            "email": "session-security@example.com",
            "password": password,
            "is_superuser": True,
            "is_staff": True,
        },
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
    )
    assert response.status_code == 201
    user = User.objects.get(email="session-security@example.com")
    assert user.check_password(password)
    assert not user.is_superuser and not user.is_staff
    anonymous_session = client.session
    anonymous_session["prelogin"] = "rotation-marker"
    anonymous_session.save()
    client.cookies["sessionid"] = anonymous_session.session_key
    previous_key = anonymous_session.session_key
    payload = {"email": user.email, "password": password}
    assert client.post("/api/v1/auth/login/", payload, format="json").status_code == 403
    with override_settings(SESSION_COOKIE_SECURE=True, CSRF_COOKIE_SECURE=True):
        login = client.post("/api/v1/auth/login/", payload, format="json", HTTP_X_CSRFTOKEN=csrf)
    assert login.status_code == 200
    current_key = client.cookies["sessionid"].value
    assert current_key != previous_key
    assert not Session.objects.filter(session_key=previous_key).exists()
    assert client.cookies["csrftoken"].value != csrf
    assert login.cookies["sessionid"]["secure"]
    assert login.cookies["sessionid"]["httponly"]
    assert login.cookies["sessionid"]["samesite"] == "Lax"
    assert login.cookies["csrftoken"]["secure"]
    assert client.get("/api/v1/auth/me/").json()["id"] == user.pk
    assert client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=csrf).status_code == 403
    csrf = client.cookies["csrftoken"].value
    assert client.post("/api/v1/auth/logout/", HTTP_X_CSRFTOKEN=csrf).status_code == 204
    assert not Session.objects.filter(session_key=current_key).exists()
    client.cookies["sessionid"] = current_key
    assert client.get("/api/v1/auth/me/").status_code == 401
    client.get("/api/v1/auth/csrf/")
    login = client.post(
        "/api/v1/auth/login/",
        payload,
        format="json",
        HTTP_X_CSRFTOKEN=client.cookies["csrftoken"].value,
    )
    assert login.status_code == 200
    Session.objects.filter(session_key=client.cookies["sessionid"].value).update(
        expire_date=timezone.now() - timedelta(seconds=1)
    )
    assert client.get("/api/v1/auth/me/").status_code == 401
