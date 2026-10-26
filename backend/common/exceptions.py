"""Custom uniform exception handler for Django REST Framework."""

from __future__ import annotations

import logging
from typing import Any

from django.core.exceptions import SuspiciousOperation
from django.db import InterfaceError, OperationalError, connection
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.views.csrf import csrf_failure as django_csrf_failure
from rest_framework.response import Response
from rest_framework.views import exception_handler, set_rollback

from common.database_failure import failure_fields

logger = logging.getLogger("kivo.api")


def server_error_data(status_code: int) -> dict[str, Any]:
    """Do not imply that a failed response proves a financial write rolled back."""
    return {
        "error": {
            "status_code": status_code,
            "type": "database_unavailable" if status_code == 503 else "internal_server_error",
            "message": (
                "The service could not complete this response. For a financial write, "
                "retry only with the same Idempotency-Key and identical request body."
            ),
        }
    }


def csrf_failure(request: HttpRequest, reason: str = "") -> HttpResponse:
    """Keep anonymous CSRF failures in the API's safe JSON error contract."""
    if not request.path.startswith("/api/"):
        return django_csrf_failure(request, reason=reason)
    return JsonResponse(
        {
            "error": {
                "status_code": 403,
                "type": "permission_denied",
                "details": {"detail": "CSRF verification failed."},
            }
        },
        status=403,
    )


def kivo_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Standardized API exception handler.

    Formats all client-facing errors into a predictable JSON envelope:
    {
        "error": {
            "status_code": 400,
            "type": "invalid_request",
            "message": "Detailed message or field validation map",
            "details": {...}
        }
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_type = "validation_error" if response.status_code == 400 else "api_error"
        if response.status_code == 401:
            error_type = "authentication_required"
        elif response.status_code == 403:
            error_type = "permission_denied"
        elif response.status_code == 404:
            error_type = "not_found"

        custom_data = {
            "error": {
                "status_code": response.status_code,
                "type": error_type,
                "details": response.data,
            }
        }
        response.data = custom_data
        return response

    # Mark ATOMIC_REQUESTS rollback before converting an exception to a response.
    set_rollback()
    if isinstance(exc, SuspiciousOperation):
        return Response(
            {
                "error": {
                    "status_code": 400,
                    "type": "invalid_request",
                    "message": "Invalid request.",
                }
            },
            status=400,
        )
    # Neither exception text nor traceback is safe for arbitrary log handlers:
    # database errors may contain SQL parameters or credentials.
    view = context.get("view")
    view_name = view.__class__.__name__ if view else "UnknownView"
    logger.error(
        "request_failed",
        extra={
            "view": view_name,
            "exception_class": type(exc).__name__,
            **(
                failure_fields(exc, connection)
                if isinstance(exc, (OperationalError, InterfaceError))
                else {}
            ),
        },
    )

    code = 503 if isinstance(exc, (OperationalError, InterfaceError)) else 500
    return Response(server_error_data(code), status=code)
