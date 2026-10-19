"""Rate throttling classes for user authentication endpoints."""

from __future__ import annotations

from rest_framework.request import Request
from rest_framework.throttling import SimpleRateThrottle
from rest_framework.views import APIView


class AuthenticationRateThrottle(SimpleRateThrottle):
    """Bound authentication attempts by peer IP, including logged-in callers.

    Process-local cache limits are best effort; the ingress must enforce a
    shared limit and normalize the peer address before forwarding requests.
    """

    def get_cache_key(self, request: Request, view: APIView) -> str:
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class LoginRateThrottle(AuthenticationRateThrottle):
    """Throttle rate limiting for user login requests."""

    scope = "login"


class RegisterRateThrottle(AuthenticationRateThrottle):
    """Throttle rate limiting for user registration requests."""

    scope = "register"
