"""Atomic, idempotent budget configuration; reporting never posts money."""

from __future__ import annotations

from collections.abc import Generator
from contextlib import contextmanager
from typing import Any
from uuid import UUID

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.ledger.history import month_end
from apps.ledger.money import MAX_PAISE
from apps.ledger.services import _category, _idempotent, _owner_lock
from apps.reports.models import Budget
from apps.users.models import User


@contextmanager
def consistent_read(user: User) -> Generator[None]:
    """Serialize multi-query reads with the existing journal/reserve write protocol."""
    with transaction.atomic():
        _owner_lock(user)
        yield


def save_budget(
    *, user: User, key: str, data: dict[str, Any], budget_id: UUID | None = None
) -> tuple[UUID, bool]:
    def action() -> UUID:
        budget = (
            get_object_or_404(Budget, user=user, pk=budget_id) if budget_id else Budget(user=user)
        )
        for name, value in data.items():
            if name == "category":
                budget.category = _category(user, value) if value else None
            else:
                setattr(budget, name, value)
        if type(budget.limit_paise) is not int or not 0 <= budget.limit_paise <= MAX_PAISE:
            raise ValidationError(
                {"limit": "Use nonnegative integer paise within the supported limit."}
            )
        if budget.period_end < budget.period_start:
            raise ValidationError({"period_end": "Must be on or after period_start."})
        if budget.period_type == "monthly" and (
            budget.period_start.day != 1 or budget.period_end != month_end(budget.period_start)
        ):
            raise ValidationError(
                {"period_end": "Monthly budgets must cover exactly one calendar month."}
            )
        overlaps = Budget.objects.filter(
            user=user,
            category_id=budget.category_id,
            archived=False,
            period_start__lte=budget.period_end,
            period_end__gte=budget.period_start,
        ).exclude(pk=budget.pk)
        if not budget.archived and overlaps.exists():
            raise ValidationError(
                {"period_start": "An active budget for this scope overlaps this period."}
            )
        budget.save()
        # PostgreSQL records the immutable before/after audit, including raw SQL writes.
        return budget.id

    return _idempotent(
        user=user,
        key=key,
        operation="budget.update" if budget_id else "budget.create",
        data={"budget": budget_id, **data},
        action=action,
    )
