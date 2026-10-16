"""Atomic financial operations, ownership, retry protection and historical solvency."""

from __future__ import annotations

import hashlib
import json
import logging
from collections import defaultdict
from collections.abc import Callable
from typing import Any
from uuid import UUID

from django.db import transaction
from django.db.models import Sum
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.funds.services import rebuild_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Account, Category, Event, Posting, WriteReceipt
from apps.ledger.money import MAX_PAISE
from apps.ledger.selectors import active_events
from apps.users.models import User

DEFAULT_CATEGORIES = ("Food", "Transport", "Housing", "Shopping", "Health", "Education", "Other")
logger = logging.getLogger("kivo.ledger")


def _owner_lock(user: User) -> None:
    """One row per owner serializes writes across accounts, retries and attribution."""
    get_object_or_404(User.objects.select_for_update(), pk=user.pk, is_active=True)


def _idempotent(
    *, user: User, key: str, operation: str, data: dict[str, Any], action: Callable[[], UUID]
) -> tuple[UUID, bool]:
    if not isinstance(key, str) or not key.strip() or len(key) > 128:
        raise ValidationError(
            {"Idempotency-Key": "A nonempty key of at most 128 characters is required."}
        )
    fingerprint = hashlib.sha256(
        json.dumps(
            {"operation": operation, "data": data},
            sort_keys=True,
            default=str,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    with transaction.atomic():
        _owner_lock(user)
        existing = WriteReceipt.objects.filter(user=user, key=key).first()
        if existing:
            if existing.fingerprint != fingerprint:
                raise FinancialConflict(
                    "Idempotency key was already used with a different request."
                )
            return existing.resource_id, True
        result = action()
        WriteReceipt.objects.create(user=user, key=key, fingerprint=fingerprint, resource_id=result)
        transaction.on_commit(
            lambda: logger.info(
                "financial_write_committed",
                extra={
                    "user_id": user.pk,
                    "resource_id": str(result),
                    "operation": operation,
                },
            )
        )
        return result, False


def _account(user: User, account_id: UUID) -> Account:
    account = get_object_or_404(Account, user=user, pk=account_id)
    if account.archived:
        raise ValidationError({"account": "Archived accounts cannot receive new postings."})
    return account


def _category(user: User, category_id: UUID) -> Category:
    category = get_object_or_404(
        Category.objects.select_related("parent"), user=user, pk=category_id
    )
    if category.archived or (category.parent and category.parent.archived):
        raise ValidationError({"category": "Archived categories cannot be used."})
    return category


def _amount(value: int) -> None:
    if type(value) is not int or not 0 < value <= MAX_PAISE:
        raise ValidationError(
            {"amount": "Amount must be positive integer paise within the supported limit."}
        )


def assert_fundable_history(user: User) -> None:
    """Reject unexplained historical shortfalls, including backdated edits and reversals."""
    balances: dict[UUID, int] = defaultdict(int)
    for event in active_events(user):
        amount = event.amount_paise
        if event.kind in (Event.Kind.OPENING, Event.Kind.RECEIPT, Event.Kind.REFUND):
            balances[event.account_id] += amount
        else:
            balances[event.account_id] -= amount
            if event.kind == Event.Kind.TRANSFER:
                balances[event.destination_id] += amount
        if balances[event.account_id] < 0:
            raise FinancialConflict(
                {
                    "code": "insufficient_funds",
                    "detail": "This write would leave an unfunded account in effective-date history.",
                }
            )


def _post(user: User, data: dict[str, Any], *, supersedes: Event | None = None) -> Event:
    kind = data["kind"]
    amount = data["amount_paise"]
    _amount(amount)
    if kind not in Event.Kind.values or kind == Event.Kind.REVERSAL:
        raise ValidationError({"kind": "Unsupported posting kind."})
    account = _account(user, data["account"])
    effective_date = data["effective_date"]
    if effective_date < account.opened_on:
        raise ValidationError({"effective_date": "Transaction precedes the account opening date."})
    kwargs: dict[str, Any] = {}
    destination = data.get("destination")
    category = data.get("category")
    original_id = data.get("original_expense")
    if kind == Event.Kind.TRANSFER:
        if not destination or destination == account.id:
            raise ValidationError(
                {"destination": "A different owned destination account is required."}
            )
        dest = _account(user, destination)
        if effective_date < dest.opened_on:
            raise ValidationError(
                {"effective_date": "Transaction precedes the destination opening date."}
            )
        kwargs["destination"] = dest
    elif destination:
        raise ValidationError({"destination": "Only transfers have a destination."})
    if kind == Event.Kind.EXPENSE:
        if not category:
            raise ValidationError({"category": "An owned expense category is required."})
        kwargs["category"] = _category(user, category)
    elif category:
        raise ValidationError({"category": "Only expenses have a category."})
    if kind == Event.Kind.REFUND:
        original = get_object_or_404(
            Event, user=user, public_id=original_id, kind=Event.Kind.EXPENSE, reversal__isnull=True
        )
        if effective_date < original.effective_date:
            raise ValidationError({"effective_date": "Refund precedes the original expense."})
        refunded = (
            original.refunds.filter(reversal__isnull=True).aggregate(total=Sum("amount_paise"))[
                "total"
            ]
            or 0
        )
        if refunded + amount > original.amount_paise:
            raise FinancialConflict(
                "Refund exceeds the original expense's remaining refundable amount."
            )
        kwargs["original_expense"] = original
    elif original_id:
        raise ValidationError({"original_expense": "Only refunds reference an original expense."})
    if kind == Event.Kind.RECEIPT and not data.get("funding_source", "").strip():
        raise ValidationError({"funding_source": "An external funding source is required."})
    if kind == Event.Kind.OPENING and effective_date != account.opened_on:
        raise ValidationError(
            {"effective_date": "Opening funds must use the account opening date."}
        )
    event = Event.objects.create(
        user=user,
        kind=kind,
        account=account,
        amount_paise=amount,
        effective_date=effective_date,
        title=data["title"],
        merchant=data.get("merchant", ""),
        notes=data.get("notes", ""),
        payment_method=data.get("payment_method", ""),
        funding_source=data.get("funding_source", ""),
        supersedes=supersedes,
        root_event=(supersedes.root_event or supersedes) if supersedes else None,
        reason=data.get("reason", ""),
        **kwargs,
    )
    direction = 1 if kind in (Event.Kind.OPENING, Event.Kind.RECEIPT, Event.Kind.REFUND) else -1
    legs = [
        Posting(
            event=event, account=account, book=Posting.Book.LIQUID, amount_paise=direction * amount
        )
    ]
    if kind == Event.Kind.TRANSFER:
        legs.append(
            Posting(
                event=event,
                account=kwargs["destination"],
                book=Posting.Book.LIQUID,
                amount_paise=amount,
            )
        )
    else:
        book = {
            Event.Kind.OPENING: Posting.Book.EQUITY,
            Event.Kind.RECEIPT: Posting.Book.EXTERNAL,
            Event.Kind.EXPENSE: Posting.Book.EXPENSE,
            Event.Kind.REFUND: Posting.Book.EXPENSE,
        }[kind]
        legs.append(Posting(event=event, book=book, amount_paise=-direction * amount))
    Posting.objects.bulk_create(legs)
    return event


def create_account(*, user: User, key: str, data: dict[str, Any]) -> tuple[UUID, bool]:
    def action() -> UUID:
        if Account.objects.filter(user=user, name=data["name"]).exists():
            raise ValidationError({"name": "An account with this name already exists."})
        opening = data["opening_balance"]
        if type(opening) is not int or not 0 <= opening <= MAX_PAISE:
            raise ValidationError(
                {"opening_balance": "Opening balance must be nonnegative integer paise."}
            )
        account = Account.objects.create(
            user=user, name=data["name"], kind=data["kind"], opened_on=data["opened_on"]
        )
        if opening:
            event = _post(
                user,
                {
                    "kind": Event.Kind.OPENING,
                    "account": account.id,
                    "amount_paise": opening,
                    "effective_date": account.opened_on,
                    "title": "Opening balance",
                    "funding_source": "Opening funds",
                },
            )
            rebuild_attribution(user=user, trigger_event=event)
        return account.id

    return _idempotent(user=user, key=key, operation="account.create", data=data, action=action)


def update_account(*, user: User, account_id: UUID, data: dict[str, Any]) -> Account:
    with transaction.atomic():
        _owner_lock(user)
        account = get_object_or_404(Account, user=user, pk=account_id)
        if (
            data.get("archived")
            and (account.postings.aggregate(total=Sum("amount_paise"))["total"] or 0) != 0
        ):
            raise FinancialConflict("Only a zero-balance account can be archived.")
        if (
            "name" in data
            and Account.objects.filter(user=user, name=data["name"]).exclude(pk=account.pk).exists()
        ):
            raise ValidationError({"name": "An account with this name already exists."})
        for field in ("name", "archived"):
            if field in data:
                setattr(account, field, data[field])
        account.save(update_fields=[field for field in ("name", "archived") if field in data])
        return account


def save_category(*, user: User, data: dict[str, Any], category_id: UUID | None = None) -> Category:
    with transaction.atomic():
        _owner_lock(user)
        category = (
            get_object_or_404(Category, user=user, pk=category_id)
            if category_id
            else Category(user=user)
        )
        parent_id = data.get("parent", category.parent_id)
        if parent_id:
            parent = _category(user, parent_id)
            if parent.id == category.id or parent.parent_id or category.children.exists():
                raise ValidationError(
                    {"parent": "Only two category levels are supported, without cycles."}
                )
        if data.get("archived") and category.children.filter(archived=False).exists():
            raise FinancialConflict("Archive active subcategories first.")
        name = data.get("name", category.name)
        if (
            Category.objects.filter(user=user, name=name, parent_id=parent_id)
            .exclude(pk=category.pk)
            .exists()
        ):
            raise ValidationError({"name": "Category name already exists under this parent."})
        category.parent_id = parent_id
        category.name = name
        category.archived = data.get("archived", category.archived)
        category.save()
        return category


def seed_categories(user: User) -> list[Category]:
    with transaction.atomic():
        _owner_lock(user)
        return [
            Category.objects.get_or_create(user=user, name=name, parent=None)[0]
            for name in DEFAULT_CATEGORIES
        ]


def create_event(*, user: User, key: str, data: dict[str, Any]) -> tuple[UUID, bool]:
    def action() -> UUID:
        if data["kind"] == Event.Kind.OPENING:
            raise ValidationError({"kind": "Create opening funds through account creation."})
        event = _post(user, data)
        assert_fundable_history(user)
        rebuild_attribution(user=user, trigger_event=event)
        return event.public_id

    return _idempotent(user=user, key=key, operation="event.create", data=data, action=action)


def _reverse(user: User, original: Event, reason: str, *, void: bool = False) -> Event:
    if original.kind == Event.Kind.REVERSAL or Event.objects.filter(reverses=original).exists():
        raise FinancialConflict("A reversal or an already reversed event cannot be reversed again.")
    if original.refunds.filter(reversal__isnull=True).exists():
        raise FinancialConflict(
            "Reverse linked refunds before reversing or correcting this expense."
        )
    _account(user, original.account_id)
    if original.destination_id:
        _account(user, original.destination_id)
    reversal = Event.objects.create(
        user=user,
        kind=Event.Kind.REVERSAL,
        account=original.account,
        amount_paise=original.amount_paise,
        effective_date=original.effective_date,
        title=f"Reversal: {original.title}"[:200],
        reverses=original,
        reason=reason,
        is_void=void,
    )
    Posting.objects.bulk_create(
        [
            Posting(
                event=reversal,
                account_id=leg.account_id,
                book=leg.book,
                amount_paise=-leg.amount_paise,
            )
            for leg in original.postings.all()
        ]
    )
    return reversal


def reverse_event(
    *, user: User, key: str, event_id: UUID, reason: str, void: bool = False
) -> tuple[UUID, bool]:
    def action() -> UUID:
        original = get_object_or_404(Event, user=user, public_id=event_id)
        reversal = _reverse(user, original, reason, void=void)
        assert_fundable_history(user)
        rebuild_attribution(user=user, trigger_event=reversal)
        return reversal.public_id

    return _idempotent(
        user=user,
        key=key,
        operation="event.void" if void else "event.reverse",
        data={"event": event_id, "reason": reason},
        action=action,
    )


def correct_event(
    *, user: User, key: str, event_id: UUID, data: dict[str, Any]
) -> tuple[UUID, bool]:
    def action() -> UUID:
        original = get_object_or_404(Event, user=user, public_id=event_id)
        if data["kind"] != original.kind:
            raise ValidationError(
                {"kind": "A correction must preserve the financial operation kind."}
            )
        if original.kind == Event.Kind.OPENING and data["account"] != original.account_id:
            raise ValidationError({"account": "Opening equity cannot be moved to another account."})
        _reverse(user, original, data["reason"])
        replacement = _post(user, data, supersedes=original)
        assert_fundable_history(user)
        rebuild_attribution(user=user, trigger_event=replacement)
        return replacement.public_id

    return _idempotent(
        user=user,
        key=key,
        operation="event.correct",
        data={"event": event_id, **data},
        action=action,
    )
