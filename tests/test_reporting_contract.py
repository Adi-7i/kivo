"""Regression gaps identified against the governing Suite/PRD requirements."""

from __future__ import annotations

import csv
import io
import json
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from apps.ledger.history import HistoryQuerySerializer
from apps.ledger.services import DEFAULT_CATEGORIES
from apps.reports.serializers import BreakdownQuerySerializer
from apps.users.models import User
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event


@pytest.mark.unit
def test_history_accepts_exact_inclusive_amount_bounds() -> None:
    serializer = HistoryQuerySerializer(data={"amount_min": "40.00", "amount_max": "60.00"})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["amount_min_paise"] == 4000
    assert serializer.validated_data["amount_max_paise"] == 6000


@pytest.mark.unit
@pytest.mark.parametrize(
    "data",
    [
        {"amount_min": "60.01", "amount_max": "60.00"},
        {"amount_min": "1e2"},
        {"amount_max": "1.001"},
        {"amount_min": "-1.00"},
    ],
)
def test_amount_filters_reject_invalid_precision_and_ranges(data: dict[str, str]) -> None:
    serializer = HistoryQuerySerializer(data=data)
    assert not serializer.is_valid()


@pytest.mark.unit
def test_spending_breakdown_supports_transaction_kind() -> None:
    serializer = BreakdownQuerySerializer(data={"dimension": "kind"})
    assert serializer.is_valid(), serializer.errors


@pytest.mark.unit
def test_default_categories_cover_groceries_social_and_utilities() -> None:
    assert {"Groceries", "Friends & Social", "Utilities & Recharge"} <= set(DEFAULT_CATEGORIES)


@pytest.mark.unit
def test_csv_response_has_portability_metadata() -> None:
    client = APIClient()
    client.force_authenticate(User(id=123, email="export-metadata@example.com"))
    response = client.get("/api/v1/reports/export/?period=month")
    try:
        assert response["X-Kivo-Export-Timezone"] == "Asia/Kolkata"
        assert response["X-Kivo-Export-Generated-At"]
        assert json.loads(response["X-Kivo-Export-Filters"])["period"] == "month"
    finally:
        response.close()


@pytest.mark.django_db
def test_amount_filters_and_kind_breakdown_reconcile_with_ledger_and_csv(
    ledger: dict[str, Any],
) -> None:
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    expenses = []
    for amount in ("20.00", "40.00", "60.00"):
        created = post_event(ledger, "expense", amount)
        assert created.status_code == 201
        expenses.append(created.json())
    assert (
        post_event(ledger, "refund", "10.00", original_expense=expenses[0]["id"]).status_code == 201
    )
    client = ledger["client"]
    filters = {"period": "all", "amount_min": "40.00", "amount_max": "60.00"}
    history = client.get("/api/v1/transactions/", filters)
    assert history.status_code == 200
    assert {row["id"] for row in history.json()["results"]} == {row["id"] for row in expenses[1:]}
    summary = client.get("/api/v1/reports/summary/", filters)
    assert summary.status_code == 200
    assert summary.json()["personal_expense"] == "100.00"
    assert summary.json()["transaction_count"] == 2
    exported = client.get("/api/v1/reports/export/", filters)
    assert exported.status_code == 200
    rows = list(
        csv.DictReader(io.StringIO(b"".join(exported.streaming_content).decode("utf-8-sig")))
    )
    assert {row["transaction_id"] for row in rows} == {row["id"] for row in expenses[1:]}
    assert sum(Decimal(row["net_expense_inr"]) for row in rows) == Decimal("100.00")
    boundary = client.get("/api/v1/transactions/", {**filters, "amount_max": "40.00"})
    assert [row["id"] for row in boundary.json()["results"]] == [expenses[1]["id"]]
    kinds = client.get("/api/v1/reports/breakdown/", {"period": "all", "dimension": "kind"})
    assert kinds.status_code == 200
    assert {row["key"]: row["amount"] for row in kinds.json()["results"]} == {
        "expense": "120.00",
        "refund": "-10.00",
    }
    assert client.get("/api/v1/reports/summary/?period=all").json()["personal_expense"] == "110.00"
    for path in ("transactions/", "reports/summary/", "reports/export/"):
        assert (
            client.get(
                f"/api/v1/{path}", {"amount_min": "40.01", "amount_max": "40.00"}
            ).status_code
            == 400
        )


@pytest.mark.django_db
def test_export_freezes_calendar_filter_before_streaming_starts(
    ledger: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    assert post_event(ledger, "expense", "10.00").status_code == 201
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: date(2025, 10, 31))
    response = ledger["client"].get("/api/v1/reports/export/?period=month")
    assert response["X-Kivo-Export-Date-From"] == "2025-10-01"
    assert response["X-Kivo-Export-Date-To"] == "2025-10-31"
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: date(2025, 11, 1))
    rows = list(
        csv.DictReader(io.StringIO(b"".join(response.streaming_content).decode("utf-8-sig")))
    )
    assert len(rows) == 2
    assert sum(Decimal(row["net_expense_inr"]) for row in rows) == Decimal("10.00")
