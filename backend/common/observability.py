"""Request correlation and structured logs without request bodies or credentials."""

from __future__ import annotations

import json
import logging
from collections.abc import Callable
from contextvars import ContextVar
from datetime import UTC, datetime
from uuid import UUID, uuid4

from django.http import HttpRequest, HttpResponse

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
        for field in ("user_id", "resource_id", "operation", "method", "path", "status_code"):
            if hasattr(record, field):
                payload[field] = getattr(record, field)
        if record.exc_info and record.exc_info[0] is not None:
            payload["exception_class"] = record.exc_info[0].__name__
        return json.dumps(payload, default=str)


class RequestCorrelationMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        try:
            request_id = str(UUID(request.headers.get("X-Request-ID", "")))
        except (ValueError, AttributeError):
            request_id = str(uuid4())
        token = request_id_context.set(request_id)
        try:
            response = self.get_response(request)
            response["X-Request-ID"] = request_id
            logger.info(
                "http_request",
                extra={
                    "method": request.method,
                    "path": request.path,
                    "status_code": response.status_code,
                    "user_id": getattr(getattr(request, "user", None), "pk", None),
                },
            )
            return response
        finally:
            request_id_context.reset(token)
