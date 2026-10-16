"""Rate throttling classes for user authentication endpoints."""

from __future__ import annotations

from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    """Throttle rate limiting for user login requests."""

    scope = "login"


class RegisterRateThrottle(AnonRateThrottle):
    """Throttle rate limiting for user registration requests."""

    scope = "register"
