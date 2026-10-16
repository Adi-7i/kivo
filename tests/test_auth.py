"""Comprehensive tests for user registration, authentication, session lifecycle, and security."""

from __future__ import annotations

import types

import pytest
from apps.users.models import User
from apps.users.permissions import IsOwner, IsSelf
from django.core.cache import cache
from django.middleware.csrf import get_token
from django.test import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient

VALID_PASSWORD = "CorrectPassword123!"
WEAK_PASSWORD_SHORT = "short1!"
WEAK_PASSWORD_COMMON = "password1234"
WEAK_PASSWORD_NUMERIC = "123456789012"


@pytest.fixture(autouse=True)
def clear_throttle_cache() -> None:
    """Clear in-memory cache between tests to prevent throttling leakage."""
    cache.clear()


@pytest.mark.django_db
class TestUserRegistration:
    """Test user registration endpoint validations and behavior."""

    def test_registration_success(self, api_client: APIClient) -> None:
        """Registering with valid data returns 201 and safe profile without password."""
        payload = {
            "email": "newuser@example.com",
            "name": "New User",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["name"] == "New User"
        assert "id" in data
        assert "date_joined" in data
        assert "password" not in data

        user = User.objects.get(email="newuser@example.com")
        assert user.check_password(VALID_PASSWORD) is True
        assert user.password != VALID_PASSWORD

    def test_registration_blank_name_allowed(self, api_client: APIClient) -> None:
        """Name is optional and defaults to empty string."""
        payload = {
            "email": "noname@example.com",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["name"] == ""

    def test_registration_duplicate_email_rejected(self, api_client: APIClient) -> None:
        """Registering an existing email returns 400 validation error."""
        User.objects.create_user(email="existing@example.com", password=VALID_PASSWORD)

        payload = {
            "email": "existing@example.com",
            "name": "Duplicate User",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        body = response.json()
        assert body["error"]["type"] == "validation_error"

    def test_registration_case_insensitive_duplicate_email(self, api_client: APIClient) -> None:
        """Email uniqueness check must be strictly case-insensitive."""
        User.objects.create_user(email="alice@example.com", password=VALID_PASSWORD)

        payload = {
            "email": "ALICE@EXAMPLE.COM",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_missing_email_rejected(self, api_client: APIClient) -> None:
        """Registration without email returns 400 validation error."""
        payload = {
            "name": "No Email",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_missing_password_rejected(self, api_client: APIClient) -> None:
        """Registration without password returns 400 validation error."""
        payload = {
            "email": "nopass@example.com",
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_weak_password_min_length(self, api_client: APIClient) -> None:
        """Passwords shorter than 10 characters are rejected."""
        payload = {
            "email": "shortpwd@example.com",
            "password": WEAK_PASSWORD_SHORT,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_weak_password_entirely_numeric(self, api_client: APIClient) -> None:
        """Entirely numeric passwords are rejected."""
        payload = {
            "email": "numeric@example.com",
            "password": WEAK_PASSWORD_NUMERIC,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_registration_weak_password_common(self, api_client: APIClient) -> None:
        """Common passwords are rejected."""
        payload = {
            "email": "commonpwd@example.com",
            "password": WEAK_PASSWORD_COMMON,
        }
        response = api_client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogin:
    """Test login endpoint credential verification and session generation."""

    def test_login_success(self, api_client: APIClient) -> None:
        """Valid credentials return 200, user profile, and session cookie."""
        User.objects.create_user(
            email="loginuser@example.com",
            password=VALID_PASSWORD,
            name="Login User",
        )

        payload = {
            "email": "loginuser@example.com",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/login/", payload, format="json")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "loginuser@example.com"
        assert data["name"] == "Login User"
        assert "sessionid" in response.cookies

    def test_login_case_insensitive_email(self, api_client: APIClient) -> None:
        """User can log in using mixed-case email."""
        User.objects.create_user(
            email="caseuser@example.com",
            password=VALID_PASSWORD,
        )

        payload = {
            "email": "CASEUSER@EXAMPLE.COM",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/login/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK

    def test_login_wrong_password_rejected(self, api_client: APIClient) -> None:
        """Invalid password returns 400 error."""
        User.objects.create_user(
            email="wrongpwd@example.com",
            password=VALID_PASSWORD,
        )

        payload = {
            "email": "wrongpwd@example.com",
            "password": "IncorrectPassword999!",
        }
        response = api_client.post("/api/v1/auth/login/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "sessionid" not in response.cookies

    def test_login_nonexistent_email_rejected(self, api_client: APIClient) -> None:
        """Nonexistent email returns 400 error."""
        payload = {
            "email": "ghost@example.com",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/login/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_inactive_user_rejected(self, api_client: APIClient) -> None:
        """Inactive user account cannot authenticate."""
        user = User.objects.create_user(
            email="inactive@example.com",
            password=VALID_PASSWORD,
        )
        user.is_active = False
        user.save()

        payload = {
            "email": "inactive@example.com",
            "password": VALID_PASSWORD,
        }
        response = api_client.post("/api/v1/auth/login/", payload, format="json")
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestUserLogout:
    """Test session termination and cookie invalidation."""

    def test_logout_authenticated_success(self, api_client: APIClient) -> None:
        """Authenticated user can log out, receiving 204 No Content."""
        user = User.objects.create_user(
            email="logoutuser@example.com",
            password=VALID_PASSWORD,
        )
        api_client.force_login(user)

        response = api_client.post("/api/v1/auth/logout/")
        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Subsequent authenticated endpoint must be denied
        me_response = api_client.get("/api/v1/auth/me/")
        assert me_response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_unauthenticated_rejected(self, api_client: APIClient) -> None:
        """Unauthenticated user calling logout receives 401 Unauthorized."""
        response = api_client.post("/api/v1/auth/logout/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestCurrentUserProfile:
    """Test /me/ endpoint access and data protection."""

    def test_me_authenticated_returns_profile(self, api_client: APIClient) -> None:
        """Authenticated user receives their own public profile."""
        user = User.objects.create_user(
            email="meuser@example.com",
            name="Me User",
            password=VALID_PASSWORD,
        )
        api_client.force_login(user)

        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == user.id
        assert data["email"] == "meuser@example.com"
        assert data["name"] == "Me User"

    def test_me_never_exposes_internal_credentials(self, api_client: APIClient) -> None:
        """Internal fields (password, is_staff, is_superuser, groups) are never exposed."""
        user = User.objects.create_superuser(
            email="adminuser@example.com",
            name="Admin User",
            password=VALID_PASSWORD,
        )
        api_client.force_login(user)

        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        forbidden_keys = [
            "password",
            "is_staff",
            "is_superuser",
            "is_active",
            "groups",
            "user_permissions",
        ]
        for key in forbidden_keys:
            assert key not in data

    def test_me_unauthenticated_returns_401(self, api_client: APIClient) -> None:
        """Anonymous access to /me/ returns 401."""
        response = api_client.get("/api/v1/auth/me/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.json()["error"]["type"] == "authentication_required"


@pytest.mark.django_db
class TestDataIsolation:
    """Test strict multi-user boundary isolation."""

    def test_two_users_isolated(self) -> None:
        """User A and User B only ever see their own profile data."""
        user_a = User.objects.create_user(
            email="usera@example.com",
            name="User A",
            password=VALID_PASSWORD,
        )
        user_b = User.objects.create_user(
            email="userb@example.com",
            name="User B",
            password=VALID_PASSWORD,
        )

        client_a = APIClient()
        client_a.force_login(user_a)

        client_b = APIClient()
        client_b.force_login(user_b)

        res_a = client_a.get("/api/v1/auth/me/")
        res_b = client_b.get("/api/v1/auth/me/")

        assert res_a.json()["id"] == user_a.id
        assert res_a.json()["email"] == "usera@example.com"

        assert res_b.json()["id"] == user_b.id
        assert res_b.json()["email"] == "userb@example.com"

    def test_me_ignores_client_supplied_user_id(self) -> None:
        """Passing another user's ID in query or payload does not leak other user's data."""
        user_a = User.objects.create_user(
            email="attacker@example.com",
            name="Attacker",
            password=VALID_PASSWORD,
        )
        user_b = User.objects.create_user(
            email="victim@example.com",
            name="Victim",
            password=VALID_PASSWORD,
        )

        client = APIClient()
        client.force_login(user_a)

        response = client.get(f"/api/v1/auth/me/?user_id={user_b.id}&id={user_b.id}")
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["id"] == user_a.id
        assert response.json()["email"] == user_a.email


@pytest.mark.django_db
class TestSecurityAndCSRF:
    """Test CSRF protection, cookie attributes, and session fixation defense."""

    def test_csrf_cookie_endpoint(self, api_client: APIClient) -> None:
        """GET /api/v1/auth/csrf/ attaches csrftoken cookie."""
        response = api_client.get("/api/v1/auth/csrf/")
        assert response.status_code == status.HTTP_200_OK
        assert "csrftoken" in response.cookies

    def test_register_enforces_csrf_when_configured(self) -> None:
        """When CSRF enforcement is active, POST without CSRF token is rejected with 403."""
        client = APIClient(enforce_csrf_checks=True)
        payload = {
            "email": "csrfcheck@example.com",
            "password": VALID_PASSWORD,
        }
        response = client.post("/api/v1/auth/register/", payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_register_succeeds_with_valid_csrf(self) -> None:
        """When CSRF cookie and X-CSRFToken header are provided, registration succeeds."""
        client = APIClient(enforce_csrf_checks=True)
        rf = RequestFactory()
        req = rf.get("/api/v1/auth/csrf/")
        token = get_token(req)

        client.cookies["csrftoken"] = token
        payload = {
            "email": "csrfsuccess@example.com",
            "password": VALID_PASSWORD,
        }
        response = client.post(
            "/api/v1/auth/register/",
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == status.HTTP_201_CREATED

    def test_login_enforces_csrf_when_configured(self) -> None:
        """When CSRF enforcement is active, POST login without CSRF token returns 403."""
        User.objects.create_user(email="csrflg@example.com", password=VALID_PASSWORD)
        client = APIClient(enforce_csrf_checks=True)
        payload = {
            "email": "csrflg@example.com",
            "password": VALID_PASSWORD,
        }
        response = client.post("/api/v1/auth/login/", payload, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_login_succeeds_with_valid_csrf(self) -> None:
        """When CSRF cookie and header are provided, login succeeds."""
        User.objects.create_user(email="csrfvalid@example.com", password=VALID_PASSWORD)
        client = APIClient(enforce_csrf_checks=True)
        rf = RequestFactory()
        req = rf.get("/api/v1/auth/csrf/")
        token = get_token(req)

        client.cookies["csrftoken"] = token
        payload = {
            "email": "csrfvalid@example.com",
            "password": VALID_PASSWORD,
        }
        response = client.post(
            "/api/v1/auth/login/",
            payload,
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        assert response.status_code == status.HTTP_200_OK

    def test_session_cookie_attributes(self, api_client: APIClient) -> None:
        """Session cookies must be marked HttpOnly and SameSite=Lax."""
        User.objects.create_user(email="cookieuser@example.com", password=VALID_PASSWORD)
        response = api_client.post(
            "/api/v1/auth/login/",
            {"email": "cookieuser@example.com", "password": VALID_PASSWORD},
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        session_cookie = response.cookies["sessionid"]
        assert session_cookie["httponly"] is True
        assert session_cookie["samesite"] == "Lax"


@pytest.mark.django_db
class TestThrottling:
    """Verify rate-limiting behavior for authentication endpoints."""

    def test_login_rate_limiting(self, api_client: APIClient) -> None:
        """More than 5 login attempts per minute from same IP are throttled (HTTP 429)."""
        cache.clear()
        payload = {
            "email": "throttled@example.com",
            "password": "WrongPassword123!",
        }
        statuses: list[int] = []
        for _ in range(7):
            res = api_client.post("/api/v1/auth/login/", payload, format="json")
            statuses.append(res.status_code)

        assert status.HTTP_429_TOO_MANY_REQUESTS in statuses


@pytest.mark.unit
class TestCustomPermissions:
    """Test custom permission classes."""

    def test_is_owner_permission(self) -> None:
        """IsOwner verifies ownership of object's 'user' attribute."""
        perm = IsOwner()
        user_1 = User(id=1, email="u1@example.com")
        user_2 = User(id=2, email="u2@example.com")

        rf = RequestFactory()
        req = rf.get("/")
        req.user = user_1

        obj_owned = types.SimpleNamespace(user=user_1)
        obj_other = types.SimpleNamespace(user=user_2)

        view = types.SimpleNamespace()

        assert perm.has_object_permission(req, view, obj_owned) is True
        assert perm.has_object_permission(req, view, obj_other) is False

    def test_is_self_permission(self) -> None:
        """IsSelf allows matching user and denies other user."""
        perm = IsSelf()
        user_1 = User(id=1, email="u1@example.com")
        user_2 = User(id=2, email="u2@example.com")

        rf = RequestFactory()
        req = rf.get("/")
        req.user = user_1

        view = types.SimpleNamespace()

        assert perm.has_object_permission(req, view, user_1) is True
        assert perm.has_object_permission(req, view, user_2) is False


@pytest.mark.django_db
@pytest.mark.integration
class TestEndToEndAuthFlow:
    """Test full registration, login, profile retrieval, logout lifecycle."""

    def test_full_authentication_lifecycle(self) -> None:
        """Full lifecycle: Register -> Login -> Me -> Logout -> Denied."""
        client = APIClient()

        # 1. Register new user
        reg_payload = {
            "email": "lifecycle@example.com",
            "name": "Lifecycle Tester",
            "password": VALID_PASSWORD,
        }
        reg_res = client.post("/api/v1/auth/register/", reg_payload, format="json")
        assert reg_res.status_code == status.HTTP_201_CREATED
        user_id = reg_res.json()["id"]

        # 2. Login to obtain session
        login_payload = {
            "email": "lifecycle@example.com",
            "password": VALID_PASSWORD,
        }
        login_res = client.post("/api/v1/auth/login/", login_payload, format="json")
        assert login_res.status_code == status.HTTP_200_OK
        assert "sessionid" in client.cookies

        # 3. Access current profile via /me/
        me_res = client.get("/api/v1/auth/me/")
        assert me_res.status_code == status.HTTP_200_OK
        assert me_res.json()["id"] == user_id
        assert me_res.json()["name"] == "Lifecycle Tester"

        # 4. Logout
        logout_res = client.post("/api/v1/auth/logout/")
        assert logout_res.status_code == status.HTTP_204_NO_CONTENT

        # 5. Accessing /me/ now must fail with 401
        denied_res = client.get("/api/v1/auth/me/")
        assert denied_res.status_code == status.HTTP_401_UNAUTHORIZED
