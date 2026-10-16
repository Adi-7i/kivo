"""Tests for DRF exception handling and error serialization."""

from __future__ import annotations

import pytest
from common.exceptions import kivo_exception_handler
from rest_framework import exceptions, status
from rest_framework.views import APIView


@pytest.mark.unit
class TestKivoExceptionHandler:
    """Verify consistent JSON error response formatting."""

    def test_handles_validation_error(self) -> None:
        """DRF ValidationError formatted with type 'validation_error'."""
        exc = exceptions.ValidationError({"email": ["Enter a valid email address."]})
        context = {"view": APIView()}
        response = kivo_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.data
        assert "error" in data
        assert data["error"]["status_code"] == 400
        assert data["error"]["type"] == "validation_error"
        assert "email" in data["error"]["details"]

    def test_handles_not_authenticated(self) -> None:
        """DRF NotAuthenticated formatted with type 'authentication_required'."""
        exc = exceptions.NotAuthenticated()
        context = {"view": APIView()}
        response = kivo_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert response.data["error"]["type"] == "authentication_required"

    def test_handles_permission_denied(self) -> None:
        """DRF PermissionDenied formatted with type 'permission_denied'."""
        exc = exceptions.PermissionDenied()
        context = {"view": APIView()}
        response = kivo_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert response.data["error"]["type"] == "permission_denied"

    def test_handles_not_found(self) -> None:
        """DRF NotFound formatted with type 'not_found'."""
        exc = exceptions.NotFound()
        context = {"view": APIView()}
        response = kivo_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert response.data["error"]["type"] == "not_found"

    def test_masks_unhandled_500_exception(self) -> None:
        """Raw Python exceptions produce sanitized 500 without internal tracebacks."""
        exc = RuntimeError("Database connection string leaked: postgresql://secret@host/db")
        context = {"view": APIView()}
        response = kivo_exception_handler(exc, context)

        assert response is not None
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        data = response.data
        assert data["error"]["status_code"] == 500
        assert data["error"]["type"] == "internal_server_error"
        assert "secret" not in data["error"]["message"]
