"""Real PostgreSQL ledger, API, isolation, rollback and concurrency verification."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from typing import Any
from uuid import UUID, uuid4

import pytest
from apps.ledger.models import Account, Category, Event, Posting, WriteReceipt
from apps.ledger.money import MoneyField, format_money
from apps.ledger.selectors import financial_summary
from apps.ledger.services import FinancialConflict, create_event
from apps.users.models import User
from django.db import IntegrityError, close_old_connections, connection, transaction
from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIClient


@pytest.fixture
def ledger(db: None) -> dict[str, Any]:
    user = User.objects.create_user(email="ledger@example.com")
    client = APIClient()
    client.force_authenticate(user)
    cash = Account.objects.create(user=user, name="Cash", kind="cash", opened_on=date(2025, 1, 1))
    bank = Account.objects.create(user=user, name="Bank", kind="bank", opened_on=date(2025, 1, 1))
    category = Category.objects.create(user=user, name="Food")
    return {"user": user, "client": client, "cash": cash, "bank": bank, "category": category}


def post_event(ledger: dict[str, Any], kind: str, amount: Any, **kwargs: Any) -> Any:
    key = kwargs.pop("key", str(uuid4()))
    data = {
        "kind": kind,
        "amount": amount,
        "account": str(ledger["cash"].id),
        "title": kind,
        "effective_date": "2025-10-16",
    }
    if kind == "receipt":
        data["funding_source"] = "Family"
    if kind == "expense":
        data["category"] = str(ledger["category"].id)
    data.update(kwargs)
    return ledger["client"].post(
        "/api/v1/transactions/", data, format="json", HTTP_IDEMPOTENCY_KEY=key
    )


def summary(ledger: dict[str, Any]) -> dict[str, str]:
    response = ledger["client"].get("/api/v1/accounts/summary/")
    assert response.status_code == 200, response.data
    return response.json()


def reconcile(user: User) -> None:
    events = Event.objects.filter(user=user).annotate(
        total=Coalesce(Sum("postings__amount_paise"), 0)
    )
    assert events.exists()
    assert not events.exclude(total=0).exists()
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT count(*) FROM ledger_event e WHERE e.user_id=%s AND EXISTS (
                (SELECT book,account_id,claim_id,amount_paise FROM ledger_posting WHERE event_id=e.id
                 EXCEPT ALL SELECT * FROM kivo_expected_postings(e.id))
                UNION ALL
                (SELECT * FROM kivo_expected_postings(e.id) EXCEPT ALL
                 SELECT book,account_id,claim_id,amount_paise FROM ledger_posting WHERE event_id=e.id))
        """,
            [user.pk],
        )
        assert cursor.fetchone()[0] == 0


@pytest.mark.unit
@pytest.mark.parametrize(
    "value", [100, 1.25, True, "1", "1.001", "-1.00", "1e2", "NaN", "01.00", "100000000000000.00"]
)
def test_money_rejects_inexact_or_unsupported_input(value: Any) -> None:
    with pytest.raises(ValidationError):
        MoneyField().run_validation(value)


@pytest.mark.unit
def test_money_exact_conversion() -> None:
    assert MoneyField().run_validation("120.01") == 12001
    assert format_money(-12001) == "-120.01"


@pytest.mark.django_db
def test_required_receipt_and_expense_scenario(ledger: dict[str, Any]) -> None:
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    assert summary(ledger) == {
        "liquid_balance": "1000.00",
        "personal_expense": "0.00",
        "external_receipts": "1000.00",
    }
    for amount in ("120.00", "40.00"):
        response = post_event(
            ledger, "expense", amount, merchant="Cafe", payment_method="cash", notes="Lunch"
        )
        assert response.status_code == 201, response.data
        assert len(response.json()["financial_effects"]) == 2
    assert summary(ledger) == {
        "liquid_balance": "840.00",
        "personal_expense": "160.00",
        "external_receipts": "1000.00",
    }
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_transfer_conserves_combined_balance(ledger: dict[str, Any]) -> None:
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    transfer = post_event(ledger, "transfer", "300.00", destination=str(ledger["bank"].id))
    assert transfer.status_code == 201, transfer.data
    assert summary(ledger)["liquid_balance"] == "1000.00"
    assert summary(ledger)["personal_expense"] == "0.00"
    balances = {
        row["name"]: row["balance"]
        for row in ledger["client"].get("/api/v1/accounts/").json()["results"]
    }
    assert balances == {"Cash": "700.00", "Bank": "300.00"}
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_opening_funds_are_equity_and_account_creation_is_idempotent(
    ledger: dict[str, Any],
) -> None:
    data = {
        "name": "Wallet",
        "kind": "wallet",
        "opened_on": "2025-10-01",
        "opening_balance": "250.05",
    }
    first = ledger["client"].post(
        "/api/v1/accounts/", data, format="json", HTTP_IDEMPOTENCY_KEY="opening"
    )
    repeat = ledger["client"].post(
        "/api/v1/accounts/", data, format="json", HTTP_IDEMPOTENCY_KEY="opening"
    )
    assert first.status_code == 201, first.data
    assert repeat.status_code == 200
    assert first.json()["id"] == repeat.json()["id"]
    assert first.json()["balance"] == "250.05"
    assert Event.objects.filter(kind="opening").count() == 1
    assert summary(ledger) == {
        "liquid_balance": "250.05",
        "personal_expense": "0.00",
        "external_receipts": "0.00",
    }


@pytest.mark.django_db
def test_durable_retry_and_conflicting_key(ledger: dict[str, Any]) -> None:
    first = post_event(ledger, "receipt", "1000.00", key="same")
    repeat = post_event(ledger, "receipt", "1000.00", key="same")
    conflict = post_event(ledger, "receipt", "999.00", key="same")
    assert (first.status_code, repeat.status_code, conflict.status_code) == (201, 200, 409)
    assert first.json()["id"] == repeat.json()["id"]
    assert Event.objects.count() == 1
    assert Posting.objects.count() == 2
    assert WriteReceipt.objects.count() == 1


@pytest.mark.django_db
def test_insufficient_funds_are_atomic_and_key_can_be_retried(ledger: dict[str, Any]) -> None:
    response = post_event(ledger, "expense", "10.00", key="retry")
    assert response.status_code == 409
    assert Event.objects.count() == Posting.objects.count() == WriteReceipt.objects.count() == 0
    assert post_event(ledger, "receipt", "10.00").status_code == 201
    assert post_event(ledger, "expense", "10.00", key="retry").status_code == 201
    assert summary(ledger)["liquid_balance"] == "0.00"


@pytest.mark.django_db
def test_partial_refund_reduces_expense_and_rejects_overrefund(ledger: dict[str, Any]) -> None:
    post_event(ledger, "receipt", "100.00")
    expense = post_event(ledger, "expense", "80.00").json()["id"]
    refund = post_event(ledger, "refund", "30.00", original_expense=expense)
    assert refund.status_code == 201, refund.data
    assert refund.json()["original_expense"] == expense
    assert summary(ledger) == {
        "liquid_balance": "50.00",
        "personal_expense": "50.00",
        "external_receipts": "100.00",
    }
    assert post_event(ledger, "refund", "50.01", original_expense=expense).status_code == 409
    assert (
        post_event(
            ledger, "refund", "1.00", original_expense=expense, effective_date="2025-10-15"
        ).status_code
        == 400
    )
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_reversal_void_and_correction_preserve_history(ledger: dict[str, Any]) -> None:
    post_event(ledger, "receipt", "1000.00")
    original = post_event(ledger, "expense", "120.00").json()
    payload = {
        "kind": "expense",
        "amount": "100.00",
        "account": str(ledger["cash"].id),
        "category": str(ledger["category"].id),
        "effective_date": "2025-10-16",
        "title": "Correct lunch",
        "reason": "Entry typo",
    }
    corrected = ledger["client"].post(
        f"/api/v1/transactions/{original['id']}/correct/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY="correct",
    )
    assert corrected.status_code == 201, corrected.data
    assert corrected.json()["supersedes"] == original["id"]
    assert Event.objects.get(public_id=original["id"]).amount_paise == 12000
    assert summary(ledger)["personal_expense"] == "100.00"
    voided = ledger["client"].post(
        f"/api/v1/transactions/{corrected.json()['id']}/void/",
        {"reason": "Duplicate expense"},
        format="json",
        HTTP_IDEMPOTENCY_KEY="void",
    )
    assert voided.status_code == 201, voided.data
    detail = ledger["client"].get(f"/api/v1/transactions/{corrected.json()['id']}/").json()
    assert detail["status"] == "voided"
    assert summary(ledger)["liquid_balance"] == "1000.00"
    assert summary(ledger)["personal_expense"] == "0.00"
    assert Event.objects.count() == 5
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_same_day_receipt_correction_keeps_original_sequence(ledger: dict[str, Any]) -> None:
    receipt = post_event(ledger, "receipt", "1000.00").json()["id"]
    post_event(ledger, "expense", "1000.00")
    payload = {
        "kind": "receipt",
        "amount": "1200.00",
        "account": str(ledger["cash"].id),
        "effective_date": "2025-10-16",
        "title": "Correct receipt",
        "funding_source": "Family",
        "reason": "Wrong amount",
    }
    response = ledger["client"].post(
        f"/api/v1/transactions/{receipt}/correct/",
        payload,
        format="json",
        HTTP_IDEMPOTENCY_KEY="correct-receipt",
    )
    assert response.status_code == 201, response.data
    assert summary(ledger)["liquid_balance"] == "200.00"


@pytest.mark.django_db
def test_reversing_spent_receipt_and_backdated_shortfalls_fail(ledger: dict[str, Any]) -> None:
    receipt = post_event(ledger, "receipt", "100.00", effective_date="2025-10-17").json()["id"]
    assert post_event(ledger, "expense", "10.00", effective_date="2025-10-16").status_code == 409
    assert post_event(ledger, "expense", "10.00", effective_date="2025-10-17").status_code == 201
    response = ledger["client"].post(
        f"/api/v1/transactions/{receipt}/reverse/",
        {"reason": "Wrong receipt"},
        format="json",
        HTTP_IDEMPOTENCY_KEY="reverse",
    )
    assert response.status_code == 409
    assert Event.objects.count() == 2
    assert summary(ledger)["liquid_balance"] == "90.00"


@pytest.mark.django_db
def test_refunded_expense_must_reverse_refund_first(ledger: dict[str, Any]) -> None:
    post_event(ledger, "receipt", "100.00")
    expense = post_event(ledger, "expense", "80.00").json()["id"]
    refund = post_event(ledger, "refund", "30.00", original_expense=expense).json()["id"]
    for target, expected in ((expense, 409), (refund, 201), (expense, 201)):
        response = ledger["client"].post(
            f"/api/v1/transactions/{target}/reverse/",
            {"reason": "Undo"},
            format="json",
            HTTP_IDEMPOTENCY_KEY=str(uuid4()),
        )
        assert response.status_code == expected, response.data
    assert summary(ledger)["personal_expense"] == "0.00"


@pytest.mark.django_db
def test_account_and_category_archival_and_default_customization(ledger: dict[str, Any]) -> None:
    client = ledger["client"]
    assert client.post("/api/v1/categories/defaults/").status_code == 200
    assert client.post("/api/v1/categories/defaults/").status_code == 200
    assert Category.objects.filter(user=ledger["user"]).count() == 7
    child = client.post(
        "/api/v1/categories/",
        {"name": "Breakfast", "parent": str(ledger["category"].id)},
        format="json",
    )
    assert child.status_code == 201, child.data
    assert (
        client.patch(
            f"/api/v1/categories/{ledger['category'].id}/", {"archived": True}, format="json"
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/api/v1/categories/{child.json()['id']}/", {"archived": True}, format="json"
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/categories/{ledger['category'].id}/", {"archived": True}, format="json"
        ).status_code
        == 200
    )
    post_event(ledger, "receipt", "100.00")
    assert post_event(ledger, "expense", "1.00").status_code == 400
    assert (
        client.patch(
            f"/api/v1/accounts/{ledger['cash'].id}/", {"archived": True}, format="json"
        ).status_code
        == 409
    )
    assert (
        client.patch(
            f"/api/v1/accounts/{ledger['bank'].id}/", {"archived": True}, format="json"
        ).status_code
        == 200
    )
    assert (
        post_event(ledger, "transfer", "1.00", destination=str(ledger["bank"].id)).status_code
        == 400
    )


@pytest.mark.django_db
def test_search_filters_order_pagination_and_no_history_mutation(ledger: dict[str, Any]) -> None:
    post_event(ledger, "receipt", "100.00")
    expense = post_event(ledger, "expense", "10.00", title="Breakfast", merchant="Cafe").json()[
        "id"
    ]
    response = ledger["client"].get(
        "/api/v1/transactions/?kind=expense&search=cafe&date_from=2025-10-16&date_to=2025-10-16&ordering=amount_paise"
    )
    assert response.status_code == 200
    assert response.json()["count"] == 1
    assert response.json()["results"][0]["id"] == expense
    assert (
        ledger["client"]
        .patch(f"/api/v1/transactions/{expense}/", {"amount": "1.00"}, format="json")
        .status_code
        == 405
    )
    assert ledger["client"].delete(f"/api/v1/transactions/{expense}/").status_code == 405


@pytest.mark.django_db
def test_cross_owner_foreign_keys_and_resources_do_not_disclose(ledger: dict[str, Any]) -> None:
    victim = User.objects.create_user(email="victim@example.com")
    account = Account.objects.create(
        user=victim, name="Secret", kind="bank", opened_on=date(2025, 1, 1)
    )
    category = Category.objects.create(user=victim, name="Secret")
    for path in (f"accounts/{account.id}", f"categories/{category.id}"):
        assert ledger["client"].get(f"/api/v1/{path}/").status_code == 404
        assert (
            ledger["client"]
            .patch(f"/api/v1/{path}/", {"name": "Hacked"}, format="json")
            .status_code
            == 404
        )
    assert post_event(ledger, "receipt", "1.00", account=str(account.id)).status_code == 404
    assert post_event(ledger, "expense", "1.00", category=str(category.id)).status_code == 404
    assert post_event(ledger, "transfer", "1.00", destination=str(account.id)).status_code == 404
    assert (
        ledger["client"]
        .post("/api/v1/categories/", {"name": "Hacked", "parent": str(category.id)}, format="json")
        .status_code
        == 404
    )
    assert ledger["client"].get("/api/v1/accounts/").json()["count"] == 2
    assert Event.objects.count() == 0
    for identifier in (account.id, uuid4()):
        response = ledger["client"].get(f"/api/v1/transactions/?account={identifier}")
        assert response.status_code == 200
        assert response.json()["count"] == 0


@pytest.mark.unit
def test_request_correlation_id_is_validated(api_client: APIClient) -> None:
    request_id = str(uuid4())
    assert (
        api_client.get("/api/v1/health/", HTTP_X_REQUEST_ID=request_id)["X-Request-ID"]
        == request_id
    )
    malformed = api_client.get("/api/v1/health/", HTTP_X_REQUEST_ID="invalid")
    assert str(UUID(malformed["X-Request-ID"])) == malformed["X-Request-ID"]


@pytest.mark.django_db
def test_foreign_transaction_details_and_actions_are_isolated(ledger: dict[str, Any]) -> None:
    victim = User.objects.create_user(email="private-history@example.com")
    account = Account.objects.create(
        user=victim, name="Private", kind="bank", opened_on=date(2025, 1, 1)
    )
    category = Category.objects.create(user=victim, name="Private")
    base = {"account": account.id, "effective_date": date(2025, 10, 16), "title": "Private"}
    create_event(
        user=victim,
        key="receipt",
        data={**base, "kind": "receipt", "amount_paise": 10000, "funding_source": "Private"},
    )
    expense_id, _ = create_event(
        user=victim,
        key="expense",
        data={**base, "kind": "expense", "amount_paise": 1000, "category": category.id},
    )
    assert ledger["client"].get(f"/api/v1/transactions/{expense_id}/").status_code == 404
    for action in ("reverse", "void", "correct"):
        response = ledger["client"].post(
            f"/api/v1/transactions/{expense_id}/{action}/",
            {"reason": "Attack"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="attack",
        )
        assert response.status_code == 404
    assert post_event(ledger, "refund", "1.00", original_expense=str(expense_id)).status_code == 404
    assert ledger["client"].get("/api/v1/transactions/").json()["count"] == 0
    for resource in ("accounts", "categories", "transactions"):
        assert ledger["client"].get(f"/api/v1/{resource}/invalid-uuid/").status_code == 404
    assert Event.objects.filter(user=victim).count() == 2


@pytest.mark.django_db
def test_authentication_csrf_and_missing_idempotency_key(ledger: dict[str, Any]) -> None:
    assert APIClient().get("/api/v1/accounts/").status_code == 401
    client = APIClient(enforce_csrf_checks=True)
    client.force_login(ledger["user"])
    assert client.post("/api/v1/transactions/", {}, format="json").status_code == 403
    assert post_event(ledger, "receipt", "1.00", key="").status_code == 400


@pytest.mark.django_db
@pytest.mark.parametrize("amount", ["0.00", "-1.00", 1.01])
def test_invalid_amounts_never_post(ledger: dict[str, Any], amount: Any) -> None:
    assert post_event(ledger, "receipt", amount).status_code == 400
    assert Event.objects.count() == Posting.objects.count() == 0


@pytest.mark.django_db
def test_database_rejects_unbalanced_journals_and_history_mutation(ledger: dict[str, Any]) -> None:
    post_event(ledger, "receipt", "100.00")
    event = Event.objects.get(kind="receipt")
    for action in (
        lambda: Event.objects.filter(pk=event.pk).update(amount_paise=1),
        lambda: Posting.objects.filter(event=event).update(amount_paise=1),
        lambda: Posting.objects.filter(event=event).delete(),
    ):
        with pytest.raises(IntegrityError), transaction.atomic():
            action()
    with pytest.raises(IntegrityError), transaction.atomic():
        Event.objects.create(
            user=ledger["user"],
            kind="receipt",
            account=ledger["cash"],
            amount_paise=1,
            effective_date=date(2025, 10, 16),
            title="Invalid",
        )
        with connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
    assert summary(ledger)["liquid_balance"] == "100.00"


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("same_key", [True, False])
def test_concurrent_retries_and_overspending_use_real_row_locks(same_key: bool) -> None:
    user = User.objects.create_user(email="concurrent@example.com")
    account = Account.objects.create(
        user=user, name="Cash", kind="cash", opened_on=date(2025, 1, 1)
    )
    category = Category.objects.create(user=user, name="Food")
    base = {"account": account.id, "effective_date": date(2025, 10, 16), "title": "Concurrent"}
    create_event(
        user=user,
        key="fund",
        data={**base, "kind": "receipt", "amount_paise": 10000, "funding_source": "Home"},
    )
    barrier = Barrier(2)

    def spend(index: int) -> str:
        close_old_connections()
        try:
            worker_user = User.objects.get(pk=user.pk)
            barrier.wait(timeout=15)
            try:
                _, replayed = create_event(
                    user=worker_user,
                    key="same" if same_key else f"spend-{index}",
                    data={**base, "kind": "expense", "amount_paise": 8000, "category": category.id},
                )
                return "replayed" if replayed else "created"
            except FinancialConflict:
                return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(spend, (1, 2)))
    assert sorted(results) == sorted(["created", "replayed" if same_key else "conflict"])
    assert Event.objects.filter(user=user, kind="expense").count() == 1
    assert financial_summary(user)["liquid_balance"] == 2000
    reconcile(user)
    from apps.funds.models import AllocationRun
    from apps.funds.services import check_attribution

    run = AllocationRun.objects.filter(user=user).latest("id")
    assert AllocationRun.objects.filter(user=user).count() == 2
    capacity = run.capacities.get()
    assert (capacity.allocated_paise, capacity.remaining_paise) == (8000, 2000)
    check_attribution(user)
