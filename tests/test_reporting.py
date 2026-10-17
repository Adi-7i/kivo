"""Phase 6 behavior against the isolated PostgreSQL journal, with exact reconciliation."""

from __future__ import annotations

import csv
import io
from datetime import date
from decimal import Decimal
from typing import Any

import pytest
from apps.funds.services import check_attribution, rebuild_attribution
from apps.ledger.history import HistoryQuerySerializer, date_range, validate_query
from apps.ledger.models import Category, Event, Posting
from apps.ledger.services import _owner_lock, assert_fundable_history
from apps.reports.export import safe_cell
from apps.reports.models import Budget, BudgetChange
from apps.reports.selectors import budget_progresses
from apps.users.models import User
from django.db import IntegrityError, connection, transaction
from django.http import QueryDict
from django.test.utils import CaptureQueriesContext
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event, reconcile, summary
from tests.test_personal_finance import bill, contact, loan, settle
from tests.test_rent import generate, plan, write


def report(ledger: dict[str, Any], path: str = "summary", **params: Any) -> dict[str, Any]:
    response = ledger["client"].get(
        f"/api/v1/reports/{path}/", {"date_from": "2025-10-01", "date_to": "2025-10-31", **params}
    )
    assert response.status_code == 200, response.data
    return response.json()


def budget(ledger: dict[str, Any], limit: str = "1000.00", **kwargs: Any) -> dict[str, Any]:
    response = write(
        ledger,
        "budgets/",
        {
            "name": "October",
            "period_start": "2025-10-01",
            "period_end": "2025-10-31",
            "limit": limit,
            **kwargs,
        },
    )
    assert response.status_code == 201, response.data
    return response.json()


def dashboard(ledger: dict[str, Any]) -> dict[str, Any]:
    response = ledger["client"].get("/api/v1/dashboard/", {"period": "all"})
    assert response.status_code == 200, response.data
    return response.json()


@pytest.mark.unit
@pytest.mark.parametrize(
    "preset,expected",
    [
        ("today", ("2025-03-01", "2025-03-01")),
        ("yesterday", ("2025-02-28", "2025-02-28")),
        ("week", ("2025-02-24", "2025-03-02")),
        ("last_seven_days", ("2025-02-23", "2025-03-01")),
        ("month", ("2025-03-01", "2025-03-31")),
        ("previous_month", ("2025-02-01", "2025-02-28")),
        ("year", ("2025-01-01", "2025-12-31")),
    ],
)
def test_calendar_presets_are_distinct_and_exact(preset: str, expected: tuple[str, str]) -> None:
    assert (
        tuple(day.isoformat() for day in date_range({"period": preset}, date(2025, 3, 1)))
        == expected
    )
    assert date_range({"period": "previous_month"}, date(2024, 3, 1))[1] == date(2024, 2, 29)


@pytest.mark.unit
@pytest.mark.parametrize(
    "query",
    [
        "unexpected=1",
        "date_from=2025-10-02&date_to=2025-10-01",
        "date=2025-01-01&period=today",
        "date=bad",
        "sort=invalid",
        "kind=invalid",
        "page=0",
        "period=today&period=month",
        "sort=newest&ordering=created_at",
    ],
)
def test_strict_history_query_rejects_ambiguous_or_unsupported_inputs(query: str) -> None:
    with pytest.raises(ValidationError):
        validate_query(QueryDict(query), HistoryQuerySerializer)


@pytest.mark.unit
@pytest.mark.parametrize(
    "text",
    ["=SUM(A1)", " +1", "-1+2", "@IMPORT()", "\t=1", "\r=1", "\nformula", "\ufeff=1", "\x00=1"],
)
def test_csv_escapes_untrusted_formula_text(text: str) -> None:
    assert safe_cell(text) == "'" + text
    assert safe_cell("₹ Café, हिन्दी") == "₹ Café, हिन्दी"


@pytest.mark.django_db
def test_reporting_distinguishes_lending_expense_cash_and_transfers(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    assert (
        post_event(ledger, "transfer", "1000.00", destination=str(ledger["bank"].id)).status_code
        == 201
    )
    assert report(ledger)["personal_expense"] == "0.00"
    assert dashboard(ledger)["liquid_balance"] == "1000.00"
    assert (
        post_event(ledger, "expense", "800.00", account=str(ledger["bank"].id)).status_code == 201
    )
    lent = loan(ledger, person, "lend", "200.00", account=str(ledger["bank"].id))
    assert lent.status_code == 201, lent.data
    totals = report(ledger)
    assert (
        totals["personal_expense"],
        totals["external_income"],
        totals["lent"],
        totals["money_paid"],
        totals["internal_transfers"],
    ) == ("800.00", "1000.00", "200.00", "1000.00", "1000.00")
    current = dashboard(ledger)
    assert (current["liquid_balance"], current["receivables"], current["payables"]) == (
        "0.00",
        "200.00",
        "0.00",
    )
    assert settle(ledger, lent.json()["claims"][0], "100.00").status_code == 201
    borrowed = loan(ledger, person, "borrow", "500.00")
    assert borrowed.status_code == 201
    assert settle(ledger, borrowed.json()["claims"][0], "200.00").status_code == 201
    totals = report(ledger)
    assert (
        totals["personal_expense"],
        totals["external_income"],
        totals["borrowed"],
        totals["repayments_received"],
        totals["payable_settlements"],
    ) == ("800.00", "1000.00", "500.00", "100.00", "200.00")
    assert dashboard(ledger)["liquid_balance"] == "400.00"
    assert dashboard(ledger)["payables"] == "300.00"
    assert report(ledger)["principal_repaid"] == "200.00"
    reconcile(ledger["user"])
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_shared_recognition_and_reimbursement_reports_reconcile(ledger: dict[str, Any]) -> None:
    people = [contact(ledger, "Riya Owes"), contact(ledger, "Sam Owes")]
    assert post_event(ledger, "receipt", "6000.00").status_code == 201
    shared = bill(ledger, people, "6000.00")
    assert shared.status_code == 201, shared.data
    assert report(ledger)["personal_expense"] == "2000.00"
    assert report(ledger)["money_paid"] == "6000.00"
    assert report(ledger)["shared_advances"] == "4000.00"
    assert dashboard(ledger)["receivables"] == "4000.00"
    assert settle(ledger, shared.json()["event"]["claims"][0], "2000.00").status_code == 201
    assert report(ledger)["external_income"] == "6000.00"
    assert report(ledger)["personal_expense"] == "2000.00"
    friend_paid = bill(ledger, [people[0]], "1000.00", account=None, payer=people[0])
    assert friend_paid.status_code == 201, friend_paid.data
    assert report(ledger)["personal_expense"] == "2500.00"
    assert report(ledger)["shared_settlements_paid"] == "0.00"
    assert settle(ledger, friend_paid.json()["event"]["claims"][0], "500.00").status_code == 201
    assert report(ledger)["personal_expense"] == "2500.00"
    assert report(ledger)["shared_settlements_paid"] == "500.00"
    assert report(ledger, contact=people[0])["personal_expense"] == "2500.00"
    assert report(ledger, search='"Riya Owes"')["personal_expense"] == "2500.00"
    funds = ledger["client"].get("/api/v1/reports/funds/")
    assert funds.status_code == 200
    source = funds.json()["results"][0]
    assert source["original_amount"] == "6000.00"
    assert source["allocated_amount"] == "2500.00"
    assert source["remaining_capacity"] == "3500.00"
    assert source["expense_attributed"] == "2500.00"
    assert source["advanced_to_receivables"] == "4000.00"
    assert source["recovered_from_receivables"] == "2000.00"
    assert source["exhausted_on"] is None
    reconcile(ledger["user"])
    check_attribution(ledger["user"])


@pytest.mark.django_db
def test_unpaid_rent_reserves_and_actual_payment_dashboard(
    ledger: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: date(2025, 10, 16))
    assert post_event(ledger, "receipt", "3260.00").status_code == 201
    obligation = generate(ledger, plan(ledger))[0]
    reserve = write(
        ledger,
        "rent/reserves/",
        {
            "obligation": obligation["id"],
            "label": "Rent",
            "amount": "2000.00",
            "reason": "Set aside for rent",
        },
    )
    assert reserve.status_code == 201, reserve.data
    current = dashboard(ledger)
    assert (current["liquid_balance"], current["reserved"], current["safe_to_spend"]) == (
        "3260.00",
        "2000.00",
        "1260.00",
    )
    assert current["rent"]["upcoming_count"] == 1
    assert current["selected_period"]["personal_expense"] == "0.00"
    payment = write(
        ledger,
        f"rent/obligations/{obligation['id']}/payments/",
        {"amount": "500.00", "account": str(ledger["cash"].id), "effective_date": "2025-10-16"},
    )
    assert payment.status_code == 201, payment.data
    current = dashboard(ledger)
    assert (current["liquid_balance"], current["reserved"], current["safe_to_spend"]) == (
        "2760.00",
        "1500.00",
        "1260.00",
    )
    assert report(ledger)["personal_expense"] == "500.00"
    assert (
        write(
            ledger, f"rent/payments/{payment.json()['id']}/reverse/", {"reason": "Undo"}
        ).status_code
        == 201
    )
    current = dashboard(ledger)
    assert (current["liquid_balance"], current["reserved"], current["safe_to_spend"]) == (
        "3260.00",
        "2000.00",
        "1260.00",
    )
    assert report(ledger)["personal_expense"] == "0.00"


@pytest.mark.django_db
def test_budget_thresholds_zero_limits_archival_and_no_cash_effect(ledger: dict[str, Any]) -> None:
    row = budget(ledger)
    category_budget = budget(ledger, "0.00", category=str(ledger["category"].id))
    assert category_budget["utilization_percent"] is None
    assert category_budget["warning_state"] == "ok"
    assert summary(ledger)["liquid_balance"] == "0.00"
    assert post_event(ledger, "receipt", "2000.00").status_code == 201
    assert post_event(ledger, "expense", "800.00").status_code == 201
    path = f"/api/v1/budgets/{row['id']}/"
    progress = ledger["client"].get(path).json()
    assert (
        progress["spent"],
        progress["remaining"],
        progress["utilization_percent"],
        progress["warning_state"],
    ) == ("800.00", "200.00", "80.00", "warning")
    assert post_event(ledger, "expense", "200.00").status_code == 201
    assert ledger["client"].get(path).json()["warning_state"] == "at_limit"
    assert post_event(ledger, "expense", "0.01").status_code == 201
    progress = ledger["client"].get(path).json()
    assert (progress["remaining"], progress["overspending"], progress["warning_state"]) == (
        "-0.01",
        "0.01",
        "exceeded",
    )
    edited = ledger["client"].patch(
        path,
        {"limit": "2000.00", "warning_percent": 40},
        format="json",
        HTTP_IDEMPOTENCY_KEY="edit-budget",
    )
    assert edited.status_code == 201, edited.data
    assert edited.json()["warning_state"] == "warning"
    archived = ledger["client"].patch(
        path, {"archived": True}, format="json", HTTP_IDEMPOTENCY_KEY="archive-budget"
    )
    assert archived.status_code == 201
    assert len(ledger["client"].get("/api/v1/budgets/?archived=true").json()["results"]) == 1
    assert BudgetChange.objects.filter(budget_id=row["id"]).count() == 3
    assert summary(ledger)["liquid_balance"] == "999.99"


@pytest.mark.django_db
def test_refunds_backdating_corrections_and_reversals_recalculate(ledger: dict[str, Any]) -> None:
    row = budget(ledger, "100.00")
    assert post_event(ledger, "receipt", "500.00", effective_date="2025-09-01").status_code == 201
    expense = post_event(ledger, "expense", "120.00", merchant="Cafe")
    assert expense.status_code == 201
    refund = post_event(ledger, "refund", "20.00", original_expense=expense.json()["id"])
    assert refund.status_code == 201, refund.data
    assert report(ledger)["personal_expense"] == "100.00"
    assert report(ledger, "breakdown")["results"][0]["amount"] == "100.00"
    assert report(ledger, "breakdown", dimension="merchant")["results"] == [
        {"key": "Cafe", "label": "Cafe", "amount": "100.00", "transaction_count": 2}
    ]
    assert report(ledger, merchant="Cafe")["personal_expense"] == "100.00"
    assert ledger["client"].get(f"/api/v1/budgets/{row['id']}/").json()["spent"] == "100.00"
    assert post_event(ledger, "expense", "40.00", effective_date="2025-10-01").status_code == 201
    assert report(ledger)["personal_expense"] == "140.00"
    assert (
        write(
            ledger, f"transactions/{refund.json()['id']}/reverse/", {"reason": "Undo refund"}
        ).status_code
        == 201
    )
    corrected = write(
        ledger,
        f"transactions/{expense.json()['id']}/correct/",
        {
            "kind": "expense",
            "amount": "80.00",
            "effective_date": "2025-09-30",
            "account": str(ledger["cash"].id),
            "category": str(ledger["category"].id),
            "title": "Correction",
            "reason": "Correct date/amount",
        },
    )
    assert corrected.status_code == 201, corrected.data
    assert report(ledger)["personal_expense"] == "40.00"
    assert ledger["client"].get(f"/api/v1/budgets/{row['id']}/").json()["spent"] == "40.00"
    assert (
        report(ledger, date_from="2025-09-01", date_to="2025-09-30")["personal_expense"] == "80.00"
    )
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_filters_sorting_search_boundaries_and_csv_reconcile(
    ledger: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: date(2025, 10, 16))
    assert post_event(ledger, "receipt", "1000.00", effective_date="2025-01-01").status_code == 201
    for day, amount in (
        ("2025-09-30", "10.00"),
        ("2025-10-01", "20.00"),
        ("2025-10-12", "30.00"),
        ("2025-10-13", "40.00"),
        ("2025-10-15", "50.00"),
        ("2025-10-16", "60.00"),
        ("2025-10-19", "70.00"),
        ("2025-11-01", "80.00"),
    ):
        assert (
            post_event(
                ledger,
                "expense",
                amount,
                effective_date=day,
                title="₹ Café हिन्दी",
                merchant="Cafe",
                payment_method="UPI",
            ).status_code
            == 201
        )
    client = ledger["client"]
    for period, count in (
        ("today", 1),
        ("yesterday", 1),
        ("week", 4),
        ("last_seven_days", 4),
        ("month", 6),
        ("previous_month", 1),
        ("year", 9),
    ):
        response = client.get("/api/v1/transactions/", {"period": period})
        assert response.status_code == 200, response.data
        assert response.json()["count"] == count
    assert client.get("/api/v1/transactions/?date=2025-10-01").json()["count"] == 1
    assert (
        client.get("/api/v1/transactions/?date_from=2024-01-01&date_to=2026-12-31").json()["count"]
        == 9
    )
    assert (
        client.get(
            "/api/v1/transactions/?search=Cafe%20हिन्दी&ordering=-amount_paise,effective_date"
        ).json()["count"]
        == 8
    )
    params = {
        "date_from": "2025-10-01",
        "date_to": "2025-10-31",
        "merchant": "Cafe",
        "payment_method": "UPI",
        "search": "हिन्दी",
        "sort": "highest",
    }
    history = client.get("/api/v1/transactions/", params).json()
    assert history["count"] == 6
    assert history["results"][0]["amount"] == "70.00"
    totals = report(ledger, **params)
    assert len(totals["highest_spending_days"]) == 5
    assert totals["highest_spending_days"][0] == {"date": "2025-10-19", "amount": "70.00"}
    response = client.get("/api/v1/reports/export/", params)
    assert response.status_code == 200
    rows = list(
        csv.DictReader(io.StringIO(b"".join(response.streaming_content).decode("utf-8-sig")))
    )
    assert len(rows) == 6
    assert (
        sum(Decimal(row["net_expense_inr"]) for row in rows)
        == Decimal(totals["personal_expense"])
        == Decimal("270.00")
    )
    assert rows[0]["title"] == "₹ Café हिन्दी"
    assert (
        client.get("/api/v1/transactions/?date_from=2025-10-02&date_to=2025-10-01").status_code
        == 400
    )
    assert client.get("/api/v1/reports/summary/?unsupported=1").status_code == 400
    assert report(ledger, "trends", interval="week")["results"][0]["date"] == "2025-09-29"


@pytest.mark.django_db
def test_csv_formula_protection_and_inactive_events_contribute_zero(ledger: dict[str, Any]) -> None:
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    expense = post_event(
        ledger,
        "expense",
        "20.00",
        title="=1+1",
        merchant="@merchant",
        notes="\t=2",
        payment_method="+UPI",
    )
    assert expense.status_code == 201
    assert (
        write(
            ledger, f"transactions/{expense.json()['id']}/reverse/", {"reason": "Undo"}
        ).status_code
        == 201
    )
    response = ledger["client"].get("/api/v1/reports/export/?period=all")
    rows = list(
        csv.DictReader(io.StringIO(b"".join(response.streaming_content).decode("utf-8-sig")))
    )
    assert len(rows) == 3
    exported = next(row for row in rows if row["type"] == "expense")
    assert exported["title"] == "'=1+1"
    assert exported["merchant"] == "'@merchant"
    assert exported["payment_method"] == "'+UPI"
    assert exported["notes"].startswith("'")
    assert exported["status"] == "reversed"
    assert sum(Decimal(row["net_expense_inr"]) for row in rows) == 0
    assert sum(Decimal(row["net_external_cash_inr"]) for row in rows) == Decimal("100.00")


@pytest.mark.django_db
def test_empty_periods_comparisons_and_all_breakdowns(
    ledger: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    empty = report(ledger)
    assert empty["personal_expense"] == empty["average_daily_expense"] == "0.00"
    assert empty["highest_spending_day"] is None
    assert empty["comparison"]["percentage_difference"] is None
    assert report(ledger, "trends")["results"] == []
    assert report(ledger, "breakdown")["results"] == []
    assert dashboard(ledger)["budgets"] == []
    assert post_event(ledger, "receipt", "1000.00", effective_date="2025-09-01").status_code == 201
    assert post_event(ledger, "expense", "100.00", effective_date="2025-09-30").status_code == 201
    assert post_event(ledger, "expense", "200.00").status_code == 201
    compared = report(ledger)
    assert compared["comparison"]["difference"] == "100.00"
    assert compared["comparison"]["percentage_difference"] == "100.00"
    assert compared["period"]["calendar_days"] == 31
    assert compared["average_daily_expense"] == "6.45"
    for dimension in ("category", "merchant", "account", "payment_method", "contact"):
        assert sum(
            Decimal(row["amount"])
            for row in report(ledger, "breakdown", dimension=dimension)["results"]
        ) == Decimal("200.00")
    assert report(ledger, "trends", interval="month")["results"][0]["amount"] == "200.00"
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: date(2025, 10, 16))
    incomplete = report(ledger)
    assert incomplete["period"]["incomplete_period"] is True
    assert incomplete["comparison"]["percentage_difference"] is None
    assert incomplete["comparison"]["comparable"] is False


@pytest.mark.django_db
def test_budget_validation_retries_raw_guards_and_isolation(ledger: dict[str, Any]) -> None:
    data = {
        "name": "Month",
        "period_start": "2025-10-01",
        "period_end": "2025-10-31",
        "limit": "100.00",
    }
    first = write(ledger, "budgets/", data, key="budget-retry")
    again = write(ledger, "budgets/", data, key="budget-retry")
    assert (first.status_code, again.status_code) == (201, 200)
    assert first.json()["id"] == again.json()["id"]
    assert (
        write(ledger, "budgets/", {**data, "limit": "101.00"}, key="budget-retry").status_code
        == 409
    )
    assert write(ledger, "budgets/", data).status_code == 400
    assert (
        write(
            ledger, "budgets/", {**data, "period_start": "2025-11-02", "period_end": "2025-11-30"}
        ).status_code
        == 400
    )
    assert (
        write(
            ledger,
            "budgets/",
            {
                **data,
                "period_start": "2025-11-02",
                "period_end": "2025-11-01",
                "period_type": "custom",
            },
        ).status_code
        == 400
    )
    custom = write(
        ledger,
        "budgets/",
        {**data, "period_start": "2025-11-02", "period_end": "2026-01-02", "period_type": "custom"},
    )
    assert custom.status_code == 201
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    assert (
        post_event(ledger, "expense", "500.00", notes="Private financial note").status_code == 201
    )
    other = User.objects.create_user(email="report-other@example.com")
    category = Category.objects.create(user=other, name="Private")
    assert write(ledger, "budgets/", {**data, "category": str(category.id)}).status_code == 404
    with pytest.raises(IntegrityError), transaction.atomic():
        Budget.objects.filter(pk=first.json()["id"]).update(category=category)
    with pytest.raises(IntegrityError), transaction.atomic():
        BudgetChange.objects.all().update(after={})
    client = APIClient()
    client.force_authenticate(other)
    path = f"/api/v1/budgets/{first.json()['id']}/"
    assert client.get(path).status_code == 404
    assert (
        client.patch(
            path, {"limit": "999.00"}, format="json", HTTP_IDEMPOTENCY_KEY="foreign"
        ).status_code
        == 404
    )
    assert client.get("/api/v1/budgets/").json()["count"] == 0
    assert client.get("/api/v1/dashboard/").json()["liquid_balance"] == "0.00"
    assert client.get("/api/v1/reports/summary/").json()["personal_expense"] == "0.00"
    assert client.get("/api/v1/reports/trends/").json()["results"] == []
    assert client.get("/api/v1/reports/breakdown/").json()["results"] == []
    assert client.get("/api/v1/reports/funds/").json()["count"] == 0
    assert (
        client.get(
            "/api/v1/reports/summary/", {"period": "all", "account": str(ledger["cash"].id)}
        ).json()["personal_expense"]
        == "0.00"
    )
    exported = client.get("/api/v1/reports/export/")
    assert (
        len(list(csv.reader(io.StringIO(b"".join(exported.streaming_content).decode("utf-8-sig")))))
        == 1
    )
    for path in ("dashboard/", "budgets/", "reports/summary/", "reports/export/", "reports/funds/"):
        assert APIClient().get(f"/api/v1/{path}").status_code == 401
    assert BudgetChange.objects.count() == 2


@pytest.mark.django_db
def test_history_pagination_has_stable_amount_and_date_ties(
    ledger: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    from rest_framework.pagination import PageNumberPagination

    monkeypatch.setattr(PageNumberPagination, "page_size", 2)
    receipt = post_event(ledger, "receipt", "100.00")
    first = post_event(ledger, "expense", "10.00")
    second = post_event(ledger, "expense", "10.00")
    assert receipt.status_code == first.status_code == second.status_code == 201
    client = ledger["client"]
    page1 = client.get("/api/v1/transactions/?sort=oldest").json()
    page2 = client.get(page1["next"]).json()
    assert [row["id"] for row in [*page1["results"], *page2["results"]]] == [
        receipt.json()["id"],
        first.json()["id"],
        second.json()["id"],
    ]
    highest = client.get("/api/v1/transactions/?sort=highest").json()
    assert [row["id"] for row in highest["results"]] == [receipt.json()["id"], second.json()["id"]]
    lowest = client.get("/api/v1/transactions/?sort=lowest").json()
    assert [row["id"] for row in lowest["results"]] == [first.json()["id"], second.json()["id"]]


@pytest.mark.django_db
def test_budget_aggregation_query_count_does_not_grow_per_row(
    ledger: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("django.utils.timezone.localdate", lambda: date(2025, 10, 16))
    budget(ledger)
    categories = [
        Category.objects.create(user=ledger["user"], name=f"Category {index}") for index in range(5)
    ]
    for category in categories:
        budget(ledger, category=str(category.id))
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    assert post_event(ledger, "expense", "25.00").status_code == 201
    rows = list(Budget.objects.filter(user=ledger["user"]).select_related("user"))
    with CaptureQueriesContext(connection) as queries:
        values = budget_progresses(rows)
    assert len(queries) == 1
    assert len(values) == 6
    assert sorted(value["spent"] for value in values) == [0, 0, 0, 0, 0, 2500]
    print(f"Observed budget aggregation: {len(values)} budgets, {len(queries)} SQL query")
    with CaptureQueriesContext(connection) as queries:
        response = ledger["client"].get("/api/v1/dashboard/?period=all")
    assert response.status_code == 200, response.data
    assert response.json()["liquid_balance"] == "75.00"
    assert response.json()["budget_count"] == len(response.json()["budgets"]) == 6
    assert sorted(row["spent"] for row in response.json()["budgets"]) == [
        "0.00",
        "0.00",
        "0.00",
        "0.00",
        "0.00",
        "25.00",
    ]
    assert len(queries) <= 24
    print(f"Observed populated dashboard: 2 events, 6 budgets, {len(queries)} SQL queries")


@pytest.mark.django_db
def test_csv_streams_multiple_chunks_without_per_event_queries(ledger: dict[str, Any]) -> None:
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    # A balanced bulk fixture retains database guards and runs the actual
    # solvency/FIFO services once for the complete journal, without mocks.
    with transaction.atomic():
        _owner_lock(ledger["user"])
        expenses = Event.objects.bulk_create(
            [
                Event(
                    user=ledger["user"],
                    kind="expense",
                    amount_paise=100,
                    effective_date=date(2025, 10, 16),
                    account=ledger["cash"],
                    category=ledger["category"],
                    title=f"Chunk expense {index}",
                )
                for index in range(201)
            ]
        )
        Posting.objects.bulk_create(
            [
                leg
                for event in expenses
                for leg in (
                    Posting(event=event, book="liquid", account=ledger["cash"], amount_paise=-100),
                    Posting(event=event, book="expense", amount_paise=100),
                )
            ]
        )
        assert_fundable_history(ledger["user"])
        rebuild_attribution(user=ledger["user"], trigger_event=expenses[-1])
        with connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
            cursor.execute("SET CONSTRAINTS ALL DEFERRED")
    with CaptureQueriesContext(connection) as queries:
        response = ledger["client"].get("/api/v1/reports/export/?period=all")
        assert response.status_code == 200
        rows = list(
            csv.DictReader(io.StringIO(b"".join(response.streaming_content).decode("utf-8-sig")))
        )
    assert len(rows) == 202
    assert sum(Decimal(row["net_expense_inr"]) for row in rows) == Decimal("201.00")
    query_count = len(queries)
    assert 0 < query_count <= 8
    assert report(ledger)["personal_expense"] == "201.00"
    assert summary(ledger)["liquid_balance"] == "799.00"
    reconcile(ledger["user"])
    check_attribution(ledger["user"])
    print(
        f"Observed streaming CSV: {len(rows)} events, {query_count} SQL queries across chunks of 200"
    )
