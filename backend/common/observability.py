"""Request correlation and structured logs without request bodies or credentials."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from contextlib import ExitStack
from contextvars import ContextVar
from datetime import UTC, datetime
from time import perf_counter_ns
from uuid import UUID, uuid4

from django.db import connections
from django.http import HttpRequest, HttpResponse, JsonResponse
from django.utils.cache import patch_cache_control

from common.database_timing import DatabaseTiming
from common.exceptions import server_error_data

request_id_context: ContextVar[str] = ContextVar("request_id", default="-")
logger = logging.getLogger("kivo.http")


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.fromtimestamp(record.created, UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": request_id_context.get(),
        }
        for field in (
            "user_id",
            "resource_id",
            "operation",
            "method",
            "path",
            "status_code",
            "exception_class",
            "view",
            "duration_ms",
            "db_query_count",
            "db_duration_ms",
            "db_max_query_ms",
            "db_backend_pids",
            "database_alias",
            "database_backend_pid",
        ):
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception_class"] = record.exc_info[0].__name__
        return json.dumps(payload, default=str)


class RequestCorrelationMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        started = perf_counter_ns()
        try:
            request_id = str(UUID(request.headers.get("X-Request-ID", "")))
        except (ValueError, AttributeError):
            request_id = str(uuid4())
        token = request_id_context.set(request_id)
        try:
            timing = DatabaseTiming()
            # Constructing a backend wrapper does not open a connection. Probes
            # stay independent of DB/session availability. Streaming iteration
            # happens later and is deliberately outside preparation timing.
            with ExitStack() as stack:
                for alias in connections:
                    stack.enter_context(connections[alias].execute_wrapper(timing))
                response = self.get_response(request)
            if request.path.startswith("/api/"):
                # Middleware failures (e.g. session persistence) are outside DRF.
                if response.status_code >= 400 and not response.get("Content-Type", "").startswith(
                    "application/json"
                ):
                    code = response.status_code
                    data = (
                        server_error_data(code)
                        if code >= 500
                        else {
                            "error": {
                                "status_code": code,
                                "type": {
                                    400: "invalid_request",
                                    401: "authentication_required",
                                    403: "permission_denied",
                                    404: "not_found",
                                }.get(code, "api_error"),
                                "details": {"detail": "The API request could not be completed."},
                            }
                        }
                    )
                    # Preserve cookies/security/protocol headers while replacing
                    # body-specific metadata from Django's HTML error response.
                    cookies = response.cookies
                    headers = {
                        name: value
                        for name, value in response.items()
                        if name.lower()
                        not in {
                            "content-type",
                            "content-length",
                            "content-encoding",
                            "etag",
                            "last-modified",
                        }
                    }
                    response = JsonResponse(data, status=code, headers=headers)
                    response.cookies = cookies
                patch_cache_control(response, private=True, no_store=True)
            response["X-Request-ID"] = request_id
            logger.info(
                "http_request",
                extra={
                    "method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    # AuthenticationMiddleware populates this only after an
                    # actual auth lookup. Logging must never load a lazy session.
                    "user_id": getattr(getattr(request, "_cached_user", None), "pk", None),
                    "duration_ms": (perf_counter_ns() - started) // 1_000_000,
                    **timing.fields(),
                },
            )
            return response
        finally:
            request_id_context.reset(token)
