"""Bounded database failure metadata; never emit driver messages or SQL values."""

from __future__ import annotations

import re
import socket
import struct
import sys
from typing import Any


def tcp_snapshot(wrapper: Any) -> dict[str, int] | None:
    """Read Linux TCP counters from an existing socket, without peer addresses."""
    if sys.platform != "linux":
        return None
    try:
        descriptor = wrapper.connection.pgconn.socket
        # fromfd duplicates the descriptor; closing this observer leaves libpq intact.
        with socket.fromfd(descriptor, socket.AF_INET6, socket.SOCK_STREAM) as observer:
            values = struct.unpack_from(
                "=24I", observer.getsockopt(socket.IPPROTO_TCP, socket.TCP_INFO, 104), 8
            )
        return {
            "rtt_us": values[15],
            "rttvar_us": values[16],
            "unacked": values[4],
            "lost": values[6],
            "total_retrans": values[23],
        }
    except (AttributeError, OSError, ValueError, struct.error):
        return None


def failure_fields(exc: Exception, wrapper: Any) -> dict[str, Any]:
    """Separate pool acquisition, transport and PostgreSQL errors without secrets.

    Inspect only an existing connection/pool; diagnostics must not open a new
    connection or change the error response/transaction outcome.
    """
    chain: list[BaseException] = []
    current: BaseException | None = exc
    while current is not None and len(chain) < 5 and current not in chain:
        chain.append(current)
        current = current.__cause__
    driver = chain[-1]
    sqlstate = getattr(driver, "sqlstate", None)
    message = str(driver).lower()
    categories = (
        ("pool_acquisition", type(driver).__name__ == "PoolTimeout"),
        (
            "tls_eof",
            "ssl syscall error: eof" in message or "ssl connection has been closed" in message,
        ),
        ("connection_closed", "server closed the connection" in message),
        ("tcp_timeout", "connection timed out" in message or "timeout expired" in message),
        ("connection_refused", "connection refused" in message),
        (
            "network_unreachable",
            "network is unreachable" in message or "no route to host" in message,
        ),
        ("broken_pipe", "broken pipe" in message),
    )
    result: dict[str, Any] = {
        "driver_exception_class": type(driver).__name__,
        "database_failure_kind": next(
            (name for name, matched in categories if matched), "unclassified"
        ),
    }
    if isinstance(sqlstate, str) and re.fullmatch(r"[0-9A-Z]{5}", sqlstate):
        result["database_sqlstate"] = sqlstate
    raw = getattr(wrapper, "connection", None)
    if raw is not None:
        result["database_connection_broken"] = bool(getattr(raw, "broken", False))
        result["database_connection_closed"] = bool(getattr(raw, "closed", False))
    pools = getattr(wrapper, "_connection_pools", {})
    pool = pools.get(wrapper.alias)
    if pool is not None:
        stats = pool.get_stats()
        result["database_pool_stats"] = {
            key: stats[key]
            for key in (
                "pool_min",
                "pool_max",
                "pool_size",
                "pool_available",
                "requests_waiting",
                "requests_num",
                "requests_queued",
                "requests_errors",
                "requests_wait_ms",
                "connections_num",
                "connections_errors",
                "connections_lost",
                "connections_ms",
                "returns_bad",
            )
            if key in stats and type(stats[key]) is int
        }
    return result
