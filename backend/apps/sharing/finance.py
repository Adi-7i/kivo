"""Atomic personal claims and shared bills over the authoritative ledger."""

from __future__ import annotations

from collections import defaultdict
from typing import Any
from uuid import UUID

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.funds.services import rebuild_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Event, Posting
from apps.ledger.selectors import active_events
from apps.ledger.services import (
    _account,
    _amount,
    _category,
    _idempotent,
    _reverse,
    assert_fundable_history,
)
from apps.sharing.contacts import contact_for
from apps.sharing.models import BillShare, Claim, SharedBill
from apps.sharing.participants import validated_shares
from apps.sharing.selectors import claims_for
from apps.users.models import User


def assert_claim_history(user: User) -> None:
    """Validate outstanding at every economic instant, including backdated changes."""
    outstanding: dict[UUID, int] = defaultdict(int)
    for event in active_events(user).prefetch_related("postings"):
        for leg in event.postings.all():
            if leg.claim_id:
                outstanding[leg.claim_id] += (
                    leg.amount_paise if leg.book == "receivable" else -leg.amount_paise
                )
                if outstanding[leg.claim_id] < 0:
                    raise FinancialConflict(
                        "Settlement exceeds the claim in effective-date history."
                    )


def _event(
    user: User, data: dict[str, Any], kind: str, *, supersedes: Event | None = None
) -> Event:
    _amount(data["amount_paise"])
    account = _account(user, data["account"]) if data.get("account") else None
    if kind != "shared_due" and account is None:
        raise ValidationError({"account": "An owned active account is required."})
    if kind == "shared_due" and account:
        raise ValidationError({"account": "A friend-paid bill has no owner cash movement."})
    if account and data["effective_date"] < account.opened_on:
        raise ValidationError({"effective_date": "Transaction precedes the account opening date."})
    return Event.objects.create(
        user=user,
        kind=kind,
        account=account,
        amount_paise=data["amount_paise"],
        effective_date=data["effective_date"],
        title=data["title"],
        category=_category(user, data["category"])
        if kind in ("shared_paid", "shared_due")
        else None,
        merchant=data.get("merchant", ""),
        notes=data.get("notes", ""),
        payment_method=data.get("payment_method", ""),
        reason=data.get("reason", ""),
        contact_id=data.get("contact"),
        funding_source=data.get("funding_source", ""),
        supersedes=supersedes,
        root_event=(supersedes.root_event or supersedes) if supersedes else None,
    )


def post_loan(user: User, data: dict[str, Any], *, supersedes: Event | None = None) -> Event:
    kind = data["kind"]
    if kind not in ("lend", "borrow"):
        raise ValidationError({"kind": "Use lend or borrow."})
    contact = contact_for(user, data["contact"])
    event = _event(
        user,
        {
            **data,
            "contact": contact.id,
            "funding_source": contact.display_name if kind == "borrow" else "",
        },
        kind,
        supersedes=supersedes,
    )
    claim = Claim.objects.create(
        user=user,
        contact=contact,
        source_event=event,
        direction="receivable" if kind == "lend" else "payable",
    )
    sign = -1 if kind == "lend" else 1
    Posting.objects.bulk_create(
        [
            Posting(
                event=event,
                account=event.account,
                book="liquid",
                amount_paise=sign * event.amount_paise,
            ),
            Posting(
                event=event,
                claim=claim,
                book=claim.direction,
                amount_paise=-sign * event.amount_paise,
            ),
        ]
    )
    return event


def post_settlement(user: User, data: dict[str, Any], *, supersedes: Event | None = None) -> Event:
    claim = get_object_or_404(
        claims_for(user), pk=data["claim"], source_event__reversal__isnull=True
    )
    _amount(data["amount_paise"])
    if data["effective_date"] < claim.source_event.effective_date:
        raise ValidationError({"effective_date": "Settlement precedes its originating claim."})
    if data["amount_paise"] > claim.outstanding_paise:
        raise FinancialConflict("Settlement exceeds the actual outstanding claim.")
    incoming = claim.direction == "receivable"
    event = _event(
        user,
        {**data, "contact": claim.contact_id},
        "repay_in" if incoming else "repay_out",
        supersedes=supersedes,
    )
    sign = 1 if incoming else -1
    Posting.objects.bulk_create(
        [
            Posting(
                event=event,
                account=event.account,
                book="liquid",
                amount_paise=sign * event.amount_paise,
            ),
            Posting(
                event=event,
                claim=claim,
                book=claim.direction,
                amount_paise=-sign * event.amount_paise,
            ),
        ]
    )
    return event


def post_bill(user: User, data: dict[str, Any], *, supersedes: Event | None = None) -> Event:
    """Build within the caller's owner-locked atomic financial transaction."""
    shares = validated_shares(user, data)
    payer_id = data.get("payer")
    if payer_id and payer_id not in {share.contact_id for share in shares}:
        raise ValidationError({"payer": "The payer must be an owned bill participant."})
    event = _event(
        user,
        {**data, "contact": payer_id},
        "shared_due" if payer_id else "shared_paid",
        supersedes=supersedes,
    )
    bill = SharedBill.objects.create(
        user=user, event=event, payer_id=payer_id, split_method=data.get("split_method", "custom")
    )
    legs = []
    claims = []
    bill_shares = []
    if not payer_id:
        legs.append(
            Posting(
                event=event, account=event.account, book="liquid", amount_paise=-event.amount_paise
            )
        )
    for share in shares:
        claim = None
        if share.amount_paise:
            if share.contact_id is None:
                legs.append(Posting(event=event, book="expense", amount_paise=share.amount_paise))
                if payer_id:
                    claim = Claim(
                        user=user, contact_id=payer_id, direction="payable", source_event=event
                    )
                    claims.append(claim)
                    legs.append(
                        Posting(
                            event=event,
                            claim=claim,
                            book="payable",
                            amount_paise=-share.amount_paise,
                        )
                    )
            elif not payer_id:
                claim = Claim(
                    user=user,
                    contact_id=share.contact_id,
                    direction="receivable",
                    source_event=event,
                )
                claims.append(claim)
                legs.append(
                    Posting(
                        event=event, claim=claim, book="receivable", amount_paise=share.amount_paise
                    )
                )
        bill_shares.append(
            BillShare(
                bill=bill, contact_id=share.contact_id, claim=claim, amount_paise=share.amount_paise
            )
        )
    Claim.objects.bulk_create(claims)
    BillShare.objects.bulk_create(bill_shares)
    Posting.objects.bulk_create(legs)
    return event


def write_financial(
    *,
    user: User,
    key: str,
    operation: str,
    data: dict[str, Any],
    event_id: UUID | None = None,
) -> tuple[UUID, bool]:
    """Create or supersede an origin/settlement; all effects share one retry receipt."""
    builders = {"loan": post_loan, "settlement": post_settlement, "bill": post_bill}
    kinds = {
        "loan": ("lend", "borrow"),
        "settlement": ("repay_in", "repay_out"),
        "bill": ("shared_paid", "shared_due"),
    }

    def action() -> UUID:
        original = None
        if event_id:
            original = get_object_or_404(
                Event, user=user, public_id=event_id, kind__in=kinds[operation]
            )
            if hasattr(original, "rent_payment"):
                raise FinancialConflict("Use the linked rent payment correction endpoint.")
            _reverse(user, original, data["reason"])
        event = builders[operation](user, data, supersedes=original)
        if original and event.kind != original.kind:
            raise ValidationError(
                {"kind": "Correction must preserve the financial operation kind."}
            )
        assert_fundable_history(user)
        assert_claim_history(user)
        rebuild_attribution(user=user, trigger_event=event)
        return event.public_id

    return _idempotent(
        user=user,
        key=key,
        operation=f"sharing.{operation}.{'correct' if event_id else 'create'}",
        data={"event": event_id, **data},
        action=action,
    )
