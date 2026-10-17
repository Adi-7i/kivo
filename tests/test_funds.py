"""Actual PostgreSQL funding, API, correction, audit, isolation and failure tests."""

from __future__ import annotations

from datetime import date
from typing import Any

import pytest
from apps.funds.models import AllocationRun, BatchCapacity, FundingBatch
from apps.funds.services import check_attribution, rebuild_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Event, Posting
from apps.users.models import User
from django.db import IntegrityError, connection, transaction
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event, reconcile, summary


def batches(ledger: dict[str, Any]) -> list[dict[str, Any]]:
    response = ledger["client"].get("/api/v1/funds/batches/")
    assert response.status_code == 200, response.data
    return response.json()["results"]


@pytest.mark.django_db
def test_postgres_fifo_scenario_a_and_source_journey_contracts(ledger: dict[str, Any]) -> None:
    for amount in ("1000.00", "500.00"):
        assert post_event(ledger, "receipt", amount).status_code == 201
    expense = post_event(ledger, "expense", "1200.00")
    assert expense.status_code == 201, expense.data
    rows = batches(ledger)
    assert [(row["allocated_amount"], row["remaining_capacity"]) for row in rows] == [
        ("1000.00", "0.00"),
        ("200.00", "300.00"),
    ]
    assert all(row["policy_version"] == "account-fifo-v2" for row in rows)
    allocations = (
        ledger["client"]
        .get(f"/api/v1/funds/allocations/?transaction={expense.json()['id']}")
        .json()
    )
    assert allocations["count"] == 2
    assert {row["batch"] for row in allocations["results"]} == {row["id"] for row in rows}
    journey = ledger["client"].get(f"/api/v1/funds/batches/{rows[0]['id']}/journey/").json()
    assert journey["results"][0]["transaction"] == expense.json()["id"]
    breakdown = ledger["client"].get(f"/api/v1/funds/batches/{rows[0]['id']}/breakdown/").json()
    assert breakdown["results"][0]["net_expense"] == "1000.00"
    assert breakdown["results"][0]["category"] == str(ledger["category"].id)
    check_attribution(ledger["user"])
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_postgres_fifo_scenario_b_exact_exhaustion_and_inclusive_duration(
    ledger: dict[str, Any],
) -> None:
    post_event(ledger, "receipt", "1000.00")
    post_event(ledger, "expense", "200.00", effective_date="2025-10-17")
    partial = batches(ledger)[0]
    assert partial["remaining_capacity"] == "800.00"
    assert partial["exhausted_on"] is None and partial["elapsed_calendar_days"] is None
    assert post_event(ledger, "expense", "800.00", effective_date="2025-10-21").status_code == 201
    depleted = batches(ledger)[0]
    assert depleted["remaining_capacity"] == "0.00"
    assert depleted["exhausted_on"] == "2025-10-21"
    assert depleted["elapsed_calendar_days"] == 6
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_postgres_fifo_scenario_c_transfer_preserves_source_and_capacity(
    ledger: dict[str, Any],
) -> None:
    receipt = post_event(ledger, "receipt", "1000.00", account=str(ledger["bank"].id)).json()
    assert (
        post_event(
            ledger,
            "transfer",
            "1000.00",
            account=str(ledger["bank"].id),
            destination=str(ledger["cash"].id),
        ).status_code
        == 201
    )
    moved = batches(ledger)[0]
    assert moved["allocated_amount"] == "0.00" and moved["remaining_capacity"] == "1000.00"
    assert moved["exhausted_on"] is None
    assert summary(ledger)["liquid_balance"] == "1000.00"
    assert post_event(ledger, "expense", "250.00").status_code == 201
    spent = batches(ledger)[0]
    assert len(batches(ledger)) == 1
    assert spent["source_event"] == receipt["id"]
    assert spent["remaining_capacity"] == "750.00"
    assert spent["positions"] == [{"account": str(ledger["cash"].id), "amount": "750.00"}]
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_backdating_corrections_and_reversals_recompute_without_erasing_prior_runs(
    ledger: dict[str, Any],
) -> None:
    post_event(ledger, "receipt", "1000.00")
    post_event(ledger, "receipt", "500.00", effective_date="2025-10-18")
    expense = post_event(ledger, "expense", "1200.00", effective_date="2025-10-19").json()["id"]
    original_rows = batches(ledger)
    old_run = AllocationRun.objects.get(public_id=original_rows[0]["run_id"])
    assert post_event(ledger, "receipt", "200.00", effective_date="2025-10-14").status_code == 201
    revised = batches(ledger)
    assert [row["allocated_amount"] for row in revised] == ["200.00", "1000.00", "0.00"]
    old_rows = (
        ledger["client"].get(f"/api/v1/funds/batches/?run={old_run.public_id}").json()["results"]
    )
    old_capacities = [
        row["allocated_amount"] for row in old_rows if row["allocated_amount"] is not None
    ]
    assert old_capacities == ["1000.00", "200.00"]
    replacement = ledger["client"].post(
        f"/api/v1/transactions/{expense}/correct/",
        {
            "kind": "expense",
            "amount": "1100.00",
            "account": str(ledger["cash"].id),
            "category": str(ledger["category"].id),
            "effective_date": "2025-10-19",
            "title": "Corrected",
            "reason": "Typo",
        },
        format="json",
        HTTP_IDEMPOTENCY_KEY="correction",
    )
    assert replacement.status_code == 201, replacement.data
    assert [row["allocated_amount"] for row in batches(ledger)] == ["200.00", "900.00", "0.00"]
    reverse = ledger["client"].post(
        f"/api/v1/transactions/{replacement.json()['id']}/reverse/",
        {"reason": "Canceled"},
        format="json",
        HTTP_IDEMPOTENCY_KEY="reversal",
    )
    assert reverse.status_code == 201, reverse.data
    assert all(row["allocated_amount"] == "0.00" for row in batches(ledger))
    assert old_run.capacities.get(batch__source__amount_paise=50000).allocated_paise == 20000
    assert AllocationRun.objects.filter(user=ledger["user"]).count() == 6
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_refund_restores_original_batches_and_never_becomes_new_income(
    ledger: dict[str, Any],
) -> None:
    post_event(ledger, "receipt", "1000.00")
    post_event(ledger, "receipt", "500.00")
    expense = post_event(ledger, "expense", "1200.00").json()["id"]
    assert (
        post_event(
            ledger, "refund", "300.00", original_expense=expense, effective_date="2025-10-17"
        ).status_code
        == 201
    )
    rows = batches(ledger)
    assert len(rows) == 2
    assert [(row["allocated_amount"], row["remaining_capacity"]) for row in rows] == [
        ("900.00", "100.00"),
        ("0.00", "500.00"),
    ]
    assert rows[0]["exhausted_on"] is None
    assert summary(ledger) == {
        "liquid_balance": "600.00",
        "personal_expense": "900.00",
        "external_receipts": "1500.00",
    }
    detail = (
        ledger["client"].get(f"/api/v1/funds/batches/{rows[0]['id']}/breakdown/").json()["results"]
    )
    assert [row["net_expense"] for row in detail] == ["1000.00", "-100.00"]
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_fund_isolation_immutable_snapshots_and_overflow_constraints(
    ledger: dict[str, Any],
) -> None:
    receipt = post_event(ledger, "receipt", "100.00").json()["id"]
    row = batches(ledger)[0]
    other = User.objects.create_user(email="other-funds@example.com")
    client = APIClient()
    client.force_authenticate(other)
    assert client.get("/api/v1/funds/batches/").json()["count"] == 0
    for suffix in ("", "journey/", "breakdown/"):
        assert client.get(f"/api/v1/funds/batches/{row['id']}/{suffix}").status_code == 404
    assert client.get(f"/api/v1/funds/summary/?run={row['run_id']}").status_code == 404
    assert client.get(f"/api/v1/funds/allocations/?transaction={receipt}").status_code == 404
    assert ledger["client"].post("/api/v1/funds/batches/", {}, format="json").status_code == 405
    assert APIClient().get("/api/v1/funds/batches/").status_code == 401
    assert ledger["client"].get("/api/v1/funds/summary/?run=invalid").status_code == 400
    batch = FundingBatch.objects.get(pk=row["id"])
    with pytest.raises(IntegrityError), transaction.atomic():
        BatchCapacity.objects.filter(batch=batch).update(allocated_paise=10001)
    with pytest.raises(IntegrityError), transaction.atomic():
        run = AllocationRun.objects.create(
            user=ledger["user"],
            policy_version="account-fifo-v1",
            input_hash="0" * 64,
            status="complete",
        )
        BatchCapacity.objects.create(
            run=run, batch=batch, original_paise=10000, allocated_paise=10001, remaining_paise=-1
        )
    with pytest.raises(IntegrityError), transaction.atomic():
        run = AllocationRun.objects.create(
            user=other, policy_version="account-fifo-v1", input_hash="0" * 64, status="complete"
        )
        BatchCapacity.objects.create(
            run=run, batch=batch, original_paise=10000, allocated_paise=0, remaining_paise=10000
        )
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_legacy_unfunded_history_is_explicit_and_has_no_invented_exhaustion(
    ledger: dict[str, Any],
) -> None:
    post_event(ledger, "receipt", "1000.00")
    # Simulate balanced imported legacy history bypassing the application solvency service.
    event = Event.objects.create(
        user=ledger["user"],
        kind="expense",
        amount_paise=110000,
        account=ledger["cash"],
        category=ledger["category"],
        effective_date=date(2025, 10, 21),
        title="Legacy shortfall",
    )
    Posting.objects.bulk_create(
        [
            Posting(event=event, account=ledger["cash"], book="liquid", amount_paise=-110000),
            Posting(event=event, book="expense", amount_paise=110000),
        ]
    )
    run = rebuild_attribution(user=ledger["user"], strict=False)
    assert run.status == "incomplete"
    status = ledger["client"].get("/api/v1/funds/summary/").json()
    assert status["unfunded_amount"] == "100.00"
    assert status["attribution_status"] == "incomplete"
    row = batches(ledger)[0]
    assert row["remaining_capacity"] == "0.00"
    assert row["exhausted_on"] is None and row["elapsed_calendar_days"] is None
    with pytest.raises(FinancialConflict):
        rebuild_attribution(user=ledger["user"])
    with pytest.raises(FinancialConflict):
        check_attribution(ledger["user"])
    assert summary(ledger)["liquid_balance"] == "-100.00"
    assert post_event(ledger, "expense", "1.00", effective_date="2025-10-22").status_code == 409


@pytest.mark.django_db
def test_retry_does_not_duplicate_batches_runs_or_allocations(ledger: dict[str, Any]) -> None:
    first = post_event(ledger, "receipt", "1000.00", key="same")
    replay = post_event(ledger, "receipt", "1000.00", key="same")
    assert (first.status_code, replay.status_code) == (201, 200)
    assert FundingBatch.objects.count() == AllocationRun.objects.count() == 1
    post_event(ledger, "expense", "120.00", key="spend")
    current = AllocationRun.objects.latest("id")
    assert post_event(ledger, "expense", "120.00", key="spend").status_code == 200
    assert AllocationRun.objects.count() == 2 and current.allocations.count() == 1
    with connection.cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_source_corrections_and_voids_keep_old_batches_traceable(ledger: dict[str, Any]) -> None:
    receipt = post_event(ledger, "receipt", "1000.00").json()["id"]
    expense = post_event(ledger, "expense", "100.00").json()["id"]
    original = batches(ledger)[0]
    response = ledger["client"].post(
        f"/api/v1/transactions/{receipt}/correct/",
        {
            "kind": "receipt",
            "amount": "1200.00",
            "account": str(ledger["cash"].id),
            "effective_date": "2025-10-16",
            "title": "Correct source",
            "funding_source": "Family",
            "reason": "Typo",
        },
        format="json",
        HTTP_IDEMPOTENCY_KEY="source-correction",
    )
    assert response.status_code == 201, response.data
    rows = batches(ledger)
    inactive = next(row for row in rows if row["id"] == original["id"])
    active = next(row for row in rows if row["source_event"] == response.json()["id"])
    assert inactive["attribution_status"] == "inactive" and inactive["remaining_capacity"] is None
    assert active["allocated_amount"] == "100.00" and active["remaining_capacity"] == "1100.00"
    for target in (expense, response.json()["id"]):
        result = ledger["client"].post(
            f"/api/v1/transactions/{target}/void/",
            {"reason": "Canceled"},
            format="json",
            HTTP_IDEMPOTENCY_KEY=target,
        )
        assert result.status_code == 201, result.data
    assert all(
        row["attribution_status"] == "inactive" and row["exhausted_on"] is None
        for row in batches(ledger)
    )
    assert summary(ledger)["liquid_balance"] == "0.00"
    check_attribution(ledger["user"])
