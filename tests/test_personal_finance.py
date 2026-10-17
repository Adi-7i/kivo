"""Real PostgreSQL/API verification of approved claims and shared accounting."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from typing import Any
from uuid import UUID

import pytest
from apps.funds.models import AllocationRun, ClaimPosition
from apps.funds.services import check_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Event, Posting, WriteReceipt
from apps.sharing.finance import write_financial
from apps.sharing.models import BillShare, Claim, SharedBill
from apps.sharing.rent import check_rent
from apps.users.models import User
from django.core.management import call_command
from django.db import IntegrityError, close_old_connections, connection, transaction
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event, summary
from tests.test_rent import generate, plan, write


def contact(ledger: dict[str, Any], name: str = "Friend") -> str:
    response = write(ledger, "contacts/", {"display_name": name})
    assert response.status_code == 201, response.data
    return response.json()["id"]


def loan(ledger: dict[str, Any], person: str, kind: str, amount: str, **kwargs: Any) -> Any:
    return write(
        ledger,
        "loans/",
        {
            "kind": kind,
            "contact": person,
            "amount": amount,
            "account": str(ledger["cash"].id),
            "effective_date": "2025-10-16",
            "title": kind,
            **kwargs,
        },
    )


def settle(ledger: dict[str, Any], claim: str, amount: str, **kwargs: Any) -> Any:
    return write(
        ledger,
        "settlements/",
        {
            "claim": claim,
            "amount": amount,
            "account": str(ledger["cash"].id),
            "effective_date": "2025-10-16",
            "title": "Settlement",
            **kwargs,
        },
    )


def bill(ledger: dict[str, Any], people: list[str], amount: str, **kwargs: Any) -> Any:
    data = {
        "amount": amount,
        "account": str(ledger["cash"].id),
        "effective_date": "2025-10-16",
        "title": "Shared bill",
        "category": str(ledger["category"].id),
        "split_method": "equal",
        "participants": [{"contact": None}, *[{"contact": person} for person in people]],
        **kwargs,
    }
    return write(ledger, "shared-bills/", data)


def claim_detail(ledger: dict[str, Any], claim_id: str) -> dict[str, Any]:
    response = ledger["client"].get(f"/api/v1/claims/{claim_id}/")
    assert response.status_code == 200, response.data
    return response.json()


def audit(ledger: dict[str, Any]) -> None:
    check_attribution(ledger["user"])
    check_rent(ledger["user"])
    call_command("reconcile_ledger")
    with connection.cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
        cursor.execute("SET CONSTRAINTS ALL DEFERRED")


@pytest.mark.django_db
def test_required_lending_borrowing_partial_and_full_repayments(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    lent = loan(ledger, person, "lend", "300.00")
    assert lent.status_code == 201, lent.data
    receivable = lent.json()["claims"][0]
    assert summary(ledger) == {
        "liquid_balance": "700.00",
        "personal_expense": "0.00",
        "external_receipts": "1000.00",
    }
    assert claim_detail(ledger, receivable)["outstanding"] == "300.00"
    received = settle(ledger, receivable, "100.00")
    assert received.status_code == 201, received.data
    assert summary(ledger)["liquid_balance"] == "800.00"
    assert claim_detail(ledger, receivable)["outstanding"] == "200.00"
    borrowed = loan(ledger, person, "borrow", "500.00")
    assert borrowed.status_code == 201, borrowed.data
    payable = borrowed.json()["claims"][0]
    assert summary(ledger) == {
        "liquid_balance": "1300.00",
        "personal_expense": "0.00",
        "external_receipts": "1000.00",
    }
    assert settle(ledger, payable, "200.00").status_code == 201
    assert claim_detail(ledger, payable)["outstanding"] == "300.00"
    assert summary(ledger)["liquid_balance"] == "1100.00"
    before = (Event.objects.count(), WriteReceipt.objects.count(), AllocationRun.objects.count())
    assert settle(ledger, receivable, "200.01").status_code == 409
    assert settle(ledger, payable, "300.01").status_code == 409
    assert before == (
        Event.objects.count(),
        WriteReceipt.objects.count(),
        AllocationRun.objects.count(),
    )
    assert settle(ledger, receivable, "200.00").status_code == 201
    assert settle(ledger, payable, "300.00").status_code == 201
    assert claim_detail(ledger, receivable)["status"] == "settled"
    assert claim_detail(ledger, payable)["status"] == "settled"
    assert summary(ledger) == {
        "liquid_balance": "1000.00",
        "personal_expense": "0.00",
        "external_receipts": "1000.00",
    }
    audit(ledger)


@pytest.mark.django_db(transaction=True)
def test_direct_postgresql_settlements_are_serialized_and_capped(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    created = loan(ledger, person, "borrow", "100.00")
    assert created.status_code == 201, created.data
    claim_id = created.json()["claims"][0]
    barrier = Barrier(2)

    def worker(index: int) -> str:
        close_old_connections()
        try:
            barrier.wait(timeout=30)
            with transaction.atomic():
                event = Event.objects.create(
                    user_id=ledger["user"].pk,
                    kind="repay_out",
                    account_id=ledger["cash"].id,
                    contact_id=person,
                    amount_paise=8000,
                    effective_date=date(2025, 10, 16),
                    title=f"Direct worker {index}",
                )
                Posting.objects.bulk_create(
                    [
                        Posting(
                            event=event,
                            book="liquid",
                            account_id=ledger["cash"].id,
                            amount_paise=-8000,
                        ),
                        Posting(event=event, book="payable", claim_id=claim_id, amount_paise=8000),
                    ]
                )
            return "created"
        except IntegrityError:
            return "rejected"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(worker, range(2)))
    assert sorted(results) == ["created", "rejected"]
    assert claim_detail(ledger, claim_id)["outstanding"] == "20.00"
    assert Event.objects.filter(kind="repay_out").count() == 1
    # Direct writes are constraint probes, not the public service: rebuild explicitly.
    from apps.funds.services import rebuild_attribution

    rebuild_attribution(user=ledger["user"])
    audit(ledger)


@pytest.mark.django_db
def test_shared_6000_owner_share_and_reimbursement_are_not_income(ledger: dict[str, Any]) -> None:
    people = [contact(ledger, "A"), contact(ledger, "B")]
    assert post_event(ledger, "receipt", "6000.00").status_code == 201
    response = bill(ledger, people, "6000.00")
    assert response.status_code == 201, response.data
    result = response.json()
    assert summary(ledger) == {
        "liquid_balance": "0.00",
        "personal_expense": "2000.00",
        "external_receipts": "6000.00",
    }
    assert len(result["event"]["financial_effects"]) == 4
    shares = [row for row in result["shares"] if row["contact"]]
    assert [row["amount"] for row in shares] == ["2000.00", "2000.00"]
    assert ClaimPosition.objects.filter(run=AllocationRun.objects.latest("id")).count() == 2
    assert settle(ledger, shares[0]["claim"], "2000.00").status_code == 201
    assert summary(ledger) == {
        "liquid_balance": "2000.00",
        "personal_expense": "2000.00",
        "external_receipts": "6000.00",
    }
    assert claim_detail(ledger, shares[0]["claim"])["outstanding"] == "0.00"
    audit(ledger)


@pytest.mark.django_db
def test_friend_paid_recognizes_expense_once_and_settlement_attributes_original_bill(
    ledger: dict[str, Any],
) -> None:
    person = contact(ledger)
    response = bill(ledger, [person], "6000.00", payer=person, account=None)
    assert response.status_code == 201, response.data
    bill_id = response.json()["id"]
    claim = next(row["claim"] for row in response.json()["shares"] if row["contact"] is None)
    assert summary(ledger) == {
        "liquid_balance": "0.00",
        "personal_expense": "3000.00",
        "external_receipts": "0.00",
    }
    assert claim_detail(ledger, claim)["outstanding"] == "3000.00"
    assert post_event(ledger, "receipt", "3000.00").status_code == 201
    settled = settle(ledger, claim, "1000.00")
    assert settled.status_code == 201, settled.data
    assert summary(ledger)["personal_expense"] == "3000.00"
    assert summary(ledger)["liquid_balance"] == "2000.00"
    assert claim_detail(ledger, claim)["outstanding"] == "2000.00"
    allocations = (
        ledger["client"]
        .get(f"/api/v1/funds/allocations/?transaction={settled.json()['id']}")
        .json()["results"]
    )
    assert allocations[0]["kind"] == "expense"
    assert allocations[0]["expense_event"] == response.json()["event"]["id"]
    assert (
        write(
            ledger, f"shared-bills/{bill_id}/reverse/", {"reason": "Must reverse settlement first"}
        ).status_code
        == 409
    )
    assert (
        write(
            ledger, f"settlements/{settled.json()['id']}/reverse/", {"reason": "Undo payment"}
        ).status_code
        == 201
    )
    assert (
        write(ledger, f"shared-bills/{bill_id}/reverse/", {"reason": "Cancel bill"}).status_code
        == 201
    )
    assert summary(ledger)["personal_expense"] == "0.00"
    assert claim_detail(ledger, claim)["status"] == "cancelled"
    audit(ledger)


@pytest.mark.django_db
def test_custom_split_zero_owner_and_invalid_totals_rollback(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    before = (Event.objects.count(), SharedBill.objects.count(), Claim.objects.count())
    bad = bill(
        ledger,
        [person],
        "100.00",
        split_method="custom",
        participants=[{"contact": None, "amount": "20.00"}, {"contact": person, "amount": "70.00"}],
    )
    assert bad.status_code == 400
    assert before == (Event.objects.count(), SharedBill.objects.count(), Claim.objects.count())
    good = bill(
        ledger,
        [person],
        "100.00",
        split_method="custom",
        participants=[{"contact": None, "amount": "0.00"}, {"contact": person, "amount": "100.00"}],
    )
    assert good.status_code == 201, good.data
    assert summary(ledger)["personal_expense"] == "0.00"
    friend = bill(
        ledger,
        [person],
        "100.00",
        payer=person,
        account=None,
        split_method="custom",
        participants=[{"contact": None, "amount": "0.00"}, {"contact": person, "amount": "100.00"}],
    )
    assert friend.status_code == 201, friend.data
    assert friend.json()["event"]["financial_effects"] == []
    audit(ledger)


@pytest.mark.django_db
def test_backdated_origins_settlement_correction_and_reversal_preserve_claim_history(
    ledger: dict[str, Any],
) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    origin = loan(ledger, person, "lend", "80.00")
    assert origin.status_code == 201, origin.data
    claim = origin.json()["claims"][0]
    assert settle(ledger, claim, "10.00", effective_date="2025-10-15").status_code == 400
    payment = settle(ledger, claim, "50.00", effective_date="2025-10-17")
    assert payment.status_code == 201, payment.data
    corrected = write(
        ledger,
        f"settlements/{payment.json()['id']}/correct/",
        {
            "claim": claim,
            "amount": "40.00",
            "account": str(ledger["bank"].id),
            "effective_date": "2025-10-17",
            "title": "Correct destination",
            "reason": "Bank receipt",
        },
    )
    assert corrected.status_code == 201, corrected.data
    assert claim_detail(ledger, claim)["outstanding"] == "40.00"
    assert (
        write(ledger, f"loans/{origin.json()['id']}/reverse/", {"reason": "Dependent"}).status_code
        == 409
    )
    assert (
        write(
            ledger, f"settlements/{corrected.json()['id']}/reverse/", {"reason": "Undo"}
        ).status_code
        == 201
    )
    replacement = write(
        ledger,
        f"loans/{origin.json()['id']}/correct/",
        {
            "kind": "lend",
            "contact": person,
            "amount": "60.00",
            "account": str(ledger["cash"].id),
            "effective_date": "2025-10-16",
            "title": "Correct principal",
            "reason": "Actual amount",
        },
    )
    assert replacement.status_code == 201, replacement.data
    assert claim_detail(ledger, claim)["status"] == "cancelled"
    assert claim_detail(ledger, replacement.json()["claims"][0])["outstanding"] == "60.00"
    assert summary(ledger)["liquid_balance"] == "40.00"
    audit(ledger)


@pytest.mark.django_db
def test_unfunded_lending_and_shared_bill_fail_atomically(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    before = (Event.objects.count(), Claim.objects.count(), WriteReceipt.objects.count())
    assert loan(ledger, person, "lend", "1.00").status_code == 409
    assert bill(ledger, [person], "1.00").status_code == 409
    assert before == (Event.objects.count(), Claim.objects.count(), WriteReceipt.objects.count())
    assert SharedBill.objects.count() == BillShare.objects.count() == 0


@pytest.mark.django_db
def test_owner_isolation_all_financial_endpoints_and_foreign_keys(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    created = loan(ledger, person, "lend", "20.00").json()
    shared = bill(ledger, [person], "20.00").json()
    foreign = User.objects.create_user(email="foreign-claims@example.com")
    client = APIClient()
    client.force_authenticate(foreign)
    for path in (
        f"claims/{created['claims'][0]}/",
        f"claims/{created['claims'][0]}/history/",
        f"loans/{created['id']}/",
        f"shared-bills/{shared['id']}/",
    ):
        assert client.get(f"/api/v1/{path}").status_code == 404
    for path in ("claims/", "loans/", "settlements/", "shared-bills/"):
        assert client.get(f"/api/v1/{path}").json()["count"] == 0
    before = Event.objects.count()
    payload = {
        "claim": created["claims"][0],
        "account": str(ledger["cash"].id),
        "amount": "1.00",
        "effective_date": "2025-10-16",
        "title": "Cross owner",
    }
    assert (
        client.post(
            "/api/v1/settlements/", payload, format="json", HTTP_IDEMPOTENCY_KEY="foreign"
        ).status_code
        == 404
    )
    assert Event.objects.count() == before
    assert APIClient().get("/api/v1/claims/").status_code == 401
    assert loan({**ledger, "client": client}, person, "borrow", "1.00").status_code == 404
    from apps.ledger.models import Account, Category
    from apps.sharing.models import Contact

    foreign_account = Account.objects.create(
        user=foreign, name="Foreign", kind="cash", opened_on=date(2025, 1, 1)
    )
    foreign_category = Category.objects.create(user=foreign, name="Foreign")
    foreign_contact = Contact.objects.create(user=foreign, display_name="Foreign")
    assert loan(ledger, person, "lend", "1.00", account=str(foreign_account.id)).status_code == 404
    assert bill(ledger, [person], "1.00", category=str(foreign_category.id)).status_code == 404
    assert bill(ledger, [str(foreign_contact.id)], "1.00").status_code == 404
    assert (
        client.post(
            f"/api/v1/loans/{created['id']}/reverse/",
            {"reason": "Foreign"},
            format="json",
            HTTP_IDEMPOTENCY_KEY="foreign-reverse",
        ).status_code
        == 404
    )
    assert Event.objects.count() == before


@pytest.mark.django_db
def test_idempotent_financial_writes_conflict_and_same_ids(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    data = {
        "kind": "borrow",
        "contact": person,
        "amount": "100.00",
        "account": str(ledger["cash"].id),
        "effective_date": "2025-10-16",
        "title": "Borrow",
    }
    first = write(ledger, "loans/", data, key="loan-retry")
    repeat = write(ledger, "loans/", data, key="loan-retry")
    assert (first.status_code, repeat.status_code) == (201, 200)
    assert first.json()["id"] == repeat.json()["id"]
    assert write(ledger, "loans/", {**data, "amount": "99.00"}, key="loan-retry").status_code == 409
    assert Event.objects.filter(kind="borrow").count() == Claim.objects.count() == 1
    audit(ledger)


@pytest.mark.django_db(transaction=True)
@pytest.mark.parametrize("same_key", [True, False])
@pytest.mark.parametrize("direction", ["lend", "borrow"])
def test_concurrent_settlements_cannot_duplicate_or_overpay(
    ledger: dict[str, Any], same_key: bool, direction: str
) -> None:
    person = contact(ledger)
    if direction == "lend":
        assert post_event(ledger, "receipt", "100.00").status_code == 201
    created = loan(ledger, person, direction, "100.00")
    assert created.status_code == 201, created.data
    claim = UUID(created.json()["claims"][0])
    barrier = Barrier(2)

    def worker(index: int) -> str:
        close_old_connections()
        try:
            user = User.objects.get(pk=ledger["user"].pk)
            barrier.wait(timeout=30)
            _, replayed = write_financial(
                user=user,
                key="concurrent" if same_key else f"concurrent-{index}",
                operation="settlement",
                data={
                    "claim": claim,
                    "account": ledger["cash"].id,
                    "amount_paise": 8000,
                    "effective_date": date(2025, 10, 16),
                    "title": "Repayment",
                },
            )
            return "replayed" if replayed else "created"
        except FinancialConflict:
            return "conflict"
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(worker, range(2)))
    assert sorted(results) == sorted(["created", "replayed" if same_key else "conflict"])
    assert claim_detail(ledger, str(claim))["outstanding"] == "20.00"
    assert (
        Event.objects.filter(kind="repay_in" if direction == "lend" else "repay_out").count() == 1
    )
    audit(ledger)


@pytest.mark.django_db
def test_postgresql_rejects_unbalanced_and_excess_claim_postings(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    created = loan(ledger, person, "borrow", "10.00")
    assert created.status_code == 201, created.data
    claim = Claim.objects.get(pk=created.json()["claims"][0])
    for amount in (1001, 500):
        with pytest.raises(IntegrityError), transaction.atomic():
            event = Event.objects.create(
                user=ledger["user"],
                kind="repay_out",
                account=ledger["cash"],
                contact_id=person,
                amount_paise=amount,
                effective_date=date(2025, 10, 16),
                title="Invalid direct posting",
            )
            Posting.objects.create(
                event=event, account=ledger["cash"], book="liquid", amount_paise=-amount
            )
            Posting.objects.create(
                event=event,
                claim=claim,
                book="payable",
                amount_paise=amount if amount == 1001 else 499,
            )
            with connection.cursor() as cursor:
                cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
    assert claim_detail(ledger, str(claim.id))["outstanding"] == "10.00"
    audit(ledger)


@pytest.mark.django_db
def test_database_multibatch_recovery_and_backdated_source_rebuild(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    assert post_event(ledger, "receipt", "500.00").status_code == 201
    created = loan(ledger, person, "lend", "1200.00")
    assert created.status_code == 201, created.data
    recovered = settle(
        ledger, created.json()["claims"][0], "1100.00", account=str(ledger["bank"].id)
    )
    assert recovered.status_code == 201, recovered.data
    rows = (
        ledger["client"]
        .get(f"/api/v1/funds/allocations/?transaction={recovered.json()['id']}")
        .json()["results"]
    )
    assert [row["amount"] for row in rows] == ["1000.00", "100.00"]
    assert all(row["kind"] == "recover" for row in rows)
    previous = AllocationRun.objects.latest("id")
    assert post_event(ledger, "receipt", "100.00", effective_date="2025-10-15").status_code == 201
    new_rows = (
        ledger["client"]
        .get(f"/api/v1/funds/allocations/?transaction={recovered.json()['id']}")
        .json()["results"]
    )
    assert [row["amount"] for row in new_rows] == ["100.00", "1000.00"]
    assert previous.allocations.filter(event__public_id=recovered.json()["id"]).count() == 2
    assert claim_detail(ledger, created.json()["claims"][0])["outstanding"] == "100.00"
    assert summary(ledger)["liquid_balance"] == "1500.00"
    assert (
        post_event(
            ledger,
            "expense",
            "1100.00",
            account=str(ledger["bank"].id),
            effective_date="2025-10-17",
        ).status_code
        == 201
    )
    assert (
        write(
            ledger,
            f"settlements/{recovered.json()['id']}/reverse/",
            {"reason": "Would unfund bank history"},
        ).status_code
        == 409
    )
    assert claim_detail(ledger, created.json()["claims"][0])["outstanding"] == "100.00"
    audit(ledger)


@pytest.mark.django_db
def test_shared_bill_correction_cancels_old_claims_and_preserves_audit(
    ledger: dict[str, Any],
) -> None:
    people = [contact(ledger, "A"), contact(ledger, "B")]
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    original = bill(ledger, people, "60.00")
    assert original.status_code == 201, original.data
    replacement = write(
        ledger,
        f"shared-bills/{original.json()['id']}/correct/",
        {
            "amount": "45.00",
            "account": str(ledger["cash"].id),
            "effective_date": "2025-10-16",
            "title": "Corrected bill",
            "category": str(ledger["category"].id),
            "split_method": "equal",
            "participants": [{"contact": None}, *[{"contact": person} for person in people]],
            "reason": "Actual total",
        },
    )
    assert replacement.status_code == 201, replacement.data
    assert summary(ledger)["personal_expense"] == "15.00"
    assert summary(ledger)["liquid_balance"] == "55.00"
    for claim in original.json()["event"]["claims"]:
        assert claim_detail(ledger, claim)["status"] == "cancelled"
    assert replacement.json()["event"]["supersedes"] == original.json()["event"]["id"]
    assert (
        write(
            ledger, f"shared-bills/{replacement.json()['id']}/reverse/", {"reason": "Cancelled"}
        ).status_code
        == 201
    )
    assert summary(ledger)["personal_expense"] == "0.00"
    assert summary(ledger)["liquid_balance"] == "100.00"
    audit(ledger)


@pytest.mark.django_db
def test_real_v1_snapshot_is_readable_immutable_and_retained_after_v2_lending(
    ledger: dict[str, Any],
) -> None:
    from apps.funds.engine import POLICY_VERSION as V1_POLICY
    from apps.funds.engine import Entry as V1Entry
    from apps.funds.engine import allocate as allocate_v1
    from apps.funds.models import Allocation, BatchCapacity, FundingBatch, FundPosition

    person = contact(ledger)
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    assert post_event(ledger, "expense", "20.00").status_code == 201
    events = list(Event.objects.order_by("id"))
    result = allocate_v1(
        [
            V1Entry(row.id, row.kind, row.amount_paise, row.effective_date, row.id, row.account_id)
            for row in events
        ]
    )
    batch = FundingBatch.objects.get(source=events[0])
    previous = AllocationRun.objects.latest("id")
    historic = AllocationRun.objects.create(
        user=ledger["user"],
        policy_version=V1_POLICY,
        input_hash="a" * 64,
        status="complete",
        previous=previous,
    )
    capacity = result.capacities[0]
    BatchCapacity.objects.create(
        run=historic,
        batch=batch,
        original_paise=capacity.original_paise,
        allocated_paise=capacity.allocated_paise,
        remaining_paise=capacity.remaining_paise,
        exhausted_on=capacity.exhausted_on,
    )
    FundPosition.objects.create(
        run=historic, batch=batch, account=ledger["cash"], amount_paise=8000
    )
    movement = result.movements[0]
    Allocation.objects.create(
        run=historic,
        batch=batch,
        event_id=movement.event_id,
        kind=movement.kind,
        amount_paise=movement.amount_paise,
        from_account_id=movement.from_account_id,
    )
    with connection.cursor() as cursor:
        cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
        cursor.execute("SET CONSTRAINTS ALL DEFERRED")
    assert loan(ledger, person, "lend", "10.00").status_code == 201
    old = ledger["client"].get(f"/api/v1/funds/batches/{batch.id}/?run={historic.public_id}").json()
    assert old["policy_version"] == "account-fifo-v1"
    assert old["positions"] == [{"account": str(ledger["cash"].id), "amount": "80.00"}]
    assert old["receivable_positions"] == []
    assert historic.allocations.count() == 1
    with pytest.raises(IntegrityError), transaction.atomic():
        AllocationRun.objects.filter(pk=historic.pk).update(policy_version="account-fifo-v2")
    audit(ledger)


@pytest.mark.django_db
def test_shared_rent_correction_settlement_dependency_and_reversal(ledger: dict[str, Any]) -> None:
    person = contact(ledger)
    rent_plan = plan(
        ledger,
        "6000.00",
        split_method="equal",
        participants=[{"contact": None}, {"contact": person}],
    )
    obligation = generate(ledger, rent_plan)[0]
    assert summary(ledger)["personal_expense"] == "0.00"
    assert post_event(ledger, "receipt", "6000.00").status_code == 201
    created = write(
        ledger,
        f"rent/obligations/{obligation['id']}/payments/",
        {"account": str(ledger["cash"].id), "amount": "3000.00", "effective_date": "2025-10-16"},
    )
    assert created.status_code == 201, created.data
    corrected = write(
        ledger,
        f"rent/payments/{created.json()['id']}/correct/",
        {
            "account": str(ledger["cash"].id),
            "amount": "2000.00",
            "effective_date": "2025-10-16",
            "reason": "Correct amount",
        },
    )
    assert corrected.status_code == 201, corrected.data
    assert summary(ledger)["personal_expense"] == "1000.00"
    claim = corrected.json()["event"]["claims"][0]
    settlement = settle(ledger, claim, "1000.00")
    assert settlement.status_code == 201, settlement.data
    assert (
        write(
            ledger, f"rent/payments/{corrected.json()['id']}/reverse/", {"reason": "Dependency"}
        ).status_code
        == 409
    )
    assert (
        write(
            ledger, f"settlements/{settlement.json()['id']}/reverse/", {"reason": "Undo"}
        ).status_code
        == 201
    )
    assert (
        write(
            ledger, f"rent/payments/{corrected.json()['id']}/reverse/", {"reason": "Undo rent"}
        ).status_code
        == 201
    )
    assert (
        ledger["client"].get(f"/api/v1/rent/obligations/{obligation['id']}/").json()["paid"]
        == "0.00"
    )
    assert summary(ledger)["liquid_balance"] == "6000.00"
    assert summary(ledger)["personal_expense"] == "0.00"
    audit(ledger)
