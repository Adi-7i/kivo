"""Real PostgreSQL connection and streaming cleanup failure boundaries."""

from __future__ import annotations

import socket
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from queue import Queue
from typing import Any

import pytest
from apps.ledger.selectors import financial_summary
from apps.ledger.services import create_event
from apps.users.models import User
from django.db import close_old_connections, connection, connections

from tests.test_ledger import ledger as ledger


@pytest.mark.django_db(transaction=True)
def test_real_postgresql_socket_bounds_dead_peers_without_timing_out_healthy_queries() -> None:
    """Actual Linux transport options, not a raised HTTP/SQL timeout or mock DB."""
    connection.ensure_connection()
    raw = connection.connection
    with socket.fromfd(raw.pgconn.socket, socket.AF_INET6, socket.SOCK_STREAM) as transport:
        assert transport.getsockopt(socket.SOL_SOCKET, socket.SO_KEEPALIVE) == 1
        for name, expected in (
            ("TCP_KEEPIDLE", 5),
            ("TCP_KEEPINTVL", 5),
            ("TCP_KEEPCNT", 3),
            ("TCP_USER_TIMEOUT", 10000),
        ):
            assert transport.getsockopt(socket.IPPROTO_TCP, getattr(socket, name)) == expected
    started = time.monotonic()
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_sleep(12), 1")
        assert cursor.fetchone()[1] == 1
    assert time.monotonic() - started >= 12
    assert not raw.closed


@pytest.mark.django_db(transaction=True)
def test_closed_idle_postgresql_connection_is_reopened_before_the_next_query() -> None:
    """Close a real socket; no mocked cursor or retry of a financial write."""
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_backend_pid()")
        previous_pid = cursor.fetchone()[0]
    previous_connection = connection.connection
    assert connection.settings_dict["CONN_HEALTH_CHECKS"] is True
    previous_connection.close()
    connection.health_check_done = False
    with connection.cursor() as cursor:
        cursor.execute("SELECT pg_backend_pid(), 1")
        current_pid, result = cursor.fetchone()
    assert result == 1
    assert current_pid != previous_pid
    assert connection.connection is not previous_connection


@pytest.mark.django_db(transaction=True)
def test_closing_csv_stream_releases_owner_lock_for_a_real_financial_write(
    ledger: dict[str, Any],
) -> None:
    response = ledger["client"].get("/api/v1/reports/export/?period=all")
    assert response.status_code == 200
    assert next(iter(response.streaming_content)).startswith(b"\xef\xbb\xbf")
    backend: Queue[int] = Queue()

    def receive() -> None:
        close_old_connections()
        try:
            owner = User.objects.get(pk=ledger["user"].pk)
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                backend.put(cursor.fetchone()[0])
            create_event(
                user=owner,
                key="after-csv-close",
                data={
                    "kind": "receipt",
                    "amount_paise": 10000,
                    "effective_date": date(2025, 10, 16),
                    "account": ledger["cash"].pk,
                    "title": "Write after stream close",
                    "funding_source": "Explicit receipt",
                },
            )
        finally:
            connections.close_all()

    with ThreadPoolExecutor(max_workers=1) as workers:
        future = workers.submit(receive)
        try:
            writer_pid = backend.get(timeout=30)
            blocked = False
            deadline = time.monotonic() + 20
            while time.monotonic() < deadline:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT pg_backend_pid()=ANY(pg_blocking_pids(%s))", [writer_pid]
                    )
                    blocked = cursor.fetchone()[0]
                if blocked:
                    break
                time.sleep(0.05)
            assert blocked and not future.done()
        finally:
            response.close()
        future.result(timeout=60)
    assert financial_summary(ledger["user"])["liquid_balance"] == 10000
