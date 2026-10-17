"""Owner-scoped, snapshot-consistent source journey queries."""

from __future__ import annotations

from uuid import UUID

from django.db.models import BigIntegerField, Case, F, Prefetch, QuerySet, Sum, When
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404

from apps.funds.models import (
    Allocation,
    AllocationRun,
    BatchCapacity,
    ClaimPosition,
    FundingBatch,
    FundPosition,
)
from apps.users.models import User


def select_run(user: User, run_id: UUID | None = None) -> AllocationRun | None:
    runs = AllocationRun.objects.filter(user=user)
    return get_object_or_404(runs, public_id=run_id) if run_id else runs.order_by("-id").first()


def batches_for(user: User, run: AllocationRun | None) -> QuerySet[FundingBatch]:
    capacities = BatchCapacity.objects.filter(run=run) if run else BatchCapacity.objects.none()
    positions = FundPosition.objects.filter(run=run) if run else FundPosition.objects.none()
    return (
        FundingBatch.objects.filter(user=user)
        .select_related("source", "source__reversal")
        .prefetch_related(
            Prefetch("capacities", queryset=capacities, to_attr="snapshot_capacities"),
            Prefetch("positions", queryset=positions, to_attr="snapshot_positions"),
            Prefetch(
                "claim_positions",
                queryset=ClaimPosition.objects.filter(run=run),
                to_attr="snapshot_claim_positions",
            ),
        )
        .annotate(sequence=Coalesce("source__root_event_id", "source_id"))
        .order_by("source__effective_date", "sequence", "source_id")
    )


def allocations_for(user: User, run: AllocationRun | None) -> QuerySet[Allocation]:
    return (
        Allocation.objects.filter(run=run, run__user=user)
        .select_related("event", "event__original_expense", "expense_event", "batch", "run")
        .annotate(sequence=Coalesce("event__root_event_id", "event_id"))
        .order_by("event__effective_date", "sequence", "event_id", "id")
    )


def breakdown_for(user: User, run: AllocationRun | None, batch: FundingBatch) -> QuerySet:
    return (
        allocations_for(user, run)
        .filter(batch=batch, kind__in=["expense", "refund"])
        .order_by()
        .annotate(
            date=F("event__effective_date"),
            category=Coalesce(
                "expense_event__category_id",
                "event__category_id",
                "event__original_expense__category_id",
            ),
            category_name=Coalesce(
                "expense_event__category__name",
                "event__category__name",
                "event__original_expense__category__name",
            ),
        )
        .values("date", "category", "category_name")
        .annotate(
            net_expense=Sum(
                Case(
                    When(kind="refund", then=-F("amount_paise")),
                    default=F("amount_paise"),
                    output_field=BigIntegerField(),
                )
            )
        )
        .order_by("date", "category")
    )
