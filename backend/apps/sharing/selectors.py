"""Owner-scoped relationships and rent; financial amounts derive from postings."""

from __future__ import annotations

from django.db.models import (
    BigIntegerField,
    Case,
    OuterRef,
    Q,
    QuerySet,
    Subquery,
    Sum,
    Value,
    When,
)
from django.db.models.functions import Abs, Coalesce

from apps.ledger.models import Posting
from apps.sharing.models import Claim, Contact, ObligationChange, RentObligation, RentReserve
from apps.users.models import User


def _money_sum(rows: QuerySet, group: str, field: str = "amount_paise") -> Coalesce:
    return Coalesce(
        Subquery(rows.order_by().values(group).annotate(total=Sum(field)).values("total")),
        Value(0),
        output_field=BigIntegerField(),
    )


def contacts_for(user: User) -> QuerySet[Contact]:
    rows = Posting.objects.filter(claim__contact_id=OuterRef("pk"), event__user=user)
    return Contact.objects.filter(user=user).annotate(
        receivable_paise=_money_sum(rows.filter(book="receivable"), "claim__contact_id"),
        payable_paise=-_money_sum(rows.filter(book="payable"), "claim__contact_id"),
    )


def claims_for(user: User) -> QuerySet[Claim]:
    rows = Posting.objects.filter(claim_id=OuterRef("pk"), event__user=user)
    net = _money_sum(rows, "claim_id")
    return (
        Claim.objects.filter(user=user)
        .select_related("contact", "source_event", "source_event__reversal")
        .annotate(
            principal_paise=Abs(
                _money_sum(rows.filter(event_id=OuterRef("source_event_id")), "claim_id")
            ),
            outstanding_paise=Case(
                When(direction="payable", then=-net), default=net, output_field=BigIntegerField()
            ),
        )
    )


def obligations_for(user: User) -> QuerySet[RentObligation]:
    from apps.sharing.models import RentPayment

    payments = RentPayment.objects.filter(
        obligation_id=OuterRef("pk"), event__reversal__isnull=True
    )
    changes = ObligationChange.objects.filter(obligation_id=OuterRef("pk")).order_by(
        "-created_at", "-id"
    )
    return (
        RentObligation.objects.filter(user=user)
        .select_related("plan")
        .annotate(
            paid_paise=_money_sum(payments, "obligation_id", "event__amount_paise"),
            last_action=Subquery(changes.values("action")[:1]),
            last_reason=Subquery(changes.values("reason")[:1]),
        )
    )


def reserves_for(user: User) -> QuerySet[RentReserve]:
    return (
        RentReserve.objects.filter(user=user)
        .select_related("obligation", "obligation__plan")
        .annotate(
            reserved_paise=Coalesce(
                Sum(
                    "changes__delta_paise",
                    filter=(
                        Q(changes__payment__isnull=True)
                        | Q(changes__payment__event__reversal__isnull=True)
                    ),
                ),
                Value(0),
                output_field=BigIntegerField(),
            )
        )
        .order_by("created_at", "id")
    )
