"""Custom authentication classes for Kivo API."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import SessionAuthentication

if TYPE_CHECKING:
    from rest_framework.request import Request


class KivoSessionAuthentication(SessionAuthentication):
    """Enforces standard HTTP 401 Unauthorized on unauthenticated requests.

    RFC 7235 requires a WWW-Authenticate header when responding with 401 Unauthorized.
    DRF converts NotAuthenticated into 403 Forbidden unless authenticate_header is provided.
    """

    def authenticate_header(self, request: Request) -> str:
        """Return authentication scheme for the WWW-Authenticate response header."""
        return "Session"


class KivoSessionScheme(OpenApiAuthenticationExtension):
    """OpenAPI documentation extension mapping KivoSessionAuthentication to cookieAuth."""

    target_class = "common.authentication.KivoSessionAuthentication"
    name = "cookieAuth"

    def get_security_definition(self, auto_schema: Any) -> dict[str, str]:
        """Return OpenAPI security scheme specification for session cookie."""
        return {
            "type": "apiKey",
            "in": "cookie",
            "name": "sessionid",
        }
