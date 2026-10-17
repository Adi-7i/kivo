"""Real PostgreSQL verification of protected rent earmarks and friend settlements."""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from datetime import date
from http.cookiejar import CookieJar
from threading import Barrier
from typing import Any
from urllib.request import HTTPCookieProcessor, Request, build_opener
from uuid import UUID

import pytest
from apps.funds.models import AllocationRun
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Event, WriteReceipt
from apps.sharing.finance import write_financial
from apps.sharing.models import Claim, Contact, RentPayment, ReserveChange
from apps.sharing.selectors import reserves_for
from apps.sharing.serializers import RentPaymentCreateSerializer
from apps.users.models import User
from django.db import IntegrityError, close_old_connections, connection, transaction
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event, summary
from tests.test_personal_finance import audit, claim_detail, contact, settle
from tests.test_rent import generate, plan, write


@pytest.mark.unit
@pytest.mark.parametrize(
    "fields,valid",
    [
        ({}, False),
        ({"account": "00000000-0000-0000-0000-000000000001"}, True),
        ({"payer": "00000000-0000-0000-0000-000000000002"}, True),
        (
            {
                "account": "00000000-0000-0000-0000-000000000001",
                "payer": "00000000-0000-0000-0000-000000000002",
            },
            False,
        ),
    ],
)
def test_rent_confirmation_requires_exactly_one_payer_mode(
    fields: dict[str, str], valid: bool
) -> None:
    serializer = RentPaymentCreateSerializer(
        data={"amount": "20.00", "effective_date": "2025-10-16", **fields}
    )
    assert serializer.is_valid() is valid


def reserve(ledger: dict[str, Any], obligation: str, amount: str) -> dict[str, Any]:
    response = write(
        ledger,
        "rent/reserves/",
        {
            "obligation": obligation,
            "label": "Rent",
            "amount": amount,
            "reason": "Earmark rent",
        },
    )
    assert response.status_code == 201, response.data
    return response.json()


def friend_payment(
    ledger: dict[str, Any], obligation: str, payer: str, amount: str, *, key: str = "friend-rent"
) -> dict[str, Any]:
    response = write(
        ledger,
        f"rent/obligations/{obligation}/payments/",
        {
            "payer": payer,
            "amount": amount,
            "effective_date": "2025-10-16",
        },
        key=key,
    )
    assert response.status_code == 201, response.data
    return response.json()


def capacity(ledger: dict[str, Any], cash: str, earmarked: str, safe: str) -> None:
    assert ledger["client"].get("/api/v1/rent/spending-capacity/").json() == {
        "liquid_balance": cash,
        "active_reserves": earmarked,
        "safe_to_spend": safe,
    }
    dashboard = ledger["client"].get("/api/v1/dashboard/?period=all")
    assert dashboard.status_code == 200, dashboard.data
    assert tuple(
        dashboard.json()[field] for field in ("liquid_balance", "reserved", "safe_to_spend")
    ) == (cash, earmarked, safe)


def setup_rent(ledger: dict[str, Any]) -> tuple[str, str, dict[str, Any]]:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "3000.00").status_code == 201
    obligation = generate(ledger, plan(ledger))[0]["id"]
    earmark = reserve(ledger, obligation, "2000.00")
    return person, obligation, earmark


@pytest.mark.django_db
def test_approved_friend_rent_lifecycle_idempotency_and_fifo(ledger: dict[str, Any]) -> None:
    person, obligation, _ = setup_rent(ledger)
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = payment["event"]["claims"][0]
    assert summary(ledger) == {
        "liquid_balance": "3000.00",
        "personal_expense": "2000.00",
        "external_receipts": "3000.00",
    }
    capacity(ledger, "3000.00", "2000.00", "1000.00")
    assert claim_detail(ledger, claim)["outstanding"] == "2000.00"
    status = ledger["client"].get(f"/api/v1/rent/obligations/{obligation}/").json()
    assert (status["paid"], status["outstanding"], status["friend_payable"]) == (
        "2000.00",
        "0.00",
        "2000.00",
    )
    assert (
        not Event.objects.get(public_id=payment["event"]["id"])
        .postings.filter(book="liquid")
        .exists()
    )
    assert (
        write(
            ledger,
            f"rent/obligations/{obligation}/payments/",
            {
                "payer": person,
                "amount": "2000.00",
                "effective_date": "2025-10-16",
            },
            key="friend-rent",
        ).status_code
        == 200
    )
    data = {
        "claim": claim,
        "account": str(ledger["cash"].id),
        "amount": "800.00",
        "effective_date": "2025-10-16",
        "title": "Rent reimbursement",
    }
    first = write(ledger, "settlements/", data, key="repay-friend")
    assert first.status_code == 201, first.data
    count = ReserveChange.objects.count()
    replay = write(ledger, "settlements/", data, key="repay-friend")
    assert replay.status_code == 200 and replay.json()["id"] == first.json()["id"]
    assert ReserveChange.objects.count() == count
    assert (
        write(ledger, "settlements/", {**data, "amount": "801.00"}, key="repay-friend").status_code
        == 409
    )
    capacity(ledger, "2200.00", "1200.00", "1000.00")
    assert claim_detail(ledger, claim)["outstanding"] == "1200.00"
    assert settle(ledger, claim, "1200.00").status_code == 201
    capacity(ledger, "1000.00", "0.00", "1000.00")
    assert claim_detail(ledger, claim)["status"] == "settled"
    assert summary(ledger)["personal_expense"] == "2000.00"
    run = AllocationRun.objects.filter(user=ledger["user"]).latest("id")
    moves = list(run.allocations.filter(kind="expense"))
    origin = Event.objects.get(public_id=payment["event"]["id"])
    assert sum(row.amount_paise for row in moves) == 200000
    assert all(row.expense_event_id == origin.id for row in moves)
    assert RentPayment.objects.count() == Claim.objects.count() == 1
    audit(ledger)


@pytest.mark.django_db
def test_reversals_restore_exact_reserves_claims_and_origin(ledger: dict[str, Any]) -> None:
    person, obligation, earmark = setup_rent(ledger)
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = payment["event"]["claims"][0]
    first = settle(ledger, claim, "800.00").json()
    last = settle(ledger, claim, "1200.00").json()
    assert (
        write(
            ledger, f"rent/payments/{payment['id']}/reverse/", {"reason": "Has settlements"}
        ).status_code
        == 409
    )
    assert (
        write(ledger, f"settlements/{last['id']}/reverse/", {"reason": "Undo final"}).status_code
        == 201
    )
    capacity(ledger, "2200.00", "1200.00", "1000.00")
    assert (
        write(ledger, f"settlements/{first['id']}/reverse/", {"reason": "Undo partial"}).status_code
        == 201
    )
    capacity(ledger, "3000.00", "2000.00", "1000.00")
    history = (
        ledger["client"].get(f"/api/v1/rent/reserves/{earmark['id']}/history/").json()["results"]
    )
    assert len([row for row in history if row["settlement"] and not row["active"]]) == 2
    assert (
        write(
            ledger,
            f"rent/payments/{payment['id']}/reverse/",
            {"reason": "Landlord payment cancelled"},
        ).status_code
        == 201
    )
    capacity(ledger, "3000.00", "2000.00", "1000.00")
    assert summary(ledger)["personal_expense"] == "0.00"
    assert claim_detail(ledger, claim)["status"] == "cancelled"
    assert ledger["client"].get(f"/api/v1/rent/obligations/{obligation}/").json()["paid"] == "0.00"
    audit(ledger)


@pytest.mark.django_db
def test_settlement_and_origin_corrections_and_owner_payment_preserve_protected_portions(
    ledger: dict[str, Any],
) -> None:
    person, obligation, earmark = setup_rent(ledger)
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = payment["event"]["claims"][0]
    first = settle(ledger, claim, "800.00").json()
    corrected = write(
        ledger,
        f"settlements/{first['id']}/correct/",
        {
            "claim": claim,
            "account": str(ledger["cash"].id),
            "amount": "500.00",
            "effective_date": "2025-10-16",
            "title": "Corrected",
            "reason": "Amount correction",
        },
    )
    assert corrected.status_code == 201, corrected.data
    capacity(ledger, "2500.00", "1500.00", "1000.00")
    assert (
        write(
            ledger,
            f"rent/reserves/{earmark['id']}/adjust/",
            {"amount": "0.00", "reason": "Premature release"},
        ).status_code
        == 409
    )
    replacement = {
        "payer": person,
        "amount": "1500.00",
        "effective_date": "2025-10-16",
        "reason": "Partial landlord payment",
    }
    assert write(ledger, f"rent/payments/{payment['id']}/correct/", replacement).status_code == 409
    assert (
        write(
            ledger, f"settlements/{corrected.json()['id']}/reverse/", {"reason": "Undo"}
        ).status_code
        == 201
    )
    changed = write(ledger, f"rent/payments/{payment['id']}/correct/", replacement)
    assert changed.status_code == 201, changed.data
    claim2 = changed.json()["event"]["claims"][0]
    assert claim_detail(ledger, claim)["status"] == "cancelled"
    assert claim_detail(ledger, claim2)["outstanding"] == "1500.00"
    assert settle(ledger, claim2, "750.00").status_code == 201
    capacity(ledger, "2250.00", "1250.00", "1000.00")
    own = write(
        ledger,
        f"rent/obligations/{obligation}/payments/",
        {"account": str(ledger["cash"].id), "amount": "500.00", "effective_date": "2025-10-16"},
    )
    assert own.status_code == 201, own.data
    capacity(ledger, "1750.00", "750.00", "1000.00")
    assert summary(ledger)["personal_expense"] == "2000.00"
    audit(ledger)


@pytest.mark.django_db
@pytest.mark.parametrize("under_reserved", [True, False])
def test_multiple_reserves_partial_rent_and_paisa_rounding(
    ledger: dict[str, Any], under_reserved: bool
) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "1.00").status_code == 201
    obligation = generate(ledger, plan(ledger, "0.07"))[0]["id"]
    older = reserve(ledger, obligation, "0.02")
    newer = reserve(ledger, obligation, "0.02" if under_reserved else "0.03")
    payment = friend_payment(ledger, obligation, person, "0.05")
    claim = payment["event"]["claims"][0]
    assert settle(ledger, claim, "0.02").status_code == 201
    # floor(4*2/5)=1, tied remainders -> oldest reserve; full backing releases 2.
    amounts = {str(row.id): row.reserved_paise for row in reserves_for(ledger["user"])}
    assert amounts[older["id"]] == 1
    assert amounts[newer["id"]] == 2
    assert settle(ledger, claim, "0.03").status_code == 201
    assert all(row.reserved_paise == 0 for row in reserves_for(ledger["user"]))
    assert claim_detail(ledger, claim)["outstanding"] == "0.00"
    assert (
        ledger["client"].get(f"/api/v1/rent/obligations/{obligation}/").json()["outstanding"]
        == "0.02"
    )
    audit(ledger)


@pytest.mark.django_db
def test_owner_payment_does_not_consume_friend_claim_reserve(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "3000.00").status_code == 201
    obligation = generate(ledger, plan(ledger))[0]["id"]
    reserve(ledger, obligation, "1000.00")
    payment = friend_payment(ledger, obligation, person, "1000.00")
    own = write(
        ledger,
        f"rent/obligations/{obligation}/payments/",
        {"account": str(ledger["cash"].id), "amount": "1000.00", "effective_date": "2025-10-16"},
    )
    assert own.status_code == 201, own.data
    capacity(ledger, "2000.00", "1000.00", "1000.00")
    assert settle(ledger, payment["event"]["claims"][0], "400.00").status_code == 201
    capacity(ledger, "1600.00", "600.00", "1000.00")
    audit(ledger)


@pytest.mark.django_db
def test_shared_friend_paid_rent_releases_only_non_owner_excess(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "6000.00").status_code == 201
    obligation = generate(
        ledger,
        plan(
            ledger,
            "6000.00",
            split_method="custom",
            participants=[
                {"contact": None, "amount": "2000.00"},
                {"contact": person, "amount": "4000.00"},
            ],
        ),
    )[0]["id"]
    reserve(ledger, obligation, "6000.00")
    payment = friend_payment(ledger, obligation, person, "6000.00")
    capacity(ledger, "6000.00", "2000.00", "4000.00")
    assert summary(ledger)["personal_expense"] == "2000.00"
    claim = payment["event"]["claims"][0]
    assert claim_detail(ledger, claim)["principal"] == "2000.00"
    assert settle(ledger, claim, "2000.00").status_code == 201
    capacity(ledger, "4000.00", "0.00", "4000.00")
    assert summary(ledger)["personal_expense"] == "2000.00"
    audit(ledger)


@pytest.mark.django_db
def test_new_reserve_after_friend_payment_and_atomic_overpayment_rejection(
    ledger: dict[str, Any],
) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "3000.00").status_code == 201
    obligation = generate(ledger, plan(ledger))[0]["id"]
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = payment["event"]["claims"][0]
    reserve(ledger, obligation, "1000.00")
    assert settle(ledger, claim, "500.00").status_code == 201
    capacity(ledger, "2500.00", "750.00", "1750.00")
    before = (
        Event.objects.count(),
        ReserveChange.objects.count(),
        WriteReceipt.objects.count(),
        AllocationRun.objects.count(),
    )
    assert settle(ledger, claim, "1500.01").status_code == 409
    assert settle(ledger, claim, "1.00", effective_date="2025-10-15").status_code == 400
    assert before == (
        Event.objects.count(),
        ReserveChange.objects.count(),
        WriteReceipt.objects.count(),
        AllocationRun.objects.count(),
    )
    capacity(ledger, "2500.00", "750.00", "1750.00")
    audit(ledger)


@pytest.mark.django_db
def test_friend_rent_cross_user_references_and_postgresql_guards(ledger: dict[str, Any]) -> None:
    person, obligation, earmark = setup_rent(ledger)
    other = User.objects.create_user(email="foreign-friend-rent@example.com")
    foreign = Contact.objects.create(user=other, display_name="Foreign")
    path = f"rent/obligations/{obligation}/payments/"
    assert (
        write(
            ledger,
            path,
            {"payer": str(foreign.id), "amount": "2000.00", "effective_date": "2025-10-16"},
        ).status_code
        == 404
    )
    assert (
        write(
            ledger,
            path,
            {
                "payer": person,
                "account": str(ledger["cash"].id),
                "amount": "2000.00",
                "effective_date": "2025-10-16",
            },
        ).status_code
        == 400
    )
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = payment["event"]["claims"][0]
    client = APIClient()
    client.force_authenticate(other)
    for resource, identifier in (
        ("payments", payment["id"]),
        ("reserves", earmark["id"]),
        ("obligations", obligation),
    ):
        assert client.get(f"/api/v1/rent/{resource}/{identifier}/").status_code == 404
    assert (
        client.post(
            "/api/v1/settlements/",
            {
                "claim": claim,
                "account": str(ledger["cash"].id),
                "amount": "1.00",
                "effective_date": "2025-10-16",
                "title": "Foreign",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="foreign",
        ).status_code
        == 404
    )
    with pytest.raises(IntegrityError), transaction.atomic():
        ReserveChange.objects.create(
            reserve_id=earmark["id"], delta_paise=-1, reason="Premature raw release"
        )
        with connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
    with pytest.raises(IntegrityError), transaction.atomic():
        ReserveChange.objects.create(
            reserve_id=earmark["id"],
            payment_id=payment["id"],
            claim_id=claim,
            delta_paise=1,
            reason="Fabricated protection",
        )
        with connection.cursor() as cursor:
            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
    with pytest.raises(IntegrityError), transaction.atomic():
        ReserveChange.objects.filter(reserve_id=earmark["id"]).update(reason="Mutate history")
    capacity(ledger, "3000.00", "2000.00", "1000.00")
    audit(ledger)


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("mode", ["same_key", "overpay", "both_valid"])
def test_concurrent_friend_rent_settlements_preserve_reserve_caps(
    ledger: dict[str, Any], mode: str
) -> None:
    person, obligation, _ = setup_rent(ledger)
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = UUID(payment["event"]["claims"][0])
    barrier = Barrier(2)
    amount = 80000 if mode == "both_valid" else 150000

    def worker(index: int) -> str:
        close_old_connections()
        try:
            user = User.objects.get(pk=ledger["user"].pk)
            barrier.wait(timeout=30)
            _, replayed = write_financial(
                user=user,
                key="parallel" if mode == "same_key" else f"parallel-{index}",
                operation="settlement",
                data={
                    "claim": claim,
                    "account": ledger["cash"].id,
                    "amount_paise": amount,
                    "effective_date": date(2025, 10, 16),
                    "title": "Concurrent rent settlement",
                },
            )
            return "replayed" if replayed else "created"
        except FinancialConflict:
            return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        outcomes = sorted(pool.map(worker, range(2)))
    expected = [
        "created",
        {"same_key": "replayed", "overpay": "conflict", "both_valid": "created"}[mode],
    ]
    assert outcomes == sorted(expected)
    capacity(
        ledger,
        "1400.00" if mode == "both_valid" else "1500.00",
        "400.00" if mode == "both_valid" else "500.00",
        "1000.00",
    )
    assert claim_detail(ledger, str(claim))["outstanding"] == (
        "400.00" if mode == "both_valid" else "500.00"
    )
    audit(ledger)


@pytest.mark.django_db
def test_multiple_friend_installments_and_backdated_settlement_keep_claim_portions_separate(
    ledger: dict[str, Any],
) -> None:
    person, obligation, _ = setup_rent(ledger)
    second_friend = contact(ledger, "Second friend")
    first = friend_payment(ledger, obligation, person, "1000.00", key="first-installment")
    second = friend_payment(ledger, obligation, second_friend, "1000.00", key="second-installment")
    claim1, claim2 = first["event"]["claims"][0], second["event"]["claims"][0]
    later = settle(ledger, claim1, "400.00", effective_date="2025-10-18")
    assert later.status_code == 201, later.data
    earlier = settle(ledger, claim2, "500.00", effective_date="2025-10-17")
    assert earlier.status_code == 201, earlier.data
    capacity(ledger, "2100.00", "1100.00", "1000.00")
    assert claim_detail(ledger, claim1)["outstanding"] == "600.00"
    assert claim_detail(ledger, claim2)["outstanding"] == "500.00"
    assert (
        write(
            ledger,
            f"settlements/{later.json()['id']}/reverse/",
            {"reason": "Restore first claim only"},
        ).status_code
        == 201
    )
    capacity(ledger, "2500.00", "1500.00", "1000.00")
    assert claim_detail(ledger, claim1)["outstanding"] == "1000.00"
    assert claim_detail(ledger, claim2)["outstanding"] == "500.00"
    # A correction cannot move a settlement before its originating friend payment.
    before = (Event.objects.count(), ReserveChange.objects.count())
    invalid = write(
        ledger,
        f"settlements/{earlier.json()['id']}/correct/",
        {
            "claim": claim2,
            "amount": "500.00",
            "account": str(ledger["cash"].id),
            "effective_date": "2025-10-15",
            "title": "Invalid backdate",
            "reason": "Check rollback",
        },
    )
    assert invalid.status_code == 400
    assert before == (Event.objects.count(), ReserveChange.objects.count())
    capacity(ledger, "2500.00", "1500.00", "1000.00")
    audit(ledger)


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
def test_friend_rent_over_real_session_csrf_http(ledger: dict[str, Any], live_server: Any) -> None:
    person, obligation, _ = setup_rent(ledger)
    user = ledger["user"]
    user.set_password("CorrectRentPassword123!")
    user.save(update_fields=["password"])
    cookies = CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookies))

    def request(path: str, data: dict[str, Any] | None = None, key: str = "") -> tuple[int, Any]:
        csrf = next((cookie.value for cookie in cookies if cookie.name == "csrftoken"), "")
        headers = {"Content-Type": "application/json", "X-CSRFToken": csrf, "Idempotency-Key": key}
        with opener.open(
            Request(
                f"{live_server.url}/api/v1/{path}",
                data=json.dumps(data).encode() if data is not None else None,
                headers=headers,
            ),
            timeout=30,
        ) as response:
            return response.status, json.loads(response.read())

    assert request("auth/csrf/")[0] == 200
    assert (
        request("auth/login/", {"email": user.email, "password": "CorrectRentPassword123!"})[0]
        == 200
    )
    code, payment = request(
        f"rent/obligations/{obligation}/payments/",
        {"payer": person, "amount": "2000.00", "effective_date": "2025-10-16"},
        "http-friend-rent",
    )
    assert code == 201
    assert request("rent/spending-capacity/")[1] == {
        "liquid_balance": "3000.00",
        "active_reserves": "2000.00",
        "safe_to_spend": "1000.00",
    }
    payload = {
        "claim": payment["event"]["claims"][0],
        "account": str(ledger["cash"].id),
        "amount": "800.00",
        "effective_date": "2025-10-16",
        "title": "HTTP rent repayment",
    }
    code, settlement = request("settlements/", payload, "http-repay-rent")
    assert code == 201
    assert request("settlements/", payload, "http-repay-rent")[0] == 200
    assert request("rent/spending-capacity/")[1] == {
        "liquid_balance": "2200.00",
        "active_reserves": "1200.00",
        "safe_to_spend": "1000.00",
    }
    assert (
        request(
            f"settlements/{settlement['id']}/reverse/",
            {"reason": "Undo HTTP settlement"},
            "http-undo-rent",
        )[0]
        == 201
    )
    assert request("rent/spending-capacity/")[1] == {
        "liquid_balance": "3000.00",
        "active_reserves": "2000.00",
        "safe_to_spend": "1000.00",
    }
    audit(ledger)


@pytest.mark.django_db
def test_unfunded_settlement_rolls_back_release_and_out_of_order_reversal_restores_exact_portions(
    ledger: dict[str, Any],
) -> None:
    person, obligation, _ = setup_rent(ledger)
    payment = friend_payment(ledger, obligation, person, "2000.00")
    claim = payment["event"]["claims"][0]
    spent = post_event(ledger, "expense", "2500.00")
    assert spent.status_code == 201, spent.data
    before = (
        Event.objects.count(),
        ReserveChange.objects.count(),
        WriteReceipt.objects.count(),
        AllocationRun.objects.count(),
    )
    assert settle(ledger, claim, "800.00").status_code == 409
    assert before == (
        Event.objects.count(),
        ReserveChange.objects.count(),
        WriteReceipt.objects.count(),
        AllocationRun.objects.count(),
    )
    capacity(ledger, "500.00", "2000.00", "-1500.00")
    assert claim_detail(ledger, claim)["outstanding"] == "2000.00"
    assert (
        write(
            ledger, f"transactions/{spent.json()['id']}/reverse/", {"reason": "Restore funds"}
        ).status_code
        == 201
    )
    first, last = settle(ledger, claim, "800.00"), settle(ledger, claim, "1200.00")
    assert first.status_code == last.status_code == 201
    assert (
        write(
            ledger,
            f"settlements/{first.json()['id']}/reverse/",
            {"reason": "Undo earlier payment first"},
        ).status_code
        == 201
    )
    capacity(ledger, "1800.00", "800.00", "1000.00")
    assert claim_detail(ledger, claim)["outstanding"] == "800.00"
    assert (
        write(
            ledger, f"settlements/{last.json()['id']}/reverse/", {"reason": "Undo final payment"}
        ).status_code
        == 201
    )
    capacity(ledger, "3000.00", "2000.00", "1000.00")
    audit(ledger)
