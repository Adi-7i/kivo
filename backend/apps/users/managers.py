"""Custom User Manager for email-based authentication."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.contrib.auth.models import BaseUserManager

if TYPE_CHECKING:
    from apps.users.models import User


class UserManager(BaseUserManager["User"]):
    """Custom manager for User model with email as unique identifier."""

    @classmethod
    def normalize_email(cls, email: str | None) -> str:
        """Use the same canonical identity for registration, admin and services."""
        return super().normalize_email(email).strip().lower()

    def get_by_natural_key(self, username: str | None) -> User:
        """Look up user by email in a case-insensitive manner."""
        return self.get(**{f"{self.model.USERNAME_FIELD}__iexact": username})

    def create_user(
        self,
        email: str,
        password: str | None = None,
        **extra_fields: Any,
    ) -> User:
        """Create and save a regular user with the given email and password."""
        if not email:
            raise ValueError("The Email field must be provided.")

        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)

        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()

        user.save(using=self._db)
        return user

    def create_superuser(
        self,
        email: str,
        password: str | None = None,
        **extra_fields: Any,
    ) -> User:
        """Create and save a superuser with the given email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")
        if not password:
            raise ValueError("Superuser must have a password.")

        return self.create_user(email, password, **extra_fields)
