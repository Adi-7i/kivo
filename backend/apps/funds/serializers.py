"""Read-only source attribution contracts. Capacity is never labeled a cash balance."""

from __future__ import annotations

from datetime import date

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.funds.models import Allocation, AllocationGap, BatchCapacity, FundingBatch, FundPosition
from apps.ledger.money import MoneyField, format_money


class PositionSerializer(serializers.ModelSerializer):
    amount = MoneyField(source="amount_paise", read_only=True)

    class Meta:
        model = FundPosition
        fields = ("account", "amount")
        read_only_fields = fields


class FundingBatchSerializer(serializers.ModelSerializer):
    source_event = serializers.UUIDField(source="source.public_id", read_only=True)
    funding_source = serializers.CharField(source="source.funding_source", read_only=True)
    source_type = serializers.CharField(source="source.kind", read_only=True)
    original_amount = MoneyField(source="source.amount_paise", read_only=True)
    effective_date = serializers.DateField(source="source.effective_date", read_only=True)
    originating_account = serializers.UUIDField(source="source.account_id", read_only=True)
    allocated_amount = serializers.SerializerMethodField()
    remaining_capacity = serializers.SerializerMethodField()
    exhausted_on = serializers.SerializerMethodField()
    elapsed_calendar_days = serializers.SerializerMethodField()
    attribution_status = serializers.SerializerMethodField()
    positions = PositionSerializer(source="snapshot_positions", many=True, read_only=True)
    run_id = serializers.SerializerMethodField()
    policy_version = serializers.SerializerMethodField()

    def _capacity(self, batch: FundingBatch) -> BatchCapacity | None:
        rows = batch.snapshot_capacities
        return rows[0] if rows else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_allocated_amount(self, batch: FundingBatch) -> str | None:
        capacity = self._capacity(batch)
        return format_money(capacity.allocated_paise) if capacity else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_remaining_capacity(self, batch: FundingBatch) -> str | None:
        capacity = self._capacity(batch)
        return format_money(capacity.remaining_paise) if capacity else None

    @extend_schema_field(serializers.DateField(allow_null=True))
    def get_exhausted_on(self, batch: FundingBatch) -> date | None:
        capacity = self._capacity(batch)
        run = self.context.get("run")
        return capacity.exhausted_on if capacity and run and run.status == "complete" else None

    @extend_schema_field(serializers.IntegerField(allow_null=True))
    def get_elapsed_calendar_days(self, batch: FundingBatch) -> int | None:
        exhausted = self.get_exhausted_on(batch)
        return (exhausted - batch.source.effective_date).days + 1 if exhausted else None

    def get_attribution_status(self, batch: FundingBatch) -> str:
        run = self.context.get("run")
        if self._capacity(batch):
            return run.status
        return "inactive" if hasattr(batch.source, "reversal") else "not_computed"

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_run_id(self, batch: FundingBatch) -> str | None:
        run = self.context.get("run")
        return str(run.public_id) if run else None

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_policy_version(self, batch: FundingBatch) -> str | None:
        run = self.context.get("run")
        return run.policy_version if run else None

    class Meta:
        model = FundingBatch
        fields = (
            "id",
            "source_event",
            "source_type",
            "funding_source",
            "original_amount",
            "effective_date",
            "originating_account",
            "created_at",
            "allocated_amount",
            "remaining_capacity",
            "positions",
            "exhausted_on",
            "elapsed_calendar_days",
            "attribution_status",
            "run_id",
            "policy_version",
        )
        read_only_fields = fields


class AllocationSerializer(serializers.ModelSerializer):
    transaction = serializers.UUIDField(source="event.public_id", read_only=True)
    effective_date = serializers.DateField(source="event.effective_date", read_only=True)
    title = serializers.CharField(source="event.title", read_only=True)
    amount = MoneyField(source="amount_paise", read_only=True)
    run_id = serializers.UUIDField(source="run.public_id", read_only=True)
    category = serializers.SerializerMethodField()

    @extend_schema_field(serializers.UUIDField(allow_null=True))
    def get_category(self, allocation: Allocation) -> str | None:
        event = (
            allocation.event.original_expense if allocation.kind == "refund" else allocation.event
        )
        return str(event.category_id) if event.category_id else None

    class Meta:
        model = Allocation
        fields = (
            "batch",
            "transaction",
            "effective_date",
            "title",
            "kind",
            "amount",
            "from_account",
            "to_account",
            "category",
            "run_id",
        )
        read_only_fields = fields


class GapSerializer(serializers.ModelSerializer):
    transaction = serializers.UUIDField(source="event.public_id", read_only=True, allow_null=True)
    amount = MoneyField(source="amount_paise", read_only=True)

    class Meta:
        model = AllocationGap
        fields = ("transaction", "account", "amount", "code")
        read_only_fields = fields


class FundSummarySerializer(serializers.Serializer):
    run_id = serializers.UUIDField(allow_null=True, read_only=True)
    policy_version = serializers.CharField(allow_null=True, read_only=True)
    attribution_status = serializers.CharField(read_only=True)
    active_batches = serializers.IntegerField(read_only=True)
    original_amount = MoneyField(read_only=True, allow_null=True)
    allocated_amount = MoneyField(read_only=True, allow_null=True)
    remaining_capacity = MoneyField(read_only=True, allow_null=True)
    unfunded_amount = MoneyField(read_only=True, allow_null=True)
    gaps = GapSerializer(many=True, read_only=True)


class BreakdownSerializer(serializers.Serializer):
    category = serializers.UUIDField(read_only=True)
    category_name = serializers.CharField(read_only=True)
    date = serializers.DateField(read_only=True)
    net_expense = MoneyField(read_only=True)
