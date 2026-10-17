"""Explicit report and budget contracts; every INR value is a decimal string."""

from __future__ import annotations

from rest_framework import serializers

from apps.funds.serializers import FundingBatchSerializer
from apps.ledger.history import HistoryQuerySerializer
from apps.ledger.money import MoneyField
from apps.ledger.serializers import AccountSerializer, EventSerializer, StrictSerializer
from apps.sharing.serializers import ObligationSerializer


class ReportQuerySerializer(HistoryQuerySerializer):
    pass


class TrendQuerySerializer(ReportQuerySerializer):
    interval = serializers.ChoiceField(choices=["day", "week", "month"], required=False)


class BreakdownQuerySerializer(ReportQuerySerializer):
    dimension = serializers.ChoiceField(
        choices=["category", "merchant", "account", "payment_method", "contact"], required=False
    )


class BudgetWriteSerializer(StrictSerializer):
    name = serializers.CharField(max_length=100)
    category = serializers.UUIDField(required=False, allow_null=True, default=None)
    period_type = serializers.ChoiceField(
        choices=[("monthly", "Monthly"), ("custom", "Custom")], default="monthly"
    )
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    limit = MoneyField(source="limit_paise")
    warning_percent = serializers.IntegerField(min_value=1, max_value=100, default=80)
    archived = serializers.BooleanField(default=False)


class BudgetSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    name = serializers.CharField()
    category = serializers.UUIDField(allow_null=True)
    period_type = serializers.CharField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    limit = MoneyField()
    warning_percent = serializers.IntegerField()
    archived = serializers.BooleanField()
    spent = MoneyField()
    remaining = MoneyField()
    overspending = MoneyField()
    utilization_percent = serializers.CharField(allow_null=True)
    warning_state = serializers.ChoiceField(choices=["ok", "warning", "at_limit", "exceeded"])
    created_at = serializers.DateTimeField()


class PeriodSerializer(serializers.Serializer):
    currency = serializers.CharField()
    timezone = serializers.CharField()
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    calendar_days = serializers.IntegerField()
    as_of_date = serializers.DateField()
    incomplete_period = serializers.BooleanField()


class ComparisonSerializer(serializers.Serializer):
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    personal_expense = MoneyField()
    difference = MoneyField()
    percentage_difference = serializers.CharField(allow_null=True)
    comparable = serializers.BooleanField()


class HighestDaySerializer(serializers.Serializer):
    date = serializers.DateField()
    amount = MoneyField()


class ReportSummarySerializer(serializers.Serializer):
    period = PeriodSerializer()
    personal_expense = MoneyField()
    external_income = MoneyField()
    money_received = MoneyField()
    money_paid = MoneyField()
    borrowed = MoneyField()
    repayments_received = MoneyField()
    lent = MoneyField()
    payable_settlements = MoneyField()
    internal_transfers = MoneyField()
    shared_advances = MoneyField()
    principal_repaid = MoneyField()
    shared_settlements_paid = MoneyField()
    refunds_received = MoneyField()
    transaction_count = serializers.IntegerField()
    average_daily_expense = serializers.CharField(allow_null=True)
    highest_spending_day = HighestDaySerializer(allow_null=True)
    highest_spending_days = HighestDaySerializer(many=True)
    comparison = ComparisonSerializer(allow_null=True)


class TrendRowSerializer(HighestDaySerializer):
    transaction_count = serializers.IntegerField()


class TrendsSerializer(serializers.Serializer):
    period = PeriodSerializer()
    interval = serializers.CharField()
    results = TrendRowSerializer(many=True)


class BreakdownRowSerializer(serializers.Serializer):
    key = serializers.CharField(allow_null=True, allow_blank=True)
    label = serializers.CharField(allow_null=True, allow_blank=True)
    amount = MoneyField()
    transaction_count = serializers.IntegerField()


class ReportBreakdownSerializer(serializers.Serializer):
    period = PeriodSerializer()
    dimension = serializers.CharField()
    results = BreakdownRowSerializer(many=True)


class SpendingSerializer(serializers.Serializer):
    today = MoneyField()
    week = MoneyField()
    month = MoneyField()
    year = MoneyField()


class RentDashboardSerializer(serializers.Serializer):
    unpaid_count = serializers.IntegerField()
    overdue_count = serializers.IntegerField()
    due_count = serializers.IntegerField()
    upcoming_count = serializers.IntegerField()
    outstanding = MoneyField()
    next_obligations = ObligationSerializer(many=True)


class DashboardSerializer(serializers.Serializer):
    currency = serializers.CharField()
    timezone = serializers.CharField()
    as_of_date = serializers.DateField()
    liquid_balance = MoneyField()
    accounts = AccountSerializer(many=True)
    spending = SpendingSerializer()
    selected_period = ReportSummarySerializer()
    receivables = MoneyField()
    payables = MoneyField()
    reserved = MoneyField()
    safe_to_spend = MoneyField()
    rent = RentDashboardSerializer()
    budgets = BudgetSerializer(many=True)
    budget_count = serializers.IntegerField()
    recent_activities = EventSerializer(many=True)


class ReportFundingBatchSerializer(FundingBatchSerializer):
    expense_attributed = MoneyField(read_only=True, allow_null=True)
    refund_restored = MoneyField(read_only=True, allow_null=True)
    principal_returned = MoneyField(read_only=True, allow_null=True)
    advanced_to_receivables = MoneyField(read_only=True, allow_null=True)
    recovered_from_receivables = MoneyField(read_only=True, allow_null=True)
    internal_transferred = MoneyField(read_only=True, allow_null=True)

    class Meta(FundingBatchSerializer.Meta):
        fields = (
            *FundingBatchSerializer.Meta.fields,
            "expense_attributed",
            "refund_restored",
            "principal_returned",
            "advanced_to_receivables",
            "recovered_from_receivables",
            "internal_transferred",
        )
        read_only_fields = fields
