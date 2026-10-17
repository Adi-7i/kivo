"""Owned personal relationships; the ledger remains the balance authority."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import Q


class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    display_name = models.CharField(max_length=100)
    notes = models.TextField(blank=True, max_length=4000)
    is_roommate = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["display_name", "id"]
        indexes = [models.Index(fields=["user", "archived"], name="contact_owner_active_idx")]


class MetadataChange(models.Model):
    """Append-only record of nonfinancial configuration and contact changes."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    resource_id = models.UUIDField()
    resource_type = models.CharField(max_length=30)
    before = models.JSONField(default=dict)
    after = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "resource_id"], name="metadata_owner_resource_idx")]


class Claim(models.Model):
    """An immutable relationship to journal postings, never a second balance."""

    class Direction(models.TextChoices):
        RECEIVABLE = "receivable", "Owed to me"
        PAYABLE = "payable", "Owed by me"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    contact = models.ForeignKey(Contact, on_delete=models.PROTECT, related_name="claims")
    direction = models.CharField(max_length=10, choices=Direction)
    source_event = models.ForeignKey(
        "ledger.Event", on_delete=models.PROTECT, related_name="source_claims"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["source_event__effective_date", "created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(direction__in=["receivable", "payable"]), name="claim_valid_direction"
            ),
            models.UniqueConstraint(
                fields=["source_event", "contact", "direction"], name="claim_origin_contact_unique"
            ),
        ]
        indexes = [models.Index(fields=["user", "contact"], name="claim_owner_contact_idx")]


class SharedBill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    event = models.OneToOneField(
        "ledger.Event", on_delete=models.PROTECT, related_name="shared_bill"
    )
    payer = models.ForeignKey(Contact, on_delete=models.PROTECT, null=True, blank=True)
    split_method = models.CharField(
        max_length=6, choices=[("equal", "Equal"), ("custom", "Custom")]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event__effective_date", "-created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(split_method__in=["equal", "custom"]), name="bill_valid_split_method"
            )
        ]


class BillShare(models.Model):
    bill = models.ForeignKey(SharedBill, on_delete=models.PROTECT, related_name="shares")
    contact = models.ForeignKey(Contact, on_delete=models.PROTECT, null=True, blank=True)
    claim = models.OneToOneField(Claim, on_delete=models.PROTECT, null=True, blank=True)
    amount_paise = models.BigIntegerField()

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["bill", "contact"], nulls_distinct=False, name="bill_participant_unique"
            ),
            models.CheckConstraint(condition=Q(amount_paise__gte=0), name="bill_share_nonnegative"),
        ]


class RentPlan(models.Model):
    """Fixed financial configuration; deactivate and replace to change the terms."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    title = models.CharField(max_length=200)
    payee = models.CharField(max_length=200)
    start_date = models.DateField()
    due_day = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Null means last day."
    )
    amount_paise = models.BigIntegerField()
    category = models.ForeignKey("ledger.Category", on_delete=models.PROTECT)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "id"]
        constraints = [
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="rent_plan_positive"),
            models.CheckConstraint(
                condition=Q(due_day__isnull=True) | Q(due_day__gte=1, due_day__lte=31),
                name="rent_due_day_valid",
            ),
        ]


class RentShare(models.Model):
    plan = models.ForeignKey(RentPlan, on_delete=models.PROTECT, related_name="shares")
    contact = models.ForeignKey(Contact, on_delete=models.PROTECT, null=True, blank=True)
    amount_paise = models.BigIntegerField()

    class Meta:
        ordering = ["id"]
        constraints = [
            models.UniqueConstraint(
                fields=["plan", "contact"], nulls_distinct=False, name="rent_participant_unique"
            ),
            models.CheckConstraint(condition=Q(amount_paise__gte=0), name="rent_share_nonnegative"),
        ]


class RentObligation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    plan = models.ForeignKey(RentPlan, on_delete=models.PROTECT, related_name="obligations")
    month = models.DateField()
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["due_date", "id"]
        constraints = [models.UniqueConstraint(fields=["plan", "month"], name="rent_month_unique")]
        indexes = [models.Index(fields=["user", "due_date"], name="rent_owner_due_idx")]


class ObligationChange(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    obligation = models.ForeignKey(RentObligation, on_delete=models.PROTECT, related_name="changes")
    action = models.CharField(max_length=6, choices=[("skip", "Skip"), ("reopen", "Reopen")])
    reason = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(action__in=["skip", "reopen"]), name="rent_change_valid"
            )
        ]


class RentPayment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    obligation = models.ForeignKey(
        RentObligation, on_delete=models.PROTECT, related_name="payments"
    )
    event = models.OneToOneField(
        "ledger.Event", on_delete=models.PROTECT, related_name="rent_payment"
    )
    created_at = models.DateTimeField(auto_now_add=True)


class RentReserve(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    obligation = models.ForeignKey(
        RentObligation, on_delete=models.PROTECT, related_name="reserves"
    )
    label = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]


class ReserveChange(models.Model):
    """Append-only earmarks, claim assignments and reversible payment consumption."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reserve = models.ForeignKey(RentReserve, on_delete=models.PROTECT, related_name="changes")
    delta_paise = models.BigIntegerField()
    payment = models.ForeignKey(RentPayment, on_delete=models.PROTECT, null=True, blank=True)
    claim = models.ForeignKey(Claim, on_delete=models.PROTECT, null=True, blank=True)
    settlement = models.ForeignKey(
        "ledger.Event",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="rent_reserve_changes",
    )
    reason = models.CharField(max_length=500)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.CheckConstraint(condition=~Q(delta_paise=0), name="reserve_change_nonzero"),
            models.CheckConstraint(
                condition=Q(claim__isnull=True, settlement__isnull=True)
                | Q(
                    claim__isnull=False,
                    payment__isnull=False,
                    settlement__isnull=True,
                    delta_paise__gt=0,
                )
                | Q(
                    claim__isnull=False,
                    payment__isnull=False,
                    settlement__isnull=False,
                    delta_paise__lt=0,
                ),
                name="reserve_claim_change_valid",
            ),
        ]
