"""Real PostgreSQL isolation, immutable metadata and concurrent rent payments."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from typing import Any

import pytest
from apps.funds.services import check_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Account, Category, Event, WriteReceipt
from apps.ledger.selectors import financial_summary
from apps.ledger.services import create_event
from apps.sharing.models import Contact, RentObligation, RentPlan, ReserveChange
from apps.sharing.rent import create_plan, generate_obligations, pay_rent
from apps.users.models import User
from django.db import IntegrityError, close_old_connections, connection, transaction
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event
from tests.test_rent import generate, plan, write


@pytest.mark.django_db
def test_rent_owner_isolation_for_resources_and_referenced_foreign_keys(
    ledger: dict[str, Any],
) -> None:
    rent_plan = plan(ledger, "100.00")
    obligation = generate(ledger, rent_plan)[0]
    reserve = write(
        ledger,
        "rent/reserves/",
        {"obligation": obligation["id"], "label": "Rent", "amount": "50.00", "reason": "Set aside"},
    ).json()
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    payment_data = {
        "account": str(ledger["cash"].id),
        "amount": "20.00",
        "effective_date": "2025-10-16",
    }
    payment = write(ledger, f"rent/obligations/{obligation['id']}/payments/", payment_data)
    assert payment.status_code == 201, payment.data
    other = User.objects.create_user(email="other-rent@example.com")
    client = APIClient()
    client.force_authenticate(other)
    for resource, identifier in [
        ("plans", rent_plan["id"]),
        ("obligations", obligation["id"]),
        ("reserves", reserve["id"]),
        ("payments", payment.json()["id"]),
    ]:
        assert client.get(f"/api/v1/rent/{resource}/").json()["count"] == 0
        assert client.get(f"/api/v1/rent/{resource}/{identifier}/").status_code == 404
    assert (
        client.post(
            f"/api/v1/rent/obligations/{obligation['id']}/payments/",
            payment_data,
            format="json",
            HTTP_IDEMPOTENCY_KEY="foreign-payment",
        ).status_code
        == 404
    )
    assert (
        client.post(
            f"/api/v1/rent/payments/{payment.json()['id']}/reverse/",
            {"reason": "Foreign"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="foreign-reverse",
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/v1/rent/reserves/",
            {
                "obligation": obligation["id"],
                "label": "Foreign",
                "amount": "1.00",
                "reason": "Foreign",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="foreign-reserve",
        ).status_code
        == 404
    )
    foreign_account = Account.objects.create(
        user=other, name="Private", kind="cash", opened_on=date(2025, 1, 1)
    )
    before = Event.objects.count()
    assert (
        write(
            ledger,
            f"rent/obligations/{obligation['id']}/payments/",
            {**payment_data, "account": str(foreign_account.id)},
            key="foreign-account",
        ).status_code
        == 404
    )
    assert (
        Event.objects.count() == before
        and not WriteReceipt.objects.filter(key="foreign-account").exists()
    )
    assert not WriteReceipt.objects.filter(user=other).exists()


@pytest.mark.django_db
def test_postgres_rejects_rent_metadata_corruption_and_reserve_underflow(
    ledger: dict[str, Any],
) -> None:
    rent_plan = plan(ledger, "100.00")
    obligation = generate(ledger, rent_plan)[0]
    reserve = write(
        ledger,
        "rent/reserves/",
        {"obligation": obligation["id"], "label": "Rent", "amount": "40.00", "reason": "Set aside"},
    ).json()
    assert ledger["client"].get("/api/v1/rent/spending-capacity/").json() == {
        "liquid_balance": "0.00",
        "active_reserves": "40.00",
        "safe_to_spend": "-40.00",
    }
    with pytest.raises(IntegrityError), transaction.atomic():
        RentPlan.objects.filter(pk=rent_plan["id"]).update(amount_paise=1)
    with pytest.raises(IntegrityError), transaction.atomic():
        ReserveChange.objects.all().update(delta_paise=1)
    with pytest.raises(IntegrityError), transaction.atomic():
        ReserveChange.objects.create(
            reserve_id=reserve["id"], delta_paise=-4001, reason="Underflow"
        )
        with connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
    with pytest.raises(IntegrityError), transaction.atomic():
        RentObligation.objects.create(
            user=ledger["user"],
            plan_id=rent_plan["id"],
            month=date(2025, 11, 1),
            due_date=date(2025, 11, 29),
        )
    contact = Contact.objects.create(user=ledger["user"], display_name="Owner")
    other = User.objects.create_user(email="metadata-owner@example.com")
    with pytest.raises(IntegrityError), transaction.atomic():
        Contact.objects.filter(pk=contact.id).update(user=other)
    assert ReserveChange.objects.count() == 1
    assert Event.objects.count() == 0


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("same_key", [True, False])
def test_concurrent_rent_payments_cannot_duplicate_or_exceed_obligation(same_key: bool) -> None:
    user = User.objects.create_user(email="concurrent-pay-rent@example.com")
    account = Account.objects.create(
        user=user, name="Cash", kind="cash", opened_on=date(2024, 1, 1)
    )
    category = Category.objects.create(user=user, name="Rent")
    create_event(
        user=user,
        key="fund",
        data={
            "kind": "receipt",
            "amount_paise": 20000,
            "account": account.id,
            "effective_date": date(2025, 10, 1),
            "title": "Family",
            "funding_source": "Family",
        },
    )
    plan_id, _ = create_plan(
        user=user,
        key="plan",
        data={
            "title": "Rent",
            "payee": "Landlord",
            "start_date": date(2025, 10, 1),
            "due_day": None,
            "amount_paise": 10000,
            "category": category.id,
        },
    )
    generate_obligations(user=user, key="generate", plan_id=plan_id, through=date(2025, 10, 31))
    obligation = RentObligation.objects.get(plan_id=plan_id)
    barrier = Barrier(2)

    def pay(index: int) -> str:
        close_old_connections()
        try:
            owner = User.objects.get(pk=user.pk)
            barrier.wait(timeout=15)
            try:
                _, replayed = pay_rent(
                    user=owner,
                    key="same" if same_key else f"pay-{index}",
                    obligation_id=obligation.id,
                    data={
                        "account": account.id,
                        "amount_paise": 8000,
                        "effective_date": date(2025, 10, 16),
                    },
                )
                return "replayed" if replayed else "created"
            except FinancialConflict:
                return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(pay, (1, 2)))
    assert sorted(results) == sorted(["created", "replayed" if same_key else "conflict"])
    assert obligation.payments.count() == 1
    assert financial_summary(user) == {
        "liquid_balance": 12000,
        "personal_expense": 8000,
        "external_receipts": 20000,
    }
    check_attribution(user)
