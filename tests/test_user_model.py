"""Tests for custom User model, manager behavior, and password hashing."""

from __future__ import annotations

import pytest
from apps.users.models import User
from django.contrib.auth import get_user_model


@pytest.mark.unit
class TestUserModelConfiguration:
    """Verify custom User model properties and Django auth integration."""

    def test_get_user_model_returns_custom_user(self) -> None:
        """get_user_model() must resolve to our custom User class."""
        assert get_user_model() is User

    def test_username_field_is_email(self) -> None:
        """Primary identity field must be email with no required fields."""
        assert User.USERNAME_FIELD == "email"
        assert User.REQUIRED_FIELDS == []

    def test_user_string_representation(self) -> None:
        """str(user) must return the email address."""
        user = User(email="kivo.user@example.com")
        assert str(user) == "kivo.user@example.com"

    def test_user_email_normalization(self) -> None:
        """Email domain must be normalized to lowercase upon clean()."""
        user = User(email="student@EXAMPLE.COM")
        user.clean()
        assert user.email == "student@example.com"


@pytest.mark.unit
class TestPasswordHashing:
    """Ensure password hashing adheres to Django cryptographic standards."""

    def test_password_is_hashed_not_plaintext(self) -> None:
        """Password must never be stored as plaintext."""
        user = User(email="secure@example.com")
        raw_password = "SuperSecretPassword123!"
        user.set_password(raw_password)

        assert user.password != raw_password
        assert user.password.startswith("pbkdf2_sha256$") or user.password.startswith("argon2$")
        assert user.check_password(raw_password) is True
        assert user.check_password("WrongPassword") is False

    def test_unusable_password(self) -> None:
        """Users created without password have unusable password flag."""
        user = User(email="nopass@example.com")
        user.set_unusable_password()
        assert user.has_usable_password() is False
        assert user.check_password("") is False


@pytest.mark.unit
class TestUserManagerValidation:
    """Verify custom UserManager business rule validations."""

    def test_create_user_without_email_raises_value_error(self) -> None:
        """Attempting to create user with empty email must raise ValueError."""
        with pytest.raises(ValueError, match="The Email field must be provided"):
            User.objects.create_user(email="")

    def test_create_superuser_validation_flags(self) -> None:
        """Superuser requires is_staff=True, is_superuser=True, and password."""
        with pytest.raises(ValueError, match="Superuser must have is_staff=True"):
            User.objects.create_superuser(email="admin@example.com", password="pwd", is_staff=False)

        with pytest.raises(ValueError, match="Superuser must have is_superuser=True"):
            User.objects.create_superuser(email="admin@example.com", password="pwd", is_superuser=False)

        with pytest.raises(ValueError, match="Superuser must have a password"):
            User.objects.create_superuser(email="admin@example.com", password=None)
