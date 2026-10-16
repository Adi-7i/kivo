"""Business logic services for user management and authentication."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from apps.users.models import User

if TYPE_CHECKING:
    from django.http import HttpRequest

logger = logging.getLogger("kivo.auth")


def register_user(
    *,
    email: str,
    password: str,
    name: str = "",
) -> User:
    """Register a new user account atomically with password hashing and validation.

    Args:
        email: Unique email address of the user.
        password: Raw password string conforming to security standards.
        name: Optional display name for the user.

    Returns:
        The newly created User instance.

    Raises:
        DjangoValidationError: If email or password validation fails.
    """
    clean_email = User.objects.normalize_email(email).strip().lower()
    if not clean_email:
        raise DjangoValidationError({"email": "Email address is required."})

    if User.objects.filter(email__iexact=clean_email).exists():
        raise DjangoValidationError({"email": "A user with this email address already exists."})

    # Validate password against configured Django validators
    validate_password(password)

    clean_name = name.strip() if name else ""

    with transaction.atomic():
        user = User.objects.create_user(
            email=clean_email,
            password=password,
            name=clean_name,
        )
        logger.info("New user account registered successfully with id=%s", user.id)

    return user


def authenticate_user(
    request: HttpRequest | None,
    *,
    email: str,
    password: str,
) -> User | None:
    """Authenticate user credentials safely without leaking timing or account existence.

    Args:
        request: The incoming HTTP request context for session binding.
        email: Email identifier for the user.
        password: Plaintext password provided by the user.

    Returns:
        Authenticated User instance if valid and active, else None.
    """
    clean_email = email.strip()
    if not clean_email or not password:
        return None

    user = authenticate(request=request, email=clean_email, password=password)
    if user is not None:
        if not user.is_active:
            logger.warning("Authentication failed: inactive user id=%s", user.id)
            return None
        logger.info("User authenticated successfully with id=%s", user.id)
        return user

    logger.warning("Authentication failed for provided credentials.")
    return None
