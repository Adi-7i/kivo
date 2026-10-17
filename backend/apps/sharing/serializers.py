"""Explicit Phase 5 contracts with exact INR strings and owned public UUIDs."""

from __future__ import annotations

from django.utils import timezone
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from apps.ledger.money import MoneyField
from apps.ledger.serializers import EventSerializer, StrictSerializer
from apps.sharing.models import (
    BillShare,
    Claim,
    Contact,
    ObligationChange,
    RentObligation,
    RentPayment,
    RentPlan,
    RentReserve,
    RentShare,
    ReserveChange,
    SharedBill,
)


class ContactWriteSerializer(StrictSerializer):
    display_name = serializers.CharField(max_length=100)
    notes = serializers.CharField(max_length=4000, required=False, allow_blank=True)
    is_roommate = serializers.BooleanField(required=False)
    archived = serializers.BooleanField(required=False)


class ContactSerializer(serializers.ModelSerializer):
    receivable = MoneyField(source="receivable_paise", read_only=True)
    payable = MoneyField(source="payable_paise", read_only=True)

    class Meta:
        model = Contact
        fields = (
            "id",
            "display_name",
            "notes",
            "is_roommate",
            "archived",
            "created_at",
            "receivable",
            "payable",
        )
        read_only_fields = fields


class ClaimSerializer(serializers.ModelSerializer):
    source_event = serializers.UUIDField(source="source_event.public_id", read_only=True)
    principal = MoneyField(source="principal_paise", read_only=True)
    outstanding = MoneyField(source="outstanding_paise", read_only=True)
    status = serializers.SerializerMethodField()

    @extend_schema_field(
        serializers.ChoiceField(choices=["open", "partial", "settled", "cancelled"])
    )
    def get_status(self, claim: Claim) -> str:
        if hasattr(claim.source_event, "reversal"):
            return "cancelled"
        if not claim.outstanding_paise:
            return "settled"
        return "partial" if claim.outstanding_paise < claim.principal_paise else "open"

    class Meta:
        model = Claim
        fields = (
            "id",
            "contact",
            "direction",
            "source_event",
            "principal",
            "outstanding",
            "status",
            "created_at",
        )
        read_only_fields = fields


class ParticipantSerializer(StrictSerializer):
    contact = serializers.UUIDField(allow_null=True)
    amount = MoneyField(source="amount_paise", required=False)


class FinancialWriteSerializer(StrictSerializer):
    account = serializers.UUIDField()
    amount = MoneyField(source="amount_paise")
    effective_date = serializers.DateField()
    title = serializers.CharField(max_length=200)
    notes = serializers.CharField(max_length=4000, required=False, allow_blank=True)
    payment_method = serializers.CharField(max_length=50, required=False, allow_blank=True)


class LoanWriteSerializer(FinancialWriteSerializer):
    kind = serializers.ChoiceField(choices=[("lend", "Money lent"), ("borrow", "Money borrowed")])
    contact = serializers.UUIDField()


class LoanCorrectSerializer(LoanWriteSerializer):
    reason = serializers.CharField(max_length=500)


class SettlementWriteSerializer(FinancialWriteSerializer):
    claim = serializers.UUIDField()


class SettlementCorrectSerializer(SettlementWriteSerializer):
    reason = serializers.CharField(max_length=500)


class BillWriteSerializer(FinancialWriteSerializer):
    account = serializers.UUIDField(required=False, allow_null=True)
    category = serializers.UUIDField()
    merchant = serializers.CharField(max_length=200, required=False, allow_blank=True)
    payer = serializers.UUIDField(required=False, allow_null=True, default=None)
    split_method = serializers.ChoiceField(
        choices=SharedBill._meta.get_field("split_method").choices
    )
    participants = ParticipantSerializer(many=True, max_length=100, allow_empty=False)


class BillCorrectSerializer(BillWriteSerializer):
    reason = serializers.CharField(max_length=500)


class BillShareSerializer(serializers.ModelSerializer):
    amount = MoneyField(source="amount_paise", read_only=True)

    class Meta:
        model = BillShare
        fields = ("contact", "claim", "amount")
        read_only_fields = fields


class BillSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)
    shares = BillShareSerializer(many=True, read_only=True)

    class Meta:
        model = SharedBill
        fields = ("id", "event", "payer", "split_method", "shares", "created_at")
        read_only_fields = fields


class RentPlanCreateSerializer(StrictSerializer):
    title = serializers.CharField(max_length=200)
    payee = serializers.CharField(max_length=200)
    start_date = serializers.DateField()
    due_day = serializers.IntegerField(min_value=1, max_value=31, allow_null=True, default=None)
    amount = MoneyField(source="amount_paise")
    category = serializers.UUIDField()
    split_method = serializers.ChoiceField(
        choices=SharedBill._meta.get_field("split_method").choices, default="custom"
    )
    participants = ParticipantSerializer(many=True, required=False, max_length=100)


class RentShareSerializer(serializers.ModelSerializer):
    amount = MoneyField(source="amount_paise", read_only=True)

    class Meta:
        model = RentShare
        fields = ("contact", "amount")
        read_only_fields = fields


class RentPlanSerializer(serializers.ModelSerializer):
    amount = MoneyField(source="amount_paise", read_only=True)
    shares = RentShareSerializer(many=True, read_only=True)

    class Meta:
        model = RentPlan
        fields = (
            "id",
            "title",
            "payee",
            "start_date",
            "due_day",
            "amount",
            "category",
            "active",
            "shares",
            "created_at",
        )
        read_only_fields = fields


class PlanActiveSerializer(StrictSerializer):
    active = serializers.BooleanField()


class GenerateSerializer(StrictSerializer):
    through = serializers.DateField()


class ObligationSerializer(serializers.ModelSerializer):
    amount = MoneyField(source="plan.amount_paise", read_only=True)
    paid = MoneyField(source="paid_paise", read_only=True)
    outstanding = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    overdue = serializers.SerializerMethodField()
    reason = serializers.CharField(source="last_reason", read_only=True, allow_null=True)

    @extend_schema_field(serializers.CharField())
    def get_outstanding(self, obligation: RentObligation) -> str:
        return MoneyField().to_representation(obligation.plan.amount_paise - obligation.paid_paise)

    @extend_schema_field(
        serializers.ChoiceField(
            choices=["upcoming", "due", "partial", "paid", "overdue", "skipped"]
        )
    )
    def get_status(self, obligation: RentObligation) -> str:
        if obligation.last_action == "skip":
            return "skipped"
        if obligation.paid_paise == obligation.plan.amount_paise:
            return "paid"
        if obligation.paid_paise:
            return "partial"
        today = timezone.localdate()
        return (
            "overdue"
            if obligation.due_date < today
            else "due"
            if obligation.due_date == today
            else "upcoming"
        )

    def get_overdue(self, obligation: RentObligation) -> bool:
        return (
            obligation.last_action != "skip"
            and obligation.paid_paise < obligation.plan.amount_paise
            and obligation.due_date < timezone.localdate()
        )

    class Meta:
        model = RentObligation
        fields = (
            "id",
            "plan",
            "month",
            "due_date",
            "amount",
            "paid",
            "outstanding",
            "status",
            "overdue",
            "reason",
            "created_at",
        )
        read_only_fields = fields


class ObligationChangeSerializer(StrictSerializer):
    action = serializers.ChoiceField(choices=["skip", "reopen"])
    reason = serializers.CharField(max_length=500)


class ObligationHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ObligationChange
        fields = ("id", "action", "reason", "created_at")
        read_only_fields = fields


class ReserveCreateSerializer(StrictSerializer):
    obligation = serializers.UUIDField()
    label = serializers.CharField(max_length=100)
    amount = MoneyField(source="amount_paise")
    reason = serializers.CharField(max_length=500)


class ReserveAdjustSerializer(StrictSerializer):
    amount = MoneyField(source="amount_paise")
    reason = serializers.CharField(max_length=500)


class ReserveSerializer(serializers.ModelSerializer):
    reserved = MoneyField(source="reserved_paise", read_only=True)

    class Meta:
        model = RentReserve
        fields = ("id", "obligation", "label", "reserved", "created_at")
        read_only_fields = fields


class ReserveChangeSerializer(serializers.ModelSerializer):
    delta = MoneyField(source="delta_paise", read_only=True)
    active = serializers.SerializerMethodField()

    def get_active(self, change: ReserveChange) -> bool:
        return change.payment_id is None or not hasattr(change.payment.event, "reversal")

    class Meta:
        model = ReserveChange
        fields = ("id", "delta", "payment", "reason", "active", "created_at")
        read_only_fields = fields


class SpendingCapacitySerializer(serializers.Serializer):
    liquid_balance = MoneyField(read_only=True)
    active_reserves = MoneyField(read_only=True)
    safe_to_spend = MoneyField(read_only=True)


class RentPaymentSerializer(serializers.ModelSerializer):
    event = EventSerializer(read_only=True)

    class Meta:
        model = RentPayment
        fields = ("id", "obligation", "event", "created_at")
        read_only_fields = fields


class RentPaymentCreateSerializer(StrictSerializer):
    account = serializers.UUIDField()
    amount = MoneyField(source="amount_paise")
    effective_date = serializers.DateField()
    title = serializers.CharField(max_length=200, required=False)
    notes = serializers.CharField(max_length=4000, required=False, allow_blank=True)
    payment_method = serializers.CharField(max_length=50, required=False, allow_blank=True)


class RentPaymentCorrectSerializer(RentPaymentCreateSerializer):
    reason = serializers.CharField(max_length=500)
