"""Explicit API contracts; all monetary JSON values are decimal strings."""

from __future__ import annotations

from typing import Any

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.ledger.models import Account, Category, Event, Posting
from apps.ledger.money import MoneyField


class StrictSerializer(serializers.Serializer):
    def to_internal_value(self, data: Any) -> dict[str, Any]:
        if isinstance(data, dict):
            unknown = set(data) - set(self.fields)
            if unknown:
                raise serializers.ValidationError(dict.fromkeys(sorted(unknown), "Unknown field."))
        return super().to_internal_value(data)


class AccountCreateSerializer(StrictSerializer):
    name = serializers.CharField(max_length=100)
    kind = serializers.ChoiceField(choices=Account.Kind)
    opened_on = serializers.DateField()
    opening_balance = MoneyField(default="0.00")


class AccountUpdateSerializer(StrictSerializer):
    name = serializers.CharField(max_length=100, required=False)
    archived = serializers.BooleanField(required=False)


class AccountSerializer(serializers.ModelSerializer):
    balance = MoneyField(source="balance_paise", read_only=True)
    opening_balance = MoneyField(source="opening_paise", read_only=True)

    class Meta:
        model = Account
        fields = (
            "id",
            "name",
            "kind",
            "opened_on",
            "archived",
            "created_at",
            "balance",
            "opening_balance",
        )
        read_only_fields = fields


class SummarySerializer(serializers.Serializer):
    liquid_balance = MoneyField(read_only=True)
    personal_expense = MoneyField(read_only=True)
    external_receipts = MoneyField(read_only=True)


class CategoryWriteSerializer(StrictSerializer):
    name = serializers.CharField(max_length=100)
    parent = serializers.UUIDField(required=False, allow_null=True, default=None)
    archived = serializers.BooleanField(required=False, default=False)


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "parent", "archived")
        read_only_fields = fields


class EventCreateSerializer(StrictSerializer):
    kind = serializers.ChoiceField(
        choices=[
            choice for choice in Event.Kind.choices if choice[0] not in ("opening", "reversal")
        ]
    )
    amount = MoneyField(source="amount_paise")
    effective_date = serializers.DateField()
    account = serializers.UUIDField()
    destination = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.UUIDField(required=False, allow_null=True)
    title = serializers.CharField(max_length=200)
    merchant = serializers.CharField(max_length=200, required=False, allow_blank=True)
    notes = serializers.CharField(max_length=4000, required=False, allow_blank=True)
    payment_method = serializers.CharField(max_length=50, required=False, allow_blank=True)
    funding_source = serializers.CharField(max_length=200, required=False, allow_blank=True)
    original_expense = serializers.UUIDField(required=False, allow_null=True)


class CorrectionSerializer(EventCreateSerializer):
    kind = serializers.ChoiceField(
        choices=[choice for choice in Event.Kind.choices if choice[0] != "reversal"]
    )
    reason = serializers.CharField(max_length=500)


class ReversalSerializer(StrictSerializer):
    reason = serializers.CharField(max_length=500)


class PostingSerializer(serializers.ModelSerializer):
    amount = MoneyField(source="amount_paise", read_only=True)

    class Meta:
        model = Posting
        fields = ("book", "account", "amount")
        read_only_fields = fields


class EventSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(source="public_id", read_only=True)
    amount = MoneyField(source="amount_paise", read_only=True)
    original_expense = serializers.UUIDField(
        source="original_expense.public_id", read_only=True, allow_null=True
    )
    reverses = serializers.UUIDField(source="reverses.public_id", read_only=True, allow_null=True)
    supersedes = serializers.UUIDField(
        source="supersedes.public_id", read_only=True, allow_null=True
    )
    reversed_by = serializers.UUIDField(
        source="reversal.public_id", read_only=True, allow_null=True
    )
    financial_effects = PostingSerializer(source="postings", many=True, read_only=True)
    status = serializers.SerializerMethodField()

    @extend_schema_field(
        serializers.ChoiceField(choices=["posted", "reversed", "voided", "reversal"])
    )
    def get_status(self, event: Event) -> str:
        if event.kind == Event.Kind.REVERSAL:
            return "reversal"
        if hasattr(event, "reversal"):
            return "voided" if event.reversal.is_void else "reversed"
        return "posted"

    class Meta:
        model = Event
        fields = (
            "id",
            "kind",
            "amount",
            "effective_date",
            "created_at",
            "account",
            "destination",
            "category",
            "title",
            "merchant",
            "notes",
            "payment_method",
            "funding_source",
            "original_expense",
            "reverses",
            "supersedes",
            "reversed_by",
            "reason",
            "status",
            "financial_effects",
        )
        read_only_fields = fields
