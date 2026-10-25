"""Loopback-only development verification runner; no backend settings/schema changes.

A bounded HTTP worker pool avoids single-thread request queue starvation. Every
request releases its thread-local Django connection. With the opt-in development
pool, release returns the healthy socket for reuse, avoiding a TLS handshake on
every request. Django's session/CSRF middleware and financial services are unchanged.
"""

from __future__ import annotations

import os
import socket
import sys
from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

from django.conf import settings  # noqa: E402
from django.core.servers.basehttp import WSGIRequestHandler, WSGIServer  # noqa: E402
from django.core.wsgi import get_wsgi_application  # noqa: E402
from django.db import connections  # noqa: E402


class VerificationServer(WSGIServer):
    """Four concurrent requests, with normal Django HTTP connection closing."""

    request_queue_size = 32

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        self.workers = ThreadPoolExecutor(max_workers=4, thread_name_prefix="kivo-dev-http")
        super().__init__(*args, **kwargs)

    def process_request(self, request: socket.socket, client_address: tuple[str, int]) -> None:
        self.workers.submit(self.finish_scoped_request, request, client_address)

    def finish_scoped_request(
        self, request: socket.socket, client_address: tuple[str, int]
    ) -> None:
        try:
            self.finish_request(request, client_address)
        except Exception:
            self.handle_error(request, client_address)
        finally:
            try:
                connections.close_all()
            finally:
                self.shutdown_request(request)

    def server_close(self) -> None:
        self.workers.shutdown(wait=True)
        for connection in connections.all():
            connection.close_pool()
        super().server_close()


def main() -> None:
    if os.environ.get("KIVO_ALLOW_DEV_TEST_RECORDS") != "1":
        raise RuntimeError("Explicit approved-development verification opt-in is required.")
    if (
        settings.SETTINGS_MODULE != "config.settings.development"
        or settings.DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql"
        or settings.DATABASES["default"]["NAME"] != "postgres"
    ):
        raise RuntimeError("This runner requires the approved development PostgreSQL settings.")
    django_application = get_wsgi_application()

    def application(environ: dict[str, Any], start_response: Callable[..., Any]) -> Iterable[bytes]:
        # The pool is concurrent even though we deliberately do not use ThreadingMixIn
        # (Django then closes each HTTP connection instead of retaining idle sockets).
        environ["wsgi.multithread"] = True
        return django_application(environ, start_response)

    with VerificationServer(("127.0.0.1", 8000), WSGIRequestHandler) as server:
        server.set_app(application)
        print(
            "Kivo verification: loopback HTTP, four workers, per-request DB release; "
            f"bounded pool={bool(settings.DATABASES['default']['OPTIONS'].get('pool'))}.",
            flush=True,
        )
        with suppress(KeyboardInterrupt):
            server.serve_forever()


if __name__ == "__main__":
    main()
