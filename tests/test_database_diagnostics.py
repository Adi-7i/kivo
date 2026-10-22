"""Diagnostic secrecy and actual PostgreSQL reserve-lock failure boundaries."""

from __future__ import annotations

import io
import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor
from queue import Queue
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

import pytest
from apps.ledger.models import WriteReceipt
from apps.sharing.models import RentReserve, ReserveChange
from apps.users.models import User
from common.database_timing import DatabaseTiming
from common.observability import JsonFormatter
from common.runtime_role import role_statements
from django.apps import apps
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection, connections, transaction
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_rent import generate, plan


@pytest.mark.unit
def test_slow_query_metrics_never_retain_sql_parameters_or_exception_text(
    monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture
) -> None:
    clock = iter((0, 1_100_000_000))
    monkeypatch.setattr("common.database_timing.perf_counter_ns", lambda: next(clock))
    timing = DatabaseTiming()
    backend = SimpleNamespace(
        alias="default", connection=SimpleNamespace(info=SimpleNamespace(backend_pid=123))
    )

    def fail(*args: Any) -> None:
        backend.connection.info.backend_pid = 0
        raise RuntimeError("secret-password-sentinel")

    with (
        caplog.at_level(logging.WARNING, logger="kivo.database"),
        pytest.raises(RuntimeError, match="secret-password-sentinel"),
    ):
        timing(
            fail,
            "SELECT private-financial-sentinel",
            ["password-value"],
            False,
            {"connection": backend},
        )
    assert timing.fields() == {
        "db_query_count": 1,
        "db_duration_ms": 1100,
        "db_max_query_ms": 1100,
        "db_backend_pids": [123],
    }
    rendered = " ".join(JsonFormatter().format(record) for record in caplog.records)
    assert "database_query_slow" in rendered
    assert all(
        secret not in rendered
        for secret in ("secret-password-sentinel", "private-financial-sentinel", "password-value")
    )
    assert all(record.exc_info is None for record in caplog.records)
    assert not hasattr(timing, "sql") and not hasattr(timing, "params")


@pytest.mark.unit
def test_runtime_plan_denies_journal_mutation_and_privilege_escalation() -> None:
    statements = role_statements(
        role="kivo_probe",
        administrator="postgres",
        database="test_kivo_phase07",
        tables=["users", "django_session", "ledger_event", "ledger_posting", "django_migrations"],
        sequences=["users_id_seq"],
    )
    sql = ";\n".join(statements)
    assert "NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS" in sql
    assert 'GRANT UPDATE (password, last_login) ON public."users"' in sql
    assert "NOT is_staff AND NOT is_superuser" in sql
    assert 'GRANT DELETE ON public."django_session"' in sql
    assert 'GRANT USAGE ON SEQUENCE public."users_id_seq"' in sql
    for table in ("ledger_event", "ledger_posting", "django_migrations"):
        assert not any(
            f'ON public."{table}"' in statement
            and statement.startswith(("GRANT UPDATE", "GRANT DELETE", "GRANT TRUNCATE"))
            for statement in statements
        )
    assert not any(
        statement.startswith("GRANT INSERT") and '"django_migrations"' in statement
        for statement in statements
    )
    assert "OWNER TO" not in sql and "PASSWORD" not in sql and "GRANT ALL" not in sql


@pytest.mark.unit
@pytest.mark.parametrize(
    "role", ["anon", "postgres", "kivo_x;DROP ROLE postgres", "kivo_" + "x" * 60]
)
def test_runtime_plan_rejects_unsafe_role_identifiers(role: str) -> None:
    with pytest.raises(ValueError):
        role_statements(
            role=role,
            administrator="postgres",
            database="test_kivo_phase07",
            tables=[],
            sequences=[],
        )


@pytest.mark.unit
def test_new_tables_do_not_silently_gain_runtime_write_privileges() -> None:
    with pytest.raises(ValueError, match="explicit review"):
        role_statements(
            role="kivo_probe",
            administrator="postgres",
            database="test_kivo_phase07",
            tables=["future_sensitive_table"],
            sequences=[],
        )


@pytest.mark.unit
def test_diagnostic_invalid_samples_stop_before_network_access() -> None:
    with patch("socket.getaddrinfo") as resolve, pytest.raises(CommandError):
        call_command("diagnose_database", samples=0)
    resolve.assert_not_called()


@pytest.mark.unit
def test_role_rehearsal_requires_explicit_flag_before_connecting() -> None:
    with patch.object(connection, "ensure_connection") as connect, pytest.raises(CommandError):
        call_command("rehearse_database_runtime", test_database="test_kivo_phase07")
    connect.assert_not_called()


@pytest.mark.unit
def test_security_gate_rejects_callable_helpers_even_when_other_gates_pass() -> None:
    # Unit fault injection only. The separately executed remote audit records
    # the actual role/grants; this isolates a previously missing security gate.
    names = sorted(
        {model._meta.db_table for model in apps.get_models(include_auto_created=True)}
        | {"django_migrations"}
    )
    tables = [(index, name, True, False, False) for index, name in enumerate(names, start=1)]
    output = io.StringIO()
    with patch("common.management.commands.audit_database_security.connection.cursor") as factory:
        cursor = factory.return_value.__enter__.return_value
        cursor.fetchone.side_effect = [(True,), (0,)]
        cursor.fetchall.side_effect = [tables, [], [("kivo_expected_postings(bigint)",)]]
        with pytest.raises(CommandError, match="security gate"):
            call_command("audit_database_security", stdout=output)
    result = json.loads(output.getvalue().splitlines()[0])
    assert result["function_privacy_failures"] == ["kivo_expected_postings(bigint)"]
    assert result["administrative_roles_accessible"] == result["runtime_owned_tables"] == 0


@pytest.mark.django_db(transaction=True)
def test_reserve_lock_timeout_rolls_back_and_same_key_retries_are_durable(
    ledger: dict[str, Any],
    caplog: pytest.LogCaptureFixture,
) -> None:
    obligation = generate(ledger, plan(ledger))[0]
    payload = {
        "obligation": obligation["id"],
        "label": "Protected",
        "amount": "100.00",
        "reason": "Lock regression",
    }
    key = "reserve-after-lock-timeout"
    backend: Queue[int] = Queue()

    def write() -> Any:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SET lock_timeout='1500ms'")
                cursor.execute("SELECT pg_backend_pid()")
                backend.put(cursor.fetchone()[0])
            client = APIClient()
            client.force_authenticate(ledger["user"])
            return client.post(
                "/api/v1/rent/reserves/", payload, format="json", HTTP_IDEMPOTENCY_KEY=key
            )
        finally:
            connections.close_all()

    with (
        caplog.at_level(logging.INFO, logger="kivo.http"),
        ThreadPoolExecutor(max_workers=1) as workers,
        transaction.atomic(),
    ):
        User.objects.select_for_update().get(pk=ledger["user"].pk)
        future = workers.submit(write)
        pid = backend.get(timeout=30)
        blocked = False
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline and not future.done():
            with connection.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()=ANY(pg_blocking_pids(%s))", [pid])
                blocked = cursor.fetchone()[0]
            if blocked:
                break
        assert blocked, "Must observe the actual owner-row lock, not infer it from timing."
        response = future.result(timeout=20)
        assert response.status_code == 503
        assert response.json()["error"]["type"] == "database_unavailable"
    assert not RentReserve.objects.exists()
    assert not WriteReceipt.objects.filter(key=key).exists()
    records = [
        record
        for record in caplog.records
        if record.getMessage() == "http_request" and record.status_code == 503
    ]
    assert len(records) == 1 and records[0].db_max_query_ms >= 1500
    assert pid in records[0].db_backend_pids
    first = ledger["client"].post(
        "/api/v1/rent/reserves/", payload, format="json", HTTP_IDEMPOTENCY_KEY=key
    )
    assert first.status_code == 201, first.data
    # Discard the first result: the caller may not know a commit succeeded.
    resource_id = RentReserve.objects.get().pk
    repeat = ledger["client"].post(
        "/api/v1/rent/reserves/", payload, format="json", HTTP_IDEMPOTENCY_KEY=key
    )
    assert repeat.status_code == 200 and repeat.json()["id"] == str(resource_id)
    assert ReserveChange.objects.count() == WriteReceipt.objects.filter(key=key).count() == 1
    changed = {**payload, "amount": "101.00"}
    assert (
        ledger["client"]
        .post("/api/v1/rent/reserves/", changed, format="json", HTTP_IDEMPOTENCY_KEY=key)
        .status_code
        == 409
    )
    assert "password" not in json.dumps(response.json())
