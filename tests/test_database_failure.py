"""Failure classification preserves useful evidence without leaking driver text."""

from __future__ import annotations

import json
from types import SimpleNamespace

import pytest
from common.database_failure import failure_fields
from psycopg import OperationalError
from psycopg_pool import PoolTimeout


@pytest.mark.unit
def test_pool_timeout_is_distinct_and_pool_statistics_are_allowlisted() -> None:
    wrapper = SimpleNamespace(
        alias="default",
        connection=None,
        _connection_pools={
            "default": SimpleNamespace(
                get_stats=lambda: {
                    "pool_max": 4,
                    "pool_available": 0,
                    "requests_errors": 2,
                    "conninfo": "postgresql://private:credential@private.test/postgres",
                }
            )
        },
    )
    error = OperationalError("private SQL parameters")
    error.__cause__ = PoolTimeout("private connection information")
    fields = failure_fields(error, wrapper)
    assert fields["database_failure_kind"] == "pool_acquisition"
    assert fields["driver_exception_class"] == "PoolTimeout"
    assert fields["database_pool_stats"] == {
        "pool_max": 4,
        "pool_available": 0,
        "requests_errors": 2,
    }
    assert "private" not in json.dumps(fields)


@pytest.mark.unit
@pytest.mark.parametrize(
    "message,kind",
    [
        ("SSL SYSCALL error: EOF detected", "tls_eof"),
        ("connection timed out", "tcp_timeout"),
        ("server closed the connection unexpectedly", "connection_closed"),
        ("password=private SELECT private", "unclassified"),
    ],
)
def test_transport_classification_never_emits_arbitrary_error_text(message: str, kind: str) -> None:
    wrapper = SimpleNamespace(alias="default", connection=SimpleNamespace(broken=True, closed=True))
    fields = failure_fields(OperationalError(message), wrapper)
    assert fields["database_failure_kind"] == kind
    assert fields["database_connection_broken"] is True
    assert message not in json.dumps(fields)
