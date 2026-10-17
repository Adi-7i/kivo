"""Actual PostgreSQL row-lock serialization for report consistency and budget retries."""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from queue import Queue
from threading import Barrier
from typing import Any

import pytest
from apps.ledger.models import WriteReceipt
from apps.ledger.services import create_event
from apps.reports.models import Budget, BudgetChange
from apps.reports.selectors import summary_for
from apps.reports.services import consistent_read, save_budget
from apps.users.models import User
from django.db import close_old_connections, connection
from rest_framework.exceptions import ValidationError

from tests.test_ledger import ledger as ledger


@pytest.mark.django_db(transaction=True)
def test_report_read_blocks_concurrent_financial_write_and_is_consistent(
    ledger: dict[str, Any],
) -> None:
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
                key="concurrent-report-receipt",
                data={
                    "kind": "receipt",
                    "amount_paise": 100000,
                    "effective_date": date(2025, 10, 16),
                    "account": ledger["cash"].id,
                    "title": "Concurrent receipt",
                    "funding_source": "Family",
                },
            )
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=1) as pool:
        with consistent_read(ledger["user"]):
            before = summary_for(ledger["user"], {"period": "all"})
            future = pool.submit(receive)
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
            assert blocked, "Financial writer must wait for this report's owner lock"
            during = summary_for(ledger["user"], {"period": "all"})
            assert before["external_income"] == during["external_income"] == 0
        future.result(timeout=60)
    assert summary_for(ledger["user"], {"period": "all"})["external_income"] == 100000


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("same_key", [True, False])
def test_concurrent_budgets_do_not_duplicate_scope_or_audit(
    ledger: dict[str, Any], same_key: bool
) -> None:
    barrier = Barrier(2)

    def create(index: int) -> str:
        close_old_connections()
        try:
            owner = User.objects.get(pk=ledger["user"].pk)
            barrier.wait(timeout=30)
            try:
                _, replayed = save_budget(
                    user=owner,
                    key="budget-same" if same_key else f"budget-{index}",
                    data={
                        "name": "October",
                        "category": None,
                        "period_type": "monthly",
                        "period_start": date(2025, 10, 1),
                        "period_end": date(2025, 10, 31),
                        "limit_paise": 100000,
                        "warning_percent": 80,
                        "archived": False,
                    },
                )
                return "replayed" if replayed else "created"
            except ValidationError:
                return "overlap"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(create, (1, 2)))
    assert sorted(results) == sorted(["created", "replayed" if same_key else "overlap"])
    assert Budget.objects.filter(user=ledger["user"]).count() == 1
    assert BudgetChange.objects.filter(budget__user=ledger["user"]).count() == 1
    assert WriteReceipt.objects.filter(user=ledger["user"]).count() == 1
