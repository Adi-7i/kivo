"""One validated effective-date/filter contract for history, reports and exports."""

from __future__ import annotations

import calendar
from datetime import date, timedelta
from typing import Any

from django.db.models import Exists, OuterRef, Q, QuerySet, Value
from django.db.models.functions import Coalesce, NullIf
from django.utils import timezone
from rest_framework import serializers
from rest_framework.filters import BaseFilterBackend, search_smart_split

from apps.ledger.models import Account, Category, Event, Posting
from apps.ledger.money import MAX_PAISE, MoneyField
from apps.ledger.serializers import StrictSerializer
from apps.sharing.models import BillShare, Contact
from apps.users.models import User

PRESETS = [
    "today",
    "yesterday",
    "week",
    "last_seven_days",
    "month",
    "previous_month",
    "year",
    "all",
]
SORTS = {
    "newest": ("-effective_date", "-id"),
    "oldest": ("effective_date", "id"),
    "highest": ("-amount_paise", "-effective_date", "-id"),
    "lowest": ("amount_paise", "effective_date", "id"),
}


def month_end(day: date) -> date:
    return day.replace(day=calendar.monthrange(day.year, day.month)[1])


def date_range(data: dict[str, Any], today: date) -> tuple[date | None, date | None]:
    explicit = any(key in data for key in ("date", "date_from", "date_to"))
    if explicit and "period" in data:
        raise serializers.ValidationError({"period": "Use a preset or explicit dates, not both."})
    if "date" in data:
        if "date_from" in data or "date_to" in data:
            raise serializers.ValidationError({"date": "Cannot combine a day with a range."})
        return data["date"], data["date"]
    if explicit:
        start, end = data.get("date_from"), data.get("date_to")
        if start and end and start > end:
            raise serializers.ValidationError({"date_to": "Must be on or after date_from."})
        return start, end
    period = data.get("period", "all")
    if period == "today":
        return today, today
    if period == "yesterday":
        return today - timedelta(days=1), today - timedelta(days=1)
    if period == "week":
        monday = today - timedelta(days=today.weekday())
        return monday, monday + timedelta(days=6)
    if period == "last_seven_days":
        return today - timedelta(days=6), today
    if period == "month":
        return today.replace(day=1), month_end(today)
    if period == "previous_month":
        last = today.replace(day=1) - timedelta(days=1)
        return last.replace(day=1), last
    if period == "year":
        return today.replace(month=1, day=1), today.replace(month=12, day=31)
    return None, None


class HistoryQuerySerializer(StrictSerializer):
    period = serializers.ChoiceField(choices=PRESETS, required=False)
    date = serializers.DateField(required=False)
    date_from = serializers.DateField(required=False)
    date_to = serializers.DateField(required=False)
    amount_min = MoneyField(
        source="amount_min_paise",
        required=False,
        help_text="Inclusive transaction face-amount minimum in INR.",
    )
    amount_max = MoneyField(
        source="amount_max_paise",
        required=False,
        help_text="Inclusive transaction face-amount maximum in INR.",
    )
    account = serializers.UUIDField(required=False)
    destination = serializers.UUIDField(required=False)
    category = serializers.UUIDField(required=False)
    kind = serializers.ChoiceField(choices=Event.Kind, required=False)
    contact = serializers.UUIDField(required=False)
    payment_method = serializers.CharField(max_length=50, required=False)
    merchant = serializers.CharField(max_length=200, required=False)
    search = serializers.CharField(max_length=200, required=False)
    sort = serializers.ChoiceField(choices=list(SORTS), required=False)
    ordering = serializers.CharField(
        max_length=200,
        required=False,
        help_text="Comma-separated effective_date, created_at or amount_paise; prefix - for descending.",
    )
    page = serializers.IntegerField(min_value=1, required=False)

    def validate_ordering(self, value: str) -> str:
        fields = value.split(",")
        allowed = {"effective_date", "created_at", "amount_paise"}
        if any(field.removeprefix("-") not in allowed for field in fields) or len(
            {field.removeprefix("-") for field in fields}
        ) != len(fields):
            raise serializers.ValidationError("Unsupported or repeated ordering field.")
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        date_range(attrs, timezone.localdate())
        if attrs.get("amount_min_paise", 0) > attrs.get("amount_max_paise", MAX_PAISE):
            raise serializers.ValidationError({"amount_max": "Must be at least amount_min."})
        if "sort" in attrs and "ordering" in attrs:
            raise serializers.ValidationError({"sort": "Choose sort or ordering."})
        return attrs


def validate_query(
    params: Any, serializer_class: type[StrictSerializer] = HistoryQuerySerializer
) -> dict[str, Any]:
    if hasattr(params, "getlist") and any(len(params.getlist(key)) != 1 for key in params):
        raise serializers.ValidationError({"query": "Repeated parameters are unsupported."})
    serializer = serializer_class(data=params)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def filter_events(rows: QuerySet[Event], user: User, data: dict[str, Any]) -> QuerySet[Event]:
    """Never broaden the supplied owner scope. Foreign references return empty results."""
    start, end = date_range(data, timezone.localdate())
    if start:
        rows = rows.filter(effective_date__gte=start)
    if end:
        rows = rows.filter(effective_date__lte=end)
    if "amount_min_paise" in data:
        rows = rows.filter(amount_paise__gte=data["amount_min_paise"])
    if "amount_max_paise" in data:
        rows = rows.filter(amount_paise__lte=data["amount_max_paise"])
    for key, model in (
        ("account", Account),
        ("destination", Account),
        ("category", Category),
        ("contact", Contact),
    ):
        if key in data and not model.objects.filter(user=user, pk=data[key]).exists():
            return rows.none()
    if "account" in data:
        legs = Posting.objects.filter(event_id=OuterRef("pk"), account_id=data["account"])
        rows = rows.filter(Exists(legs))
    if "category" in data:
        rows = rows.filter(
            Q(category_id=data["category"]) | Q(original_expense__category_id=data["category"])
        )
    if "contact" in data:
        claims = Posting.objects.filter(event_id=OuterRef("pk"), claim__contact_id=data["contact"])
        shares = BillShare.objects.filter(bill__event_id=OuterRef("pk"), contact_id=data["contact"])
        rows = rows.filter(
            Q(contact_id=data["contact"])
            | Q(original_expense__contact_id=data["contact"])
            | Q(Exists(claims))
            | Q(Exists(shares))
        )
    for key in ("kind", "destination"):
        if key in data:
            rows = rows.filter(**{key: data[key]})
    for key in ("payment_method", "merchant"):
        if key in data:
            rows = rows.alias(
                **{
                    f"report_{key}": Coalesce(
                        NullIf(key, Value("")), f"original_expense__{key}", Value("")
                    )
                }
            ).filter(**{f"report_{key}": data[key]})
    for text in search_smart_split(data.get("search", "")):
        claims = Posting.objects.filter(
            event_id=OuterRef("pk"), claim__contact__display_name__icontains=text
        )
        shares = BillShare.objects.filter(
            bill__event_id=OuterRef("pk"), contact__display_name__icontains=text
        )
        rows = rows.filter(
            Q(title__icontains=text)
            | Q(merchant__icontains=text)
            | Q(notes__icontains=text)
            | Q(funding_source__icontains=text)
            | Q(contact__display_name__icontains=text)
            | Q(original_expense__contact__display_name__icontains=text)
            | Q(Exists(claims))
            | Q(Exists(shares))
        )
    ordering = SORTS.get(data.get("sort", "newest"))
    if data.get("ordering"):
        ordering = (
            *data["ordering"].split(","),
            "-id" if data["ordering"].startswith("-") else "id",
        )
    return rows.order_by(*ordering)


class HistoryFilterBackend(BaseFilterBackend):
    def filter_queryset(
        self, request: Any, queryset: QuerySet[Event], view: Any
    ) -> QuerySet[Event]:
        if getattr(view, "action", None) != "list":
            return queryset
        return filter_events(queryset, request.user, validate_query(request.query_params))

    def get_schema_operation_parameters(self, view: Any) -> list[dict[str, Any]]:
        return []  # The endpoint declares HistoryQuerySerializer for its list operation.
