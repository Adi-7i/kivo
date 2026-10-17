"""Immutable funding identities and versioned attribution snapshots."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q


class FundingBatch(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    source = models.OneToOneField(
        "ledger.Event", on_delete=models.PROTECT, related_name="funding_batch"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["source__effective_date", "source_id"]


class AllocationRun(models.Model):
    class Status(models.TextChoices):
        COMPLETE = "complete", "Complete"
        INCOMPLETE = "incomplete", "Incomplete attribution"

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    policy_version = models.CharField(max_length=50)
    input_hash = models.CharField(max_length=64)
    status = models.CharField(max_length=12, choices=Status)
    trigger_event = models.ForeignKey(
        "ledger.Event", on_delete=models.PROTECT, null=True, blank=True
    )
    previous = models.ForeignKey("self", on_delete=models.PROTECT, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=["user", "-id"], name="fund_run_owner_idx")]
        constraints = [
            models.CheckConstraint(
                condition=Q(status__in=["complete", "incomplete"]), name="fund_run_valid_status"
            )
        ]


class BatchCapacity(models.Model):
    run = models.ForeignKey(AllocationRun, on_delete=models.PROTECT, related_name="capacities")
    batch = models.ForeignKey(FundingBatch, on_delete=models.PROTECT, related_name="capacities")
    original_paise = models.BigIntegerField()
    allocated_paise = models.BigIntegerField()
    remaining_paise = models.BigIntegerField()
    exhausted_on = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["run", "batch"], name="capacity_run_batch_unique"),
            models.CheckConstraint(
                condition=Q(original_paise__gt=0, allocated_paise__gte=0, remaining_paise__gte=0)
                & Q(original_paise=F("allocated_paise") + F("remaining_paise")),
                name="capacity_conserves_funds",
            ),
            models.CheckConstraint(
                condition=Q(exhausted_on__isnull=True) | Q(remaining_paise=0),
                name="capacity_exhaustion_requires_zero",
            ),
        ]


class FundPosition(models.Model):
    run = models.ForeignKey(AllocationRun, on_delete=models.PROTECT, related_name="positions")
    batch = models.ForeignKey(FundingBatch, on_delete=models.PROTECT, related_name="positions")
    account = models.ForeignKey("ledger.Account", on_delete=models.PROTECT)
    amount_paise = models.BigIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["run", "batch", "account"], name="position_run_batch_account_unique"
            ),
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="position_positive"),
        ]


class ClaimPosition(models.Model):
    """Recoverable source portions, derived from the ledger in an immutable run."""

    run = models.ForeignKey(AllocationRun, on_delete=models.PROTECT, related_name="claim_positions")
    batch = models.ForeignKey(
        FundingBatch, on_delete=models.PROTECT, related_name="claim_positions"
    )
    claim = models.ForeignKey("sharing.Claim", on_delete=models.PROTECT)
    amount_paise = models.BigIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["run", "batch", "claim"], name="claim_position_unique"),
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="claim_position_positive"),
        ]


class Allocation(models.Model):
    run = models.ForeignKey(AllocationRun, on_delete=models.PROTECT, related_name="allocations")
    batch = models.ForeignKey(FundingBatch, on_delete=models.PROTECT, related_name="allocations")
    event = models.ForeignKey(
        "ledger.Event", on_delete=models.PROTECT, related_name="fund_allocations"
    )
    kind = models.CharField(
        max_length=10,
        choices=[
            ("expense", "Expense"),
            ("transfer", "Transfer"),
            ("refund", "Refund"),
            ("advance", "Receivable advance"),
            ("recover", "Receivable recovery"),
            ("principal", "Payable principal return"),
        ],
    )
    claim = models.ForeignKey("sharing.Claim", on_delete=models.PROTECT, null=True, blank=True)
    expense_event = models.ForeignKey(
        "ledger.Event",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="expense_attributions",
    )
    amount_paise = models.BigIntegerField()
    from_account = models.ForeignKey(
        "ledger.Account", on_delete=models.PROTECT, null=True, related_name="fund_outflows"
    )
    to_account = models.ForeignKey(
        "ledger.Account", on_delete=models.PROTECT, null=True, related_name="fund_inflows"
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["run", "event", "batch", "kind", "claim"],
                nulls_distinct=False,
                name="allocation_run_event_batch_unique",
            ),
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="allocation_positive"),
            models.CheckConstraint(
                condition=Q(
                    kind__in=["expense", "transfer", "refund", "advance", "recover", "principal"]
                ),
                name="allocation_valid_kind",
            ),
        ]


class AllocationGap(models.Model):
    run = models.ForeignKey(AllocationRun, on_delete=models.PROTECT, related_name="gaps")
    event = models.ForeignKey("ledger.Event", on_delete=models.PROTECT, null=True, blank=True)
    account = models.ForeignKey("ledger.Account", on_delete=models.PROTECT)
    amount_paise = models.BigIntegerField()
    code = models.CharField(max_length=60)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="allocation_gap_positive")
        ]
