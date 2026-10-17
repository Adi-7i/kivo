"""Budget configuration and append-only configuration provenance; no stored totals."""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.db.models import F, Q

from apps.ledger.money import MAX_PAISE


class Budget(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    category = models.ForeignKey("ledger.Category", null=True, blank=True, on_delete=models.PROTECT)
    name = models.CharField(max_length=100)
    period_type = models.CharField(
        max_length=7, choices=[("monthly", "Monthly"), ("custom", "Custom")]
    )
    period_start = models.DateField()
    period_end = models.DateField()
    limit_paise = models.BigIntegerField()
    warning_percent = models.PositiveSmallIntegerField(default=80)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-period_start", "id"]
        indexes = [
            models.Index(
                fields=["user", "archived", "period_start"], name="budget_owner_period_idx"
            )
        ]
        constraints = [
            models.CheckConstraint(
                condition=Q(period_end__gte=F("period_start")), name="budget_valid_dates"
            ),
            models.CheckConstraint(
                condition=Q(limit_paise__gte=0, limit_paise__lte=MAX_PAISE),
                name="budget_valid_limit",
            ),
            models.CheckConstraint(
                condition=Q(warning_percent__gte=1, warning_percent__lte=100),
                name="budget_valid_warning",
            ),
            models.CheckConstraint(
                condition=Q(period_type__in=["monthly", "custom"]), name="budget_valid_period"
            ),
        ]


class BudgetChange(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    budget = models.ForeignKey(Budget, on_delete=models.PROTECT, related_name="changes")
    before = models.JSONField(default=dict)
    after = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
