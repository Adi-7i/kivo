"""Socket-level session/CSRF and financial flows against isolated PostgreSQL."""

from __future__ import annotations

import json
from http.cookiejar import CookieJar
from typing import Any
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen

import pytest
from apps.users.models import User

from tests.test_ledger import reconcile


@pytest.mark.integration
@pytest.mark.django_db(transaction=True)
def test_real_http_financial_lifecycle(live_server: Any) -> None:
    cookies = CookieJar()
    opener = build_opener(HTTPCookieProcessor(cookies))

    def request(path: str, data: dict[str, Any] | None = None, *, key: str = "") -> tuple[int, Any]:
        csrf = next((cookie.value for cookie in cookies if cookie.name == "csrftoken"), "")
        headers = {"Content-Type": "application/json", "X-CSRFToken": csrf}
        if key:
            headers["Idempotency-Key"] = key
        body = json.dumps(data).encode() if data is not None else None
        with opener.open(
            Request(f"{live_server.url}{path}", data=body, headers=headers), timeout=30
        ) as response:
            return response.status, json.loads(response.read() or b"null")

    assert request("/api/v1/auth/csrf/")[0] == 200
    credentials = {"email": "real-http@example.com", "password": "CorrectPassword123!"}
    assert request("/api/v1/auth/register/", credentials)[0] == 201
    assert request("/api/v1/auth/login/", credentials)[0] == 200
    assert request("/api/v1/auth/me/")[1]["email"] == credentials["email"]

    account_ids = []
    for name, kind in (("Bank", "bank"), ("Cash", "cash")):
        code, account = request(
            "/api/v1/accounts/", {"name": name, "kind": kind, "opened_on": "2025-01-01"}, key=name
        )
        assert code == 201
        account_ids.append(account["id"])
    code, category = request("/api/v1/categories/", {"name": "Food"})
    assert code == 201
    base = {"account": account_ids[0], "effective_date": "2025-10-16", "title": "HTTP flow"}
    receipt = {**base, "kind": "receipt", "amount": "1000.00", "funding_source": "Family"}
    first = request("/api/v1/transactions/", receipt, key="receipt")
    replay = request("/api/v1/transactions/", receipt, key="receipt")
    assert first[0] == 201 and replay[0] == 200
    assert first[1]["id"] == replay[1]["id"]
    expenses = []
    for amount in ("120.00", "40.00"):
        code, expense = request(
            "/api/v1/transactions/",
            {**base, "kind": "expense", "amount": amount, "category": category["id"]},
            key=amount,
        )
        assert code == 201
        expenses.append(expense)
    assert request("/api/v1/accounts/summary/")[1]["liquid_balance"] == "840.00"
    assert (
        request(
            "/api/v1/transactions/",
            {**base, "kind": "transfer", "amount": "200.00", "destination": account_ids[1]},
            key="transfer",
        )[0]
        == 201
    )
    assert request("/api/v1/accounts/summary/")[1]["liquid_balance"] == "840.00"
    assert (
        request(
            "/api/v1/transactions/",
            {**base, "kind": "refund", "amount": "20.00", "original_expense": expenses[0]["id"]},
            key="refund",
        )[0]
        == 201
    )
    assert request("/api/v1/accounts/summary/")[1] == {
        "liquid_balance": "860.00",
        "personal_expense": "140.00",
        "external_receipts": "1000.00",
    }
    reconcile(User.objects.get(email=credentials["email"]))
    fund_summary = request("/api/v1/funds/summary/")[1]
    assert fund_summary["attribution_status"] == "complete"
    assert fund_summary["allocated_amount"] == "140.00"
    assert fund_summary["remaining_capacity"] == "860.00"
    fund = request("/api/v1/funds/batches/")[1]["results"][0]
    assert fund["source_event"] == first[1]["id"]
    assert request(f"/api/v1/funds/batches/{fund['id']}/journey/")[1]["count"] == 4
    code, contact = request(
        "/api/v1/contacts/", {"display_name": "HTTP roommate", "is_roommate": True}, key="contact"
    )
    assert code == 201
    code, gift = request(
        "/api/v1/transactions/",
        {
            **base,
            "kind": "expense",
            "amount": "10.00",
            "category": category["id"],
            "contact": contact["id"],
            "classification": "gift",
        },
        key="gift",
    )
    assert code == 201
    assert (
        request(f"/api/v1/contacts/{contact['id']}/history/")[1]["results"][0]["id"] == gift["id"]
    )
    code, rent_plan = request(
        "/api/v1/rent/plans/",
        {
            "title": "Personal rent",
            "payee": "Landlord",
            "start_date": "2025-10-01",
            "due_day": None,
            "amount": "100.00",
            "category": category["id"],
        },
        key="rent-plan",
    )
    assert code == 201
    assert (
        request(
            f"/api/v1/rent/plans/{rent_plan['id']}/generate/",
            {"through": "2025-10-31"},
            key="generate",
        )[0]
        == 201
    )
    obligation = request(f"/api/v1/rent/plans/{rent_plan['id']}/obligations/")[1]["results"][0]
    assert obligation["paid"] == "0.00"
    assert (
        request(
            "/api/v1/rent/reserves/",
            {
                "obligation": obligation["id"],
                "label": "October",
                "amount": "100.00",
                "reason": "Set aside",
            },
            key="reserve",
        )[0]
        == 201
    )
    assert request("/api/v1/rent/spending-capacity/")[1] == {
        "liquid_balance": "850.00",
        "active_reserves": "100.00",
        "safe_to_spend": "750.00",
    }
    code, payment = request(
        f"/api/v1/rent/obligations/{obligation['id']}/payments/",
        {"account": account_ids[0], "effective_date": "2025-10-16", "amount": "50.00"},
        key="rent-payment",
    )
    assert code == 201
    assert request("/api/v1/rent/spending-capacity/")[1] == {
        "liquid_balance": "800.00",
        "active_reserves": "50.00",
        "safe_to_spend": "750.00",
    }
    assert (
        request(
            f"/api/v1/rent/payments/{payment['id']}/reverse/",
            {"reason": "Correction"},
            key="reverse-rent",
        )[0]
        == 201
    )
    assert request("/api/v1/rent/spending-capacity/")[1] == {
        "liquid_balance": "850.00",
        "active_reserves": "100.00",
        "safe_to_spend": "750.00",
    }
    assert request("/api/v1/accounts/summary/")[1]["personal_expense"] == "150.00"
    code, loan = request(
        "/api/v1/loans/",
        {
            **base,
            "kind": "lend",
            "amount": "300.00",
            "contact": contact["id"],
        },
        key="http-lend",
    )
    assert code == 201
    assert request("/api/v1/accounts/summary/")[1]["liquid_balance"] == "550.00"
    code, settlement = request(
        "/api/v1/settlements/",
        {
            **base,
            "claim": loan["claims"][0],
            "amount": "100.00",
        },
        key="http-recover",
    )
    assert code == 201
    assert request(f"/api/v1/claims/{loan['claims'][0]}/")[1]["outstanding"] == "200.00"
    code, shared = request(
        "/api/v1/shared-bills/",
        {
            **base,
            "amount": "60.00",
            "category": category["id"],
            "split_method": "equal",
            "participants": [{"contact": None}, {"contact": contact["id"]}],
        },
        key="http-shared",
    )
    assert code == 201
    assert request("/api/v1/accounts/summary/")[1] == {
        "liquid_balance": "590.00",
        "personal_expense": "180.00",
        "external_receipts": "1000.00",
    }
    assert request(f"/api/v1/contacts/{contact['id']}/")[1]["receivable"] == "230.00"
    assert request("/api/v1/funds/summary/")[1]["remaining_capacity"] == "820.00"
    reconcile(User.objects.get(email=credentials["email"]))
    with pytest.raises(HTTPError) as anonymous:
        urlopen(f"{live_server.url}/api/v1/accounts/", timeout=30)
    assert anonymous.value.code == 401
    assert request("/api/v1/auth/logout/", {})[0] == 204
    with pytest.raises(HTTPError) as logged_out:
        request("/api/v1/accounts/")
    assert logged_out.value.code == 401
