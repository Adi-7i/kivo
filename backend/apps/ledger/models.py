"""Declarative financial persistence. Posted events and legs are append-only."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q


class Account(models.Model):
    class Kind(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank"
        WALLET = "wallet", "Wallet"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=10, choices=Kind)
    opened_on = models.DateField()
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(kind__in=["cash", "bank", "wallet"]), name="account_valid_kind"
            ),
            models.UniqueConstraint(fields=["user", "name"], name="account_owner_name_unique"),
        ]


class Category(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    parent = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.PROTECT, related_name="children"
    )
    archived = models.BooleanField(default=False)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.CheckConstraint(condition=~Q(parent=F("id")), name="category_not_own_parent"),
            models.UniqueConstraint(
                fields=["user", "name", "parent"],
                nulls_distinct=False,
                name="category_owner_name_unique",
            ),
        ]


class Event(models.Model):
    class Kind(models.TextChoices):
        OPENING = "opening", "Opening equity"
        RECEIPT = "receipt", "External receipt"
        EXPENSE = "expense", "Personal expense"
        TRANSFER = "transfer", "Internal transfer"
        REFUND = "refund", "Expense refund"
        REVERSAL = "reversal", "Historical reversal"
        LEND = "lend", "Money lent"
        BORROW = "borrow", "Money borrowed"
        REPAY_IN = "repay_in", "Receivable repayment"
        REPAY_OUT = "repay_out", "Payable repayment"
        SHARED_PAID = "shared_paid", "Owner-paid shared bill"
        SHARED_DUE = "shared_due", "Friend-paid shared bill"

    id = models.BigAutoField(primary_key=True)
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    kind = models.CharField(max_length=12, choices=Kind)
    amount_paise = models.BigIntegerField()
    effective_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, related_name="events", null=True, blank=True
    )
    destination = models.ForeignKey(
        Account, on_delete=models.PROTECT, null=True, blank=True, related_name="incoming_transfers"
    )
    category = models.ForeignKey(Category, on_delete=models.PROTECT, null=True, blank=True)
    title = models.CharField(max_length=200)
    merchant = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True, max_length=4000)
    payment_method = models.CharField(max_length=50, blank=True)
    funding_source = models.CharField(max_length=200, blank=True)
    contact = models.ForeignKey("sharing.Contact", on_delete=models.PROTECT, null=True, blank=True)
    classification = models.CharField(
        max_length=5, blank=True, choices=[("", "Personal"), ("gift", "Gift"), ("treat", "Treat")]
    )
    original_expense = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="refunds"
    )
    reverses = models.OneToOneField(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="reversal"
    )
    supersedes = models.OneToOneField(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="replacement"
    )
    root_event = models.ForeignKey(
        "self", on_delete=models.PROTECT, null=True, blank=True, related_name="correction_chain"
    )
    reason = models.CharField(max_length=500, blank=True)
    is_void = models.BooleanField(default=False)

    class Meta:
        ordering = ["effective_date", "id"]
        indexes = [
            models.Index(fields=["user", "effective_date", "id"], name="event_owner_date_idx")
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(classification="")
                | Q(kind="expense", contact__isnull=False, classification__in=["gift", "treat"]),
                name="event_gift_classification",
            ),
            models.CheckConstraint(condition=Q(amount_paise__gt=0), name="event_positive_amount"),
            models.CheckConstraint(
                condition=Q(
                    kind__in=[
                        "opening",
                        "receipt",
                        "expense",
                        "transfer",
                        "refund",
                        "reversal",
                        "lend",
                        "borrow",
                        "repay_in",
                        "repay_out",
                        "shared_paid",
                        "shared_due",
                    ]
                ),
                name="event_valid_kind",
            ),
            models.CheckConstraint(
                condition=~Q(account=F("destination")), name="event_distinct_accounts"
            ),
            models.CheckConstraint(
                condition=(
                    Q(kind="transfer", destination__isnull=False)
                    | (~Q(kind="transfer") & Q(destination__isnull=True))
                ),
                name="event_transfer_destination",
            ),
            models.CheckConstraint(
                condition=(
                    Q(kind__in=["expense", "shared_paid", "shared_due"], category__isnull=False)
                    | (
                        ~Q(kind__in=["expense", "shared_paid", "shared_due"])
                        & Q(category__isnull=True)
                    )
                ),
                name="event_expense_category",
            ),
            models.CheckConstraint(
                condition=Q(kind="shared_due", account__isnull=True)
                | Q(kind="reversal")
                | (~Q(kind="shared_due") & Q(account__isnull=False)),
                name="event_account_required",
            ),
            models.CheckConstraint(
                condition=(
                    Q(kind="refund", original_expense__isnull=False)
                    | (~Q(kind="refund") & Q(original_expense__isnull=True))
                ),
                name="event_refund_reference",
            ),
            models.CheckConstraint(
                condition=(
                    Q(kind="reversal", reverses__isnull=False)
                    | (~Q(kind="reversal") & Q(reverses__isnull=True))
                ),
                name="event_reversal_reference",
            ),
        ]


class Posting(models.Model):
    class Book(models.TextChoices):
        LIQUID = "liquid", "Liquid asset"
        EQUITY = "equity", "Opening equity"
        EXTERNAL = "external", "External receipts"
        EXPENSE = "expense", "Personal expenses"
        RECEIVABLE = "receivable", "Personal receivables"
        PAYABLE = "payable", "Personal payables"

    event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="postings")
    account = models.ForeignKey(
        Account, on_delete=models.PROTECT, null=True, blank=True, related_name="postings"
    )
    book = models.CharField(max_length=10, choices=Book)
    claim = models.ForeignKey(
        "sharing.Claim", on_delete=models.PROTECT, null=True, blank=True, related_name="postings"
    )
    amount_paise = models.BigIntegerField(
        help_text="Signed debit-positive amount; each event sums to zero."
    )

    class Meta:
        constraints = [
            models.CheckConstraint(condition=~Q(amount_paise=0), name="posting_nonzero"),
            models.CheckConstraint(
                condition=(
                    Q(book="liquid", account__isnull=False, claim__isnull=True)
                    | Q(
                        book__in=["equity", "external", "expense"],
                        account__isnull=True,
                        claim__isnull=True,
                    )
                    | Q(
                        book__in=["receivable", "payable"],
                        account__isnull=True,
                        claim__isnull=False,
                    )
                ),
                name="posting_book_account",
            ),
        ]


class WriteReceipt(models.Model):
    """Durable owner-wide idempotency namespace, committed with the financial write."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    key = models.CharField(max_length=128)
    fingerprint = models.CharField(max_length=64)
    resource_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "key"], name="write_owner_key_unique")
        ]
