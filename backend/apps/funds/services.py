"""Rebuild immutable attribution snapshots under the same owner lock as ledger writes."""

from __future__ import annotations

import hashlib
import json
from collections import defaultdict
from dataclasses import asdict

from django.db import transaction
from django.db.models import Sum

from apps.funds.engine import Gap
from apps.funds.engine_v2 import POLICY_VERSION, Entry, Portion, allocate
from apps.funds.models import (
    Allocation,
    AllocationGap,
    AllocationRun,
    BatchCapacity,
    ClaimPosition,
    FundingBatch,
    FundPosition,
)
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Event, Posting
from apps.ledger.selectors import active_events
from apps.users.models import User


def _inputs(user: User) -> tuple[list[Entry], str]:
    from django.db.models import Prefetch

    entries = []
    legs = Posting.objects.select_related("claim", "claim__source_event")
    for event in active_events(user).prefetch_related(Prefetch("postings", queryset=legs)):
        postings = list(event.postings.all())
        claim_legs = [leg for leg in postings if leg.claim_id]
        claim = claim_legs[0].claim if len(claim_legs) == 1 else None
        portions = (
            tuple(
                Portion(leg.claim_id, leg.amount_paise)
                for leg in sorted(
                    [leg for leg in postings if leg.book in ("expense", "receivable")],
                    key=lambda leg: (
                        leg.claim_id is not None,
                        str(leg.claim.contact_id) if leg.claim_id else "",
                    ),
                )
            )
            if event.kind == "shared_paid"
            else ()
        )
        entries.append(
            Entry(
                event.id,
                event.kind,
                event.amount_paise,
                event.effective_date,
                event.sequence,
                event.account_id,
                event.destination_id,
                event.original_expense_id,
                portions,
                claim.id if claim else None,
                claim.source_event_id
                if claim and event.kind == "repay_out" and claim.source_event.kind == "shared_due"
                else None,
            )
        )
    tip = Event.objects.filter(user=user).order_by("-id").values_list("id", flat=True).first()
    digest = hashlib.sha256(
        json.dumps(
            {
                "policy": POLICY_VERSION,
                "journal_tip": tip,
                "entries": [asdict(entry) for entry in entries],
            },
            sort_keys=True,
            default=str,
            separators=(",", ":"),
        ).encode()
    ).hexdigest()
    return entries, digest


def rebuild_attribution(
    *, user: User, trigger_event: Event | None = None, strict: bool = True
) -> AllocationRun:
    """Financial writes require complete attribution; legacy audits may record explicit gaps.

    Previous runs are never updated or deleted. This function is also the explicit
    backfill boundary for history posted before Phase 4 was installed.
    """
    with transaction.atomic():
        User.objects.select_for_update().get(pk=user.pk)
        entries, digest = _inputs(user)
        previous = AllocationRun.objects.filter(user=user).order_by("-id").first()
        if previous and previous.input_hash == digest and previous.policy_version == POLICY_VERSION:
            if strict and previous.status != AllocationRun.Status.COMPLETE:
                raise FinancialConflict(
                    "Source attribution is incomplete; resolve recorded conflicts first."
                )
            return previous
        try:
            result = allocate(entries)
        except ValueError as exc:
            raise FinancialConflict(str(exc)) from exc
        projected: dict[object, int] = defaultdict(int)
        for (account_id, _), amount in result.positions.items():
            projected[account_id] += amount
        actual = {
            row["account_id"]: row["total"]
            for row in Posting.objects.filter(event__user=user, book="liquid")
            .values("account_id")
            .annotate(total=Sum("amount_paise"))
            if row["total"]
        }
        gaps = list(result.gaps)
        projected_claims: dict[object, int] = defaultdict(int)
        for (claim_id, _), amount in result.claim_positions.items():
            projected_claims[claim_id] += amount
        actual_claims = {
            row["claim_id"]: row["total"]
            for row in Posting.objects.filter(event__user=user, book="receivable")
            .values("claim_id")
            .annotate(total=Sum("amount_paise"))
            if row["total"]
        }
        if not gaps and dict(projected_claims) != actual_claims:
            raise FinancialConflict("Receivable source holdings do not reconcile with the ledger.")
        if not gaps and dict(projected) != actual:
            for account_id in set(projected) | set(actual):
                difference = abs(projected.get(account_id, 0) - actual.get(account_id, 0))
                if difference:
                    gaps.append(Gap(None, account_id, difference, "ledger_position_mismatch"))
        if strict and gaps:
            raise FinancialConflict(
                {
                    "code": "attribution_conflict",
                    "detail": "Account-aware source attribution is incomplete; the complete write was rolled back.",
                }
            )
        batches = {batch.source_id: batch for batch in FundingBatch.objects.filter(user=user)}
        # Include reversed historical receipts too: every installment remains independently traceable.
        missing_sources = Event.objects.filter(
            user=user, kind__in=["opening", "receipt", "borrow"]
        ).exclude(pk__in=batches)
        new_batches = [FundingBatch(user=user, source=source) for source in missing_sources]
        FundingBatch.objects.bulk_create(new_batches)
        batches.update({batch.source_id: batch for batch in new_batches})
        run = AllocationRun.objects.create(
            user=user,
            policy_version=POLICY_VERSION,
            input_hash=digest,
            status="incomplete" if gaps else "complete",
            trigger_event=trigger_event,
            previous=previous,
        )
        BatchCapacity.objects.bulk_create(
            [
                BatchCapacity(
                    run=run,
                    batch=batches[capacity.source_id],
                    original_paise=capacity.original_paise,
                    allocated_paise=capacity.allocated_paise,
                    remaining_paise=capacity.remaining_paise,
                    exhausted_on=capacity.exhausted_on if not gaps else None,
                )
                for capacity in result.capacities
            ]
        )
        FundPosition.objects.bulk_create(
            [
                FundPosition(
                    run=run, batch=batches[source_id], account_id=account_id, amount_paise=amount
                )
                for (account_id, source_id), amount in result.positions.items()
            ]
        )
        Allocation.objects.bulk_create(
            [
                Allocation(
                    run=run,
                    batch=batches[movement.source_id],
                    event_id=movement.event_id,
                    kind=movement.kind,
                    amount_paise=movement.amount_paise,
                    from_account_id=movement.from_account_id,
                    to_account_id=movement.to_account_id,
                    claim_id=movement.claim_id,
                    expense_event_id=movement.expense_event_id,
                )
                for movement in result.movements
            ]
        )
        ClaimPosition.objects.bulk_create(
            [
                ClaimPosition(
                    run=run, batch=batches[source_id], claim_id=claim_id, amount_paise=amount
                )
                for (claim_id, source_id), amount in result.claim_positions.items()
            ]
        )
        AllocationGap.objects.bulk_create(
            [
                AllocationGap(
                    run=run,
                    event_id=gap.event_id,
                    account_id=gap.account_id,
                    amount_paise=gap.amount_paise,
                    code=gap.code,
                )
                for gap in gaps
            ]
        )
        return run


def check_attribution(user: User) -> None:
    """Compare persisted current attribution with a fresh replay without writing records."""
    with transaction.atomic():
        User.objects.select_for_update().get(pk=user.pk)
        entries, digest = _inputs(user)
        run = AllocationRun.objects.filter(user=user).order_by("-id").first()
        if not entries and run is None:
            return
        if (
            not run
            or run.input_hash != digest
            or run.policy_version != POLICY_VERSION
            or run.status != "complete"
        ):
            raise FinancialConflict("Missing, stale or incomplete attribution snapshot.")
        expected = allocate(entries)
        capacities = {
            row.batch.source_id: (
                row.original_paise,
                row.allocated_paise,
                row.remaining_paise,
                row.exhausted_on,
            )
            for row in run.capacities.select_related("batch")
        }
        wanted = {
            row.source_id: (
                row.original_paise,
                row.allocated_paise,
                row.remaining_paise,
                row.exhausted_on,
            )
            for row in expected.capacities
        }
        positions = {
            (row.account_id, row.batch.source_id): row.amount_paise
            for row in run.positions.select_related("batch")
        }
        allocations = {
            (
                row.event_id,
                row.batch.source_id,
                row.kind,
                row.amount_paise,
                row.from_account_id,
                row.to_account_id,
                row.claim_id,
                row.expense_event_id,
            )
            for row in run.allocations.select_related("batch")
        }
        wanted_allocations = {
            (
                row.event_id,
                row.source_id,
                row.kind,
                row.amount_paise,
                row.from_account_id,
                row.to_account_id,
                row.claim_id,
                row.expense_event_id,
            )
            for row in expected.movements
        }
        if (
            capacities != wanted
            or positions != expected.positions
            or {
                (row.claim_id, row.batch.source_id): row.amount_paise
                for row in run.claim_positions.select_related("batch")
            }
            != expected.claim_positions
            or allocations != wanted_allocations
            or expected.gaps
            or run.gaps.exists()
        ):
            raise FinancialConflict(
                "Persisted attribution does not reconcile with the deterministic ledger replay."
            )
