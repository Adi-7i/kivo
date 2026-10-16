"""Owner-scoped financial queries. Postings are the sole balance authority."""

from __future__ import annotations

from django.db.models import BigIntegerField, Q, QuerySet, Sum, Value
from django.db.models.functions import Coalesce

from apps.ledger.models import Account, Event, Posting
from apps.users.models import User


def accounts_for(user: User) -> QuerySet[Account]:
    return (
        Account.objects.filter(user=user)
        .order_by("created_at", "id")
        .annotate(
            balance_paise=Coalesce(
                Sum("postings__amount_paise"), Value(0), output_field=BigIntegerField()
            ),
            opening_paise=Coalesce(
                Sum(
                    "postings__amount_paise",
                    filter=Q(
                        postings__event__kind=Event.Kind.OPENING,
                        postings__event__reversal__isnull=True,
                    ),
                ),
                Value(0),
                output_field=BigIntegerField(),
            ),
        )
    )


def events_for(user: User) -> QuerySet[Event]:
    return (
        Event.objects.filter(user=user)
        .select_related(
            "account",
            "destination",
            "category",
            "original_expense",
            "reverses",
            "supersedes",
            "root_event",
            "reversal",
        )
        .prefetch_related("postings")
    )


def active_events(user: User) -> QuerySet[Event]:
    return (
        Event.objects.filter(user=user, reversal__isnull=True)
        .exclude(kind=Event.Kind.REVERSAL)
        .annotate(sequence=Coalesce("root_event_id", "id"))
        .order_by("effective_date", "sequence", "id")
    )


def financial_summary(user: User) -> dict[str, int]:
    totals = Posting.objects.filter(event__user=user).aggregate(
        liquid=Sum("amount_paise", filter=Q(book=Posting.Book.LIQUID)),
        expense=Sum("amount_paise", filter=Q(book=Posting.Book.EXPENSE)),
        received=Sum("amount_paise", filter=Q(book=Posting.Book.EXTERNAL)),
    )
    return {
        "liquid_balance": totals["liquid"] or 0,
        "personal_expense": totals["expense"] or 0,
        "external_receipts": -(totals["received"] or 0),
    }
