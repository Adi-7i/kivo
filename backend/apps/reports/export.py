"""Bounded-memory UTF-8 CSV, using the same validated history selection."""

from __future__ import annotations

import csv
from collections.abc import Generator
from typing import Any

from django.db.models import Prefetch

from apps.ledger.history import filter_events
from apps.ledger.models import Posting
from apps.ledger.money import format_money
from apps.ledger.selectors import events_for
from apps.ledger.serializers import EventSerializer
from apps.reports.services import consistent_read
from apps.users.models import User

HEADERS = [
    "effective_date",
    "transaction_id",
    "type",
    "title",
    "amount_inr",
    "account",
    "destination",
    "category",
    "merchant",
    "contact_or_source",
    "payment_method",
    "notes",
    "status",
    "net_expense_inr",
    "net_external_cash_inr",
]


def safe_cell(value: str) -> str:
    """Neutralize user text formulas, including whitespace/control-prefixed formulas."""
    index = 0
    while index < len(value) and (value[index].isspace() or value[index] in "\ufeff\x00"):
        index += 1
    leading = value[index:]
    return (
        "'" + value
        if leading.startswith(("=", "+", "-", "@")) or value.startswith(("\t", "\r", "\n"))
        else value
    )


class Echo:
    def write(self, value: str) -> str:
        return value


def csv_rows(user: User, data: dict[str, Any]) -> Generator[str]:
    # The lock spans iteration, including streaming, to avoid inconsistent reversal states.
    with consistent_read(user):
        rows = (
            filter_events(events_for(user), user, data)
            .select_related("contact", "original_expense__category", "original_expense__contact")
            .prefetch_related(None)
            .prefetch_related(
                Prefetch("postings", queryset=Posting.objects.select_related("claim__contact"))
            )
        )
        writer = csv.writer(Echo(), lineterminator="\r\n")
        yield "\ufeff" + writer.writerow(HEADERS)
        for event in rows.iterator(chunk_size=200):
            status = EventSerializer().get_status(event)
            active = status == "posted"
            legs = list(event.postings.all())
            expense = (
                sum(leg.amount_paise for leg in legs if leg.book == "expense") if active else 0
            )
            cash = (
                sum(leg.amount_paise for leg in legs if leg.book == "liquid")
                if active and event.kind not in ("opening", "transfer")
                else 0
            )
            category = event.category or (
                event.original_expense.category if event.original_expense else None
            )
            contacts = sorted({leg.claim.contact.display_name for leg in legs if leg.claim_id})
            if event.contact:
                contacts.append(event.contact.display_name)
            elif event.original_expense and event.original_expense.contact:
                contacts.append(event.original_expense.contact.display_name)
            contact_source = "; ".join(sorted(set(contacts))) or event.funding_source
            yield writer.writerow(
                [
                    event.effective_date.isoformat(),
                    str(event.public_id),
                    event.kind,
                    safe_cell(event.title),
                    format_money(event.amount_paise),
                    safe_cell(event.account.name if event.account else ""),
                    safe_cell(event.destination.name if event.destination else ""),
                    safe_cell(category.name if category else ""),
                    safe_cell(
                        event.merchant
                        or (event.original_expense.merchant if event.original_expense else "")
                    ),
                    safe_cell(contact_source),
                    safe_cell(
                        event.payment_method
                        or (event.original_expense.payment_method if event.original_expense else "")
                    ),
                    safe_cell(event.notes),
                    status,
                    format_money(expense),
                    format_money(cash),
                ]
            )
