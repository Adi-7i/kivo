"""PostgreSQL/API behavior of contacts, unpaid rent and earmarks."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier
from typing import Any
from uuid import uuid4

import pytest
from apps.ledger.models import Event
from apps.sharing.models import Contact, MetadataChange, RentObligation, RentPlan, ReserveChange
from apps.sharing.rent import generate_obligations
from apps.users.models import User
from django.db import close_old_connections
from rest_framework.test import APIClient

from tests.test_ledger import ledger as ledger
from tests.test_ledger import post_event, summary


def write(
    ledger: dict[str, Any], path: str, data: dict[str, Any], *, key: str | None = None
) -> Any:
    return ledger["client"].post(
        f"/api/v1/{path}", data, format="json", HTTP_IDEMPOTENCY_KEY=key or str(uuid4())
    )


def plan(ledger: dict[str, Any], amount: str = "2000.00", **kwargs: Any) -> dict[str, Any]:
    response = write(
        ledger,
        "rent/plans/",
        {
            "title": "Room rent",
            "payee": "Landlord",
            "start_date": "2025-10-01",
            "due_day": None,
            "amount": amount,
            "category": str(ledger["category"].id),
            **kwargs,
        },
    )
    assert response.status_code == 201, response.data
    return response.json()


def generate(
    ledger: dict[str, Any], rent_plan: dict[str, Any], through: str = "2025-10-31"
) -> list[dict[str, Any]]:
    response = write(ledger, f"rent/plans/{rent_plan['id']}/generate/", {"through": through})
    assert response.status_code == 201, response.data
    return (
        ledger["client"].get(f"/api/v1/rent/plans/{rent_plan['id']}/obligations/").json()["results"]
    )


@pytest.mark.django_db
def test_contacts_crud_retry_archive_and_owner_isolation(ledger: dict[str, Any]) -> None:
    data = {"display_name": "Roommate", "is_roommate": True, "notes": "Kitchen bills"}
    first = write(ledger, "contacts/", data, key="contact")
    repeat = write(ledger, "contacts/", data, key="contact")
    assert (first.status_code, repeat.status_code) == (201, 200)
    row = first.json()
    assert row["id"] == repeat.json()["id"]
    assert row["receivable"] == row["payable"] == "0.00"
    assert (
        write(ledger, "contacts/", {**data, "display_name": "Changed"}, key="contact").status_code
        == 409
    )
    path = f"/api/v1/contacts/{row['id']}/"
    updated = ledger["client"].patch(
        path,
        {"display_name": "New name", "archived": True},
        format="json",
        HTTP_IDEMPOTENCY_KEY="archive",
    )
    assert updated.status_code == 201, updated.data
    assert updated.json()["archived"] is True
    assert Contact.objects.count() == 1 and MetadataChange.objects.count() == 2
    assert ledger["client"].get(f"{path}history/").json()["count"] == 0
    assert ledger["client"].delete(path).status_code == 405
    other = User.objects.create_user(email="other-contact@example.com")
    client = APIClient()
    client.force_authenticate(other)
    assert client.get("/api/v1/contacts/").json()["count"] == 0
    assert client.get(path).status_code == client.get(f"{path}history/").status_code == 404
    assert (
        client.patch(
            path, {"notes": "Private"}, format="json", HTTP_IDEMPOTENCY_KEY="foreign"
        ).status_code
        == 404
    )
    assert APIClient().get(path).status_code == 401


@pytest.mark.django_db
def test_rent_generation_is_unpaid_duplicate_safe_and_calendar_exact(
    ledger: dict[str, Any],
) -> None:
    rent_plan = plan(ledger, start_date="2024-01-16")
    rows = generate(ledger, rent_plan, "2024-03-31")
    assert [row["due_date"] for row in rows] == ["2024-01-31", "2024-02-29", "2024-03-31"]
    assert all(row["paid"] == "0.00" and row["status"] == "overdue" for row in rows)
    assert len(generate(ledger, rent_plan, "2024-03-31")) == 3
    assert RentObligation.objects.count() == 3 and Event.objects.count() == 0
    assert summary(ledger) == {
        "liquid_balance": "0.00",
        "personal_expense": "0.00",
        "external_receipts": "0.00",
    }
    response = ledger["client"].patch(
        f"/api/v1/rent/plans/{rent_plan['id']}/",
        {"active": False},
        format="json",
        HTTP_IDEMPOTENCY_KEY="deactivate",
    )
    assert response.status_code == 201
    assert (
        write(
            ledger, f"rent/plans/{rent_plan['id']}/generate/", {"through": "2024-04-30"}
        ).status_code
        == 409
    )
    assert RentObligation.objects.count() == 3
    assert (
        write(
            ledger,
            "rent/plans/",
            {
                "title": "Bad",
                "payee": "Landlord",
                "start_date": "2024-01-01",
                "due_day": 32,
                "amount": "100.00",
                "category": str(ledger["category"].id),
            },
        ).status_code
        == 400
    )


@pytest.mark.django_db
def test_reserves_safe_to_spend_release_skip_and_reopen(ledger: dict[str, Any]) -> None:
    assert post_event(ledger, "receipt", "3260.00").status_code == 201
    first_obligation = generate(ledger, plan(ledger))[0]
    other_obligation = generate(ledger, plan(ledger, "400.00"))[0]
    payload = {
        "obligation": first_obligation["id"],
        "label": "Main rent",
        "amount": "2000.00",
        "reason": "Earmark rent",
    }
    first = write(ledger, "rent/reserves/", payload, key="reserve")
    assert first.status_code == 201, first.data
    assert write(ledger, "rent/reserves/", payload, key="reserve").status_code == 200
    second = write(
        ledger,
        "rent/reserves/",
        {
            **payload,
            "obligation": other_obligation["id"],
            "label": "Other rent",
            "amount": "400.00",
        },
    )
    assert second.status_code == 201, second.data
    listed = ledger["client"].get("/api/v1/rent/reserves/").json()["results"]
    assert [row["id"] for row in listed] == [first.json()["id"], second.json()["id"]]
    capacity = ledger["client"].get("/api/v1/rent/spending-capacity/").json()
    assert capacity == {
        "liquid_balance": "3260.00",
        "active_reserves": "2400.00",
        "safe_to_spend": "860.00",
    }
    assert summary(ledger)["personal_expense"] == "0.00" and Event.objects.count() == 1
    assert write(ledger, "rent/reserves/", {**payload, "amount": "0.01"}).status_code == 409
    path = f"rent/reserves/{first.json()['id']}/adjust/"
    assert write(ledger, path, {"amount": "0.00", "reason": "Release earmark"}).status_code == 201
    changes = (
        ledger["client"]
        .get(f"/api/v1/rent/reserves/{first.json()['id']}/history/")
        .json()["results"]
    )
    assert [row["delta"] for row in changes] == ["2000.00", "-2000.00"]
    assert all(row["active"] for row in changes)
    assert (
        write(
            ledger,
            f"rent/obligations/{other_obligation['id']}/change-status/",
            {"action": "skip", "reason": "Not occupying room"},
        ).status_code
        == 201
    )
    assert (
        ledger["client"].get("/api/v1/rent/spending-capacity/").json()["safe_to_spend"] == "3260.00"
    )
    assert (
        write(
            ledger,
            f"rent/obligations/{other_obligation['id']}/change-status/",
            {"action": "reopen", "reason": "Correction"},
        ).status_code
        == 201
    )
    assert (
        ledger["client"].get(f"/api/v1/rent/obligations/{other_obligation['id']}/").json()["status"]
        == "overdue"
    )
    assert ReserveChange.objects.count() == 4
    from apps.sharing.rent import check_rent

    ledger["user"].is_active = False
    ledger["user"].save(update_fields=["is_active"])
    assert check_rent(ledger["user"]) == {"obligations": 2, "reserves": 2}
    from io import StringIO

    from django.core.management import call_command

    output = StringIO()
    call_command("reconcile_rent", stdout=output)
    assert "PASS: 1 owners, 2 obligations, 2 reserves" in output.getvalue()


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
def test_concurrent_month_generation_uses_real_owner_lock() -> None:
    from apps.ledger.models import Category
    from apps.sharing.rent import create_plan

    user = User.objects.create_user(email="concurrent-rent@example.com")
    category = Category.objects.create(user=user, name="Rent")
    plan_id, _ = create_plan(
        user=user,
        key="plan",
        data={
            "title": "Room",
            "payee": "Landlord",
            "start_date": date(2024, 1, 1),
            "due_day": None,
            "amount_paise": 10000,
            "category": category.id,
        },
    )
    barrier = Barrier(2)

    def generate_month(index: int) -> None:
        close_old_connections()
        try:
            worker = User.objects.get(pk=user.pk)
            barrier.wait(timeout=15)
            generate_obligations(
                user=worker, key=f"generate-{index}", plan_id=plan_id, through=date(2024, 2, 29)
            )
        finally:
            close_old_connections()

    with ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(generate_month, (1, 2)))
    assert RentPlan.objects.count() == 1 and RentObligation.objects.count() == 2
    assert Event.objects.count() == 0


@pytest.mark.django_db
def test_personal_rent_payment_correction_reversal_and_reserves_share_one_ledger(
    ledger: dict[str, Any],
) -> None:
    from apps.funds.services import check_attribution
    from apps.sharing.models import RentPayment

    from tests.test_ledger import reconcile

    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    obligation = generate(ledger, plan(ledger))[0]
    reserve = write(
        ledger,
        "rent/reserves/",
        {
            "obligation": obligation["id"],
            "label": "Rent",
            "amount": "1000.00",
            "reason": "Set aside",
        },
    )
    assert reserve.status_code == 201, reserve.data
    path = f"rent/obligations/{obligation['id']}/payments/"
    data = {"account": str(ledger["cash"].id), "effective_date": "2025-10-16", "amount": "500.00"}
    payment = write(ledger, path, data, key="rent-payment")
    assert payment.status_code == 201, payment.data
    assert write(ledger, path, data, key="rent-payment").status_code == 200
    assert summary(ledger) == {
        "liquid_balance": "500.00",
        "personal_expense": "500.00",
        "external_receipts": "1000.00",
    }
    status = ledger["client"].get(f"/api/v1/rent/obligations/{obligation['id']}/").json()
    assert (status["status"], status["paid"], status["outstanding"]) == (
        "partial",
        "500.00",
        "1500.00",
    )
    assert ledger["client"].get("/api/v1/rent/spending-capacity/").json() == {
        "liquid_balance": "500.00",
        "active_reserves": "500.00",
        "safe_to_spend": "0.00",
    }
    corrected = write(
        ledger,
        f"rent/payments/{payment.json()['id']}/correct/",
        {**data, "amount": "400.00", "reason": "Wrong amount"},
    )
    assert corrected.status_code == 201, corrected.data
    assert corrected.json()["event"]["supersedes"] == payment.json()["event"]["id"]
    assert summary(ledger)["liquid_balance"] == "600.00"
    assert (
        ledger["client"].get(f"/api/v1/rent/reserves/{reserve.json()['id']}/").json()["reserved"]
        == "600.00"
    )
    assert (
        write(
            ledger,
            f"rent/payments/{corrected.json()['id']}/reverse/",
            {"reason": "Payment cancelled"},
        ).status_code
        == 201
    )
    assert (
        summary(ledger)["liquid_balance"] == "1000.00"
        and summary(ledger)["personal_expense"] == "0.00"
    )
    assert (
        ledger["client"].get(f"/api/v1/rent/reserves/{reserve.json()['id']}/").json()["reserved"]
        == "1000.00"
    )
    count = Event.objects.count()
    assert (
        write(ledger, path, {**data, "amount": "1500.00"}, key="retry-insufficient").status_code
        == 409
    )
    assert Event.objects.count() == count and RentPayment.objects.count() == 2
    assert post_event(ledger, "receipt", "1000.00").status_code == 201
    full = write(ledger, path, {**data, "amount": "2000.00"})
    assert full.status_code == 201, full.data
    assert (
        ledger["client"].get(f"/api/v1/rent/obligations/{obligation['id']}/").json()["status"]
        == "paid"
    )
    assert ledger["client"].get("/api/v1/rent/spending-capacity/").json() == {
        "liquid_balance": "0.00",
        "active_reserves": "0.00",
        "safe_to_spend": "0.00",
    }
    assert write(ledger, path, {**data, "amount": "0.01"}).status_code == 409
    assert (
        summary(ledger)["personal_expense"] == "2000.00"
        and summary(ledger)["external_receipts"] == "2000.00"
    )
    check_attribution(ledger["user"])
    reconcile(ledger["user"])


@pytest.mark.django_db
def test_gifts_are_personal_expense_and_preserve_archived_contact_history(
    ledger: dict[str, Any],
) -> None:
    from django.db.models.deletion import ProtectedError

    assert post_event(ledger, "receipt", "100.00").status_code == 201
    contact = write(ledger, "contacts/", {"display_name": "Friend"}).json()
    gift = post_event(ledger, "expense", "30.00", contact=contact["id"], classification="gift")
    assert gift.status_code == 201, gift.data
    assert summary(ledger)["personal_expense"] == "30.00"
    assert ledger["client"].get(f"/api/v1/contacts/{contact['id']}/").json()["receivable"] == "0.00"
    archived = ledger["client"].patch(
        f"/api/v1/contacts/{contact['id']}/",
        {"archived": True},
        format="json",
        HTTP_IDEMPOTENCY_KEY="archive-gift",
    )
    assert archived.status_code == 201, archived.data
    history = ledger["client"].get(f"/api/v1/contacts/{contact['id']}/history/").json()["results"]
    assert history[0]["id"] == gift.json()["id"] and history[0]["classification"] == "gift"
    assert (
        post_event(
            ledger, "expense", "1.00", contact=contact["id"], classification="treat"
        ).status_code
        == 400
    )
    with pytest.raises(ProtectedError):
        Contact.objects.get(pk=contact["id"]).delete()


@pytest.mark.django_db
def test_shared_rent_uses_one_bill_and_consumes_reserve_with_owner_expense_only(
    ledger: dict[str, Any],
) -> None:
    from apps.funds.services import check_attribution
    from apps.sharing.models import SharedBill

    contact = write(ledger, "contacts/", {"display_name": "Roommate"}).json()
    rent_plan = plan(
        ledger,
        "100.00",
        split_method="equal",
        participants=[{"contact": None}, {"contact": contact["id"]}],
    )
    obligation = generate(ledger, rent_plan)[0]
    assert post_event(ledger, "receipt", "100.00").status_code == 201
    reserve = write(
        ledger,
        "rent/reserves/",
        {"obligation": obligation["id"], "label": "Room", "amount": "100.00", "reason": "Earmark"},
    )
    assert reserve.status_code == 201, reserve.data
    before = Event.objects.count()
    response = write(
        ledger,
        f"rent/obligations/{obligation['id']}/payments/",
        {"account": str(ledger["cash"].id), "amount": "20.00", "effective_date": "2025-10-16"},
        key="shared-approved",
    )
    assert response.status_code == 201, response.data
    assert Event.objects.count() == before + 1
    assert SharedBill.objects.count() == 1
    assert summary(ledger)["liquid_balance"] == "80.00"
    assert summary(ledger)["personal_expense"] == "10.00"
    assert (
        ledger["client"].get(f"/api/v1/contacts/{contact['id']}/").json()["receivable"] == "10.00"
    )
    assert (
        ledger["client"].get(f"/api/v1/rent/reserves/{reserve.json()['id']}/").json()["reserved"]
        == "80.00"
    )
    check_attribution(ledger["user"])
