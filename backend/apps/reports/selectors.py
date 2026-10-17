"""Scoped ORM aggregates over the journal, existing claims, rent and fund snapshots."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.conf import settings
from django.db.models import BigIntegerField, Count, F, Max, Min, Q, QuerySet, Sum, Value
from django.db.models.functions import Coalesce, NullIf, TruncDay, TruncMonth, TruncWeek
from django.utils import timezone

from apps.ledger.history import date_range, filter_events, month_end
from apps.ledger.models import Event, Posting
from apps.ledger.selectors import accounts_for, active_events, events_for
from apps.reports.models import Budget
from apps.sharing.selectors import obligations_for, reserves_for
from apps.users.models import User


def ratio(numerator: int, denominator: int) -> str | None:
    return (
        str(
            (Decimal(numerator) / Decimal(denominator)).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )
        )
        if denominator
        else None
    )


def economic_events(user: User, data: dict[str, Any]) -> QuerySet[Event]:
    return filter_events(active_events(user), user, data)


def expense_rows(user: User, rows: QuerySet[Event]) -> QuerySet[Posting]:
    return Posting.objects.filter(
        event__user=user, event_id__in=rows.order_by().values("pk"), book=Posting.Book.EXPENSE
    )


def expense_total(user: User, rows: QuerySet[Event]) -> int:
    return expense_rows(user, rows).aggregate(total=Sum("amount_paise"))["total"] or 0


def period_for(user: User, data: dict[str, Any]) -> tuple[date, date, dict[str, Any]]:
    data = dict(data)
    if not any(key in data for key in ("date", "date_from", "date_to", "period")):
        data["period"] = "month"
    today = timezone.localdate()
    start, end = date_range(data, today)
    if start is None or end is None:
        bounds = economic_events(user, data).aggregate(
            first=Min("effective_date"), last=Max("effective_date")
        )
        start = start or bounds["first"] or min(end or today, today)
        end = end or max(bounds["last"] or start, today, start)
    # Resolve partial/all ranges once so comparisons, average and export agree.
    data = {
        key: value
        for key, value in data.items()
        if key not in ("period", "date", "date_from", "date_to")
    }
    data.update(date_from=start, date_to=end)
    return start, end, data


def metadata(start: date, end: date) -> dict[str, Any]:
    today = timezone.localdate()
    return {
        "currency": "INR",
        "timezone": settings.TIME_ZONE,
        "period_start": start,
        "period_end": end,
        "calendar_days": (end - start).days + 1,
        "as_of_date": today,
        "incomplete_period": end >= today,
    }


def totals_for(user: User, rows: QuerySet[Event]) -> dict[str, int]:
    legs = Posting.objects.filter(event__user=user, event_id__in=rows.order_by().values("pk"))
    external_cash = Q(book="liquid") & ~Q(event__kind__in=["opening", "transfer"])
    sums = legs.aggregate(
        expense=Sum("amount_paise", filter=Q(book="expense")),
        external=Sum("amount_paise", filter=Q(book="external")),
        cash_in=Sum("amount_paise", filter=external_cash & Q(amount_paise__gt=0)),
        cash_out=Sum("amount_paise", filter=external_cash & Q(amount_paise__lt=0)),
        borrowed=Sum("amount_paise", filter=Q(book="liquid", event__kind="borrow")),
        recovered=Sum("amount_paise", filter=Q(book="liquid", event__kind="repay_in")),
        lent=Sum("amount_paise", filter=Q(book="liquid", event__kind="lend")),
        repaid=Sum("amount_paise", filter=Q(book="liquid", event__kind="repay_out")),
        transfers=Sum(
            "amount_paise", filter=Q(book="liquid", event__kind="transfer", amount_paise__lt=0)
        ),
        shared_advances=Sum("amount_paise", filter=Q(book="receivable", event__kind="shared_paid")),
        principal_repaid=Sum(
            "amount_paise",
            filter=Q(book="payable", event__kind="repay_out", claim__source_event__kind="borrow"),
        ),
        shared_settlements=Sum(
            "amount_paise",
            filter=Q(
                book="payable", event__kind="repay_out", claim__source_event__kind="shared_due"
            ),
        ),
        refunds=Sum("amount_paise", filter=Q(book="liquid", event__kind="refund")),
    )
    return {
        "personal_expense": sums["expense"] or 0,
        "external_income": -(sums["external"] or 0),
        "money_received": sums["cash_in"] or 0,
        "money_paid": -(sums["cash_out"] or 0),
        "borrowed": sums["borrowed"] or 0,
        "repayments_received": sums["recovered"] or 0,
        "lent": -(sums["lent"] or 0),
        "payable_settlements": -(sums["repaid"] or 0),
        "internal_transfers": -(sums["transfers"] or 0),
        "shared_advances": sums["shared_advances"] or 0,
        "principal_repaid": sums["principal_repaid"] or 0,
        "shared_settlements_paid": sums["shared_settlements"] or 0,
        "refunds_received": sums["refunds"] or 0,
    }


def summary_for(user: User, data: dict[str, Any]) -> dict[str, Any]:
    start, end, data = period_for(user, data)
    rows = economic_events(user, data)
    totals = totals_for(user, rows)
    expense = totals["personal_expense"]
    highest_rows = list(
        expense_rows(user, rows)
        .values("event__effective_date")
        .annotate(amount=Sum("amount_paise"))
        .filter(amount__gt=0)
        .order_by("-amount", "event__effective_date")[:5]
    )
    highest = highest_rows[0] if highest_rows else None
    if start > date.min and start.day == 1 and end == month_end(start):
        prior_end = start - timedelta(days=1)
        prior_start = prior_end.replace(day=1)
    else:
        prior_end = start - timedelta(days=1) if start > date.min else None
        prior_start = (
            prior_end - timedelta(days=(end - start).days)
            if prior_end and (prior_end - date.min).days >= (end - start).days
            else None
        )
    comparison = None
    if prior_start and prior_end:
        old_data = {**data, "date_from": prior_start, "date_to": prior_end}
        prior_expense = expense_total(user, economic_events(user, old_data))
        complete = end < timezone.localdate()
        comparison = {
            "period_start": prior_start,
            "period_end": prior_end,
            "personal_expense": prior_expense,
            "difference": expense - prior_expense,
            "percentage_difference": ratio((expense - prior_expense) * 100, prior_expense)
            if prior_expense > 0 and complete
            else None,
            "comparable": complete and prior_expense > 0,
        }
    return {
        "period": metadata(start, end),
        **totals,
        "transaction_count": rows.count(),
        "average_daily_expense": ratio(expense, ((end - start).days + 1) * 100),
        "highest_spending_day": {
            "date": highest["event__effective_date"],
            "amount": highest["amount"],
        }
        if highest
        else None,
        "highest_spending_days": [
            {"date": row["event__effective_date"], "amount": row["amount"]} for row in highest_rows
        ],
        "comparison": comparison,
    }


def trends_for(user: User, data: dict[str, Any]) -> dict[str, Any]:
    start, end, data = period_for(user, data)
    interval = data.get("interval", "day")
    trunc = {"day": TruncDay, "week": TruncWeek, "month": TruncMonth}[interval]
    rows = (
        expense_rows(user, economic_events(user, data))
        .annotate(bucket=trunc("event__effective_date"))
        .values("bucket")
        .annotate(amount=Sum("amount_paise"), transaction_count=Count("event_id", distinct=True))
        .order_by("bucket")
    )
    return {
        "period": metadata(start, end),
        "interval": interval,
        "results": [
            {
                "date": row["bucket"],
                "amount": row["amount"],
                "transaction_count": row["transaction_count"],
            }
            for row in rows
        ],
    }


def breakdown_for(user: User, data: dict[str, Any]) -> dict[str, Any]:
    start, end, data = period_for(user, data)
    dimension = data.get("dimension", "category")
    merchant = Coalesce(
        NullIf("event__merchant", Value("")), "event__original_expense__merchant", Value("")
    )
    payment_method = Coalesce(
        NullIf("event__payment_method", Value("")),
        "event__original_expense__payment_method",
        Value(""),
    )
    columns = {
        "category": (
            Coalesce("event__category_id", "event__original_expense__category_id"),
            Coalesce("event__category__name", "event__original_expense__category__name"),
        ),
        "merchant": (merchant, merchant),
        "account": (F("event__account_id"), F("event__account__name")),
        "payment_method": (payment_method, payment_method),
        "contact": (
            Coalesce(
                "event__contact_id",
                "event__shared_bill__payer_id",
                "event__original_expense__contact_id",
            ),
            Coalesce(
                "event__contact__display_name",
                "event__shared_bill__payer__display_name",
                "event__original_expense__contact__display_name",
            ),
        ),
    }
    group, label = columns[dimension]
    rows = (
        expense_rows(user, economic_events(user, data))
        .order_by()
        .annotate(group_key=group, label=label)
        .values("group_key", "label")
        .annotate(amount=Sum("amount_paise"), transaction_count=Count("event_id", distinct=True))
        .order_by("-amount", "group_key")
    )
    return {
        "period": metadata(start, end),
        "dimension": dimension,
        "results": [
            {
                "key": str(row["group_key"]) if row["group_key"] is not None else None,
                "label": row["label"],
                "amount": row["amount"],
                "transaction_count": row["transaction_count"],
            }
            for row in rows
        ],
    }


def budgets_for(user: User) -> QuerySet[Budget]:
    return Budget.objects.filter(user=user).select_related("category", "user")


def budget_progress(budget: Budget, spent: int) -> dict[str, Any]:
    limit = budget.limit_paise
    status = (
        "exceeded"
        if spent > limit
        else "at_limit"
        if limit and spent == limit
        else "warning"
        if limit and spent * 100 >= limit * budget.warning_percent
        else "ok"
    )
    return {
        "id": budget.id,
        "name": budget.name,
        "category": budget.category_id,
        "period_type": budget.period_type,
        "period_start": budget.period_start,
        "period_end": budget.period_end,
        "limit": limit,
        "warning_percent": budget.warning_percent,
        "archived": budget.archived,
        "spent": spent,
        "remaining": limit - spent,
        "overspending": max(0, spent - limit),
        "utilization_percent": ratio(spent * 100, limit),
        "warning_state": status,
        "created_at": budget.created_at,
    }


def budget_progresses(budgets: list[Budget]) -> list[dict[str, Any]]:
    """One conditional aggregate for the entire page, never a query per budget."""
    if not budgets:
        return []
    user = budgets[0].user
    if any(budget.user_id != user.pk for budget in budgets):
        raise ValueError("Budget progress requires exactly one owner.")
    aggregates = {}
    for index, budget in enumerate(budgets):
        scope = Q(event__effective_date__range=(budget.period_start, budget.period_end))
        if budget.category_id:
            scope &= Q(event__category_id=budget.category_id) | Q(
                event__original_expense__category_id=budget.category_id
            )
        aggregates[f"b{index}"] = Sum("amount_paise", filter=scope, default=0)
    totals = expense_rows(user, active_events(user)).aggregate(**aggregates)
    return [budget_progress(budget, totals[f"b{index}"]) for index, budget in enumerate(budgets)]


def dashboard_for(user: User, data: dict[str, Any]) -> dict[str, Any]:
    today = timezone.localdate()
    accounts = list(accounts_for(user))
    liquid = sum(account.balance_paise for account in accounts)
    reserve_total = reserves_for(user).aggregate(total=Sum("reserved_paise"))["total"] or 0
    claims = Posting.objects.filter(event__user=user).aggregate(
        receivable=Sum("amount_paise", filter=Q(book="receivable")),
        payable=Sum("amount_paise", filter=Q(book="payable")),
    )
    starts = {
        "today": today,
        "week": today - timedelta(days=today.weekday()),
        "month": today.replace(day=1),
        "year": today.replace(month=1, day=1),
    }
    spending = expense_rows(user, active_events(user)).aggregate(
        **{
            name: Sum(
                "amount_paise", filter=Q(event__effective_date__range=(start, today)), default=0
            )
            for name, start in starts.items()
        }
    )
    obligations = (
        obligations_for(user)
        .filter(Q(last_action__isnull=True) | ~Q(last_action="skip"))
        .filter(paid_paise__lt=F("plan__amount_paise"))
    )
    rent = obligations.aggregate(
        unpaid=Count("pk"),
        overdue=Count("pk", filter=Q(due_date__lt=today)),
        due=Count("pk", filter=Q(due_date=today)),
        upcoming=Count("pk", filter=Q(due_date__gt=today)),
        outstanding=Sum(F("plan__amount_paise") - F("paid_paise"), output_field=BigIntegerField()),
    )
    due_rows = list(obligations.order_by("due_date", "id")[:10])
    budgets = budgets_for(user).filter(
        archived=False, period_start__lte=today, period_end__gte=today
    )
    budget_count = budgets.count()
    return {
        "currency": "INR",
        "timezone": settings.TIME_ZONE,
        "as_of_date": today,
        "liquid_balance": liquid,
        "accounts": accounts,
        "spending": spending,
        "selected_period": summary_for(user, data),
        "receivables": claims["receivable"] or 0,
        "payables": -(claims["payable"] or 0),
        "reserved": reserve_total,
        "safe_to_spend": liquid - reserve_total,
        "rent": {
            "unpaid_count": rent["unpaid"],
            "overdue_count": rent["overdue"],
            "due_count": rent["due"],
            "upcoming_count": rent["upcoming"],
            "outstanding": rent["outstanding"] or 0,
            "next_obligations": due_rows,
        },
        "budgets": budget_progresses(list(budgets[:20])),
        "budget_count": budget_count,
        "recent_activities": list(events_for(user).order_by("-effective_date", "-id")[:10]),
    }
