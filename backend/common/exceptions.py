"""Custom uniform exception handler for Django REST Framework."""

from __future__ import annotations

import logging
from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("kivo.api")


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

    # Unhandled 500 server error — mask internal details from client
    view = context.get("view")
    view_name = view.__class__.__name__ if view else "UnknownView"
    logger.exception("Unhandled server error in %s: %s", view_name, exc)

    return Response(
        {
            "error": {
                "status_code": status.HTTP_500_INTERNAL_SERVER_ERROR,
                "type": "internal_server_error",
                "message": "An internal server error occurred. Please try again later.",
            }
        },
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
