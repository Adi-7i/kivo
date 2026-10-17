"""Rent scheduling, confirmed payments and separate earmarks."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from django.db import transaction
from django.db.models import Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.funds.services import rebuild_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.ledger.models import Event
from apps.ledger.selectors import financial_summary
from apps.ledger.services import (
    _amount,
    _category,
    _idempotent,
    _owner_lock,
    _post,
    _reverse,
    assert_fundable_history,
)
from apps.sharing.calendar import month_start, monthly_schedule, next_month
from apps.sharing.contacts import contact_for
from apps.sharing.finance import assert_claim_history, post_bill
from apps.sharing.models import (
    BillShare,
    Claim,
    MetadataChange,
    ObligationChange,
    RentObligation,
    RentPayment,
    RentPlan,
    RentReserve,
    RentShare,
    ReserveChange,
)
from apps.sharing.participants import validated_shares
from apps.sharing.selectors import claims_for, obligations_for, reserves_for
from apps.sharing.splits import Share, partial_shares
from apps.users.models import User


def create_plan(*, user: User, key: str, data: dict[str, Any]) -> tuple[UUID, bool]:
    def action() -> UUID:
        _amount(data["amount_paise"])
        shares = validated_shares(user, data)
        plan = RentPlan.objects.create(
            user=user,
            title=data["title"],
            payee=data["payee"],
            start_date=data["start_date"],
            due_day=data.get("due_day"),
            amount_paise=data["amount_paise"],
            category=_category(user, data["category"]),
        )
        RentShare.objects.bulk_create(
            [
                RentShare(plan=plan, contact_id=row.contact_id, amount_paise=row.amount_paise)
                for row in shares
            ]
        )
        return plan.id

    return _idempotent(user=user, key=key, operation="rent.plan.create", data=data, action=action)


def set_plan_active(*, user: User, key: str, plan_id: UUID, active: bool) -> tuple[UUID, bool]:
    def action() -> UUID:
        plan = get_object_or_404(RentPlan, user=user, pk=plan_id)
        before = plan.active
        plan.active = active
        plan.save(update_fields=["active"])
        MetadataChange.objects.create(
            user=user,
            resource_type="rent_plan",
            resource_id=plan.id,
            before={"active": before},
            after={"active": active},
        )
        return plan.id

    return _idempotent(
        user=user,
        key=key,
        operation="rent.plan.active",
        data={"plan": plan_id, "active": active},
        action=action,
    )


def generate_obligations(
    *, user: User, key: str, plan_id: UUID, through: date
) -> tuple[UUID, bool]:
    def action() -> UUID:
        plan = get_object_or_404(RentPlan, user=user, pk=plan_id)
        if not plan.active:
            raise FinancialConflict("Inactive rent plans cannot generate obligations.")
        latest = plan.obligations.order_by("-month").values_list("month", flat=True).first()
        if latest and latest >= month_start(through):
            return plan.id
        start = next_month(latest) if latest else plan.start_date
        if (through.year - start.year) * 12 + through.month - start.month >= 120:
            raise ValidationError({"through": "Generate at most 120 new months per request."})
        for month, due_date in monthly_schedule(start, through, plan.due_day):
            RentObligation.objects.get_or_create(
                user=user, plan=plan, month=month, defaults={"due_date": due_date}
            )
        return plan.id

    return _idempotent(
        user=user,
        key=key,
        operation="rent.generate",
        data={"plan": plan_id, "through": through},
        action=action,
    )


def _reserve_amount(user: User, reserve_id: UUID) -> RentReserve:
    return get_object_or_404(reserves_for(user), pk=reserve_id)


def _claim_earmarks(user: User, obligation: RentObligation) -> dict[tuple[UUID, UUID], int]:
    """Derive protected portions from active audit changes, never a second balance."""
    rows = (
        ReserveChange.objects.filter(
            reserve__user=user,
            reserve__obligation=obligation,
            claim__isnull=False,
            payment__event__reversal__isnull=True,
        )
        .filter(Q(settlement__isnull=True) | Q(settlement__reversal__isnull=True))
        .values("reserve_id", "claim_id")
        .annotate(amount=Sum("delta_paise"))
    )
    return {(row["reserve_id"], row["claim_id"]): row["amount"] for row in rows}


def _assign_claim_reserves(user: User, obligation: RentObligation) -> None:
    """Assign uncommitted earmarks to oldest linked payables without releasing money.

    Each assignment is a zero-net pair: debit unassigned capacity, credit the
    claim's protected portion. Both entries follow the originating rent event.
    """
    portions = _claim_earmarks(user, obligation)
    reserves = list(reserves_for(user).filter(obligation=obligation))
    available = {
        reserve.id: reserve.reserved_paise
        - sum(amount for (reserve_id, _), amount in portions.items() if reserve_id == reserve.id)
        for reserve in reserves
    }
    claims = (
        claims_for(user)
        .filter(
            direction="payable",
            source_event__rent_payment__obligation=obligation,
            source_event__reversal__isnull=True,
        )
        .select_related("source_event__rent_payment")
        .order_by("source_event__effective_date", "source_event__id", "id")
    )
    for claim in claims:
        needed = claim.outstanding_paise - sum(
            amount for (_, claim_id), amount in portions.items() if claim_id == claim.id
        )
        for reserve in reserves:
            used = min(needed, available[reserve.id])
            if used > 0:
                payment = claim.source_event.rent_payment
                ReserveChange.objects.bulk_create(
                    [
                        ReserveChange(
                            reserve=reserve,
                            payment=payment,
                            delta_paise=-used,
                            reason="Assign rent earmark to friend payable",
                        ),
                        ReserveChange(
                            reserve=reserve,
                            payment=payment,
                            claim=claim,
                            delta_paise=used,
                            reason="Preserve rent earmark until friend settlement",
                        ),
                    ]
                )
                available[reserve.id] -= used
                needed -= used
            if needed <= 0:
                break


def settle_rent_reserves(user: User, claim: Claim, event: Event, outstanding_before: int) -> None:
    """Release only this claim's protected capacity, proportionally in integer paise.

    Round total release down; allocate spare paise by largest remainder, then
    reserve creation time/UUID. Final settlement releases every protected paisa.
    Reversing the settlement deactivates these exact changes.
    """
    if claim.direction != "payable" or not hasattr(claim.source_event, "rent_payment"):
        return
    payment = claim.source_event.rent_payment
    obligation = payment.obligation
    portions = _claim_earmarks(user, obligation)
    reserves = list(reserves_for(user).filter(obligation=obligation))
    amounts = [portions.get((reserve.id, claim.id), 0) for reserve in reserves]
    total = sum(amounts)
    release = total * event.amount_paise // outstanding_before
    if not release:
        return
    values = [divmod(release * amount, total) for amount in amounts]
    spare = release - sum(base for base, _ in values)
    priority = sorted(range(len(reserves)), key=lambda i: (-values[i][1], i))
    extras = set(priority[:spare])
    ReserveChange.objects.bulk_create(
        [
            ReserveChange(
                reserve=reserve,
                payment=payment,
                claim=claim,
                settlement=event,
                delta_paise=-(values[i][0] + (i in extras)),
                reason="Repayment of friend-paid rent",
            )
            for i, reserve in enumerate(reserves)
            if values[i][0] + (i in extras)
        ]
    )


def adjust_reserve(
    *, user: User, key: str, data: dict[str, Any], reserve_id: UUID | None = None
) -> tuple[UUID, bool]:
    def action() -> UUID:
        target = data["amount_paise"]
        if type(target) is not int or target < 0:
            raise ValidationError({"amount": "Reserve must be nonnegative integer paise."})
        if reserve_id:
            reserve = _reserve_amount(user, reserve_id)
            obligation = get_object_or_404(obligations_for(user), pk=reserve.obligation_id)
            current = reserve.reserved_paise
            protected = sum(
                amount
                for (row_id, _), amount in _claim_earmarks(user, obligation).items()
                if row_id == reserve.id
            )
            if target < protected:
                raise FinancialConflict(
                    "Repay or reverse the friend-paid rent before releasing its earmark."
                )
        else:
            obligation = get_object_or_404(obligations_for(user), pk=data["obligation"])
            if not target:
                raise ValidationError({"amount": "A new reserve must be positive."})
            reserve = RentReserve.objects.create(
                user=user, obligation=obligation, label=data["label"]
            )
            current = 0
        if obligation.last_action == "skip" and target:
            raise FinancialConflict("Skipped rent cannot be reserved.")
        reserved_elsewhere = sum(
            row.reserved_paise
            for row in reserves_for(user).filter(obligation=obligation).exclude(pk=reserve.id)
        )
        if target + reserved_elsewhere > (
            obligation.plan.amount_paise - obligation.paid_paise + obligation.friend_payable_paise
        ):
            raise FinancialConflict("Reserves exceed this obligation's unpaid rent.")
        if target != current:
            ReserveChange.objects.create(
                reserve=reserve, delta_paise=target - current, reason=data["reason"]
            )
        _assign_claim_reserves(user, obligation)
        return reserve.id

    return _idempotent(
        user=user,
        key=key,
        operation="rent.reserve.adjust" if reserve_id else "rent.reserve.create",
        data={"reserve": reserve_id, **data},
        action=action,
    )


def change_obligation(
    *, user: User, key: str, obligation_id: UUID, action: str, reason: str
) -> tuple[UUID, bool]:
    def perform() -> UUID:
        obligation = get_object_or_404(obligations_for(user), pk=obligation_id)
        if action not in ("skip", "reopen") or not reason.strip():
            raise ValidationError({"action": "Use skip or reopen with a reason."})
        if action == "skip":
            if obligation.paid_paise:
                raise FinancialConflict("Reverse active payments before skipping rent.")
            for reserve in reserves_for(user).filter(obligation=obligation):
                if reserve.reserved_paise:
                    ReserveChange.objects.create(
                        reserve=reserve, delta_paise=-reserve.reserved_paise, reason=reason
                    )
        ObligationChange.objects.create(obligation=obligation, action=action, reason=reason)
        return obligation.id

    return _idempotent(
        user=user,
        key=key,
        operation="rent.obligation.change",
        data={"obligation": obligation_id, "action": action, "reason": reason},
        action=perform,
    )


def spending_capacity(user: User) -> dict[str, int]:
    with transaction.atomic():
        _owner_lock(user)
        liquid = financial_summary(user)["liquid_balance"]
        reserved = sum(reserve.reserved_paise for reserve in reserves_for(user))
        return {
            "liquid_balance": liquid,
            "active_reserves": reserved,
            "safe_to_spend": liquid - reserved,
        }


def pay_rent(
    *,
    user: User,
    key: str,
    obligation_id: UUID,
    data: dict[str, Any],
    payment_id: UUID | None = None,
) -> tuple[UUID, bool]:
    """Confirm or supersede a payment; reserve consumption shares the journal transaction."""

    def action() -> UUID:
        original = None
        if payment_id:
            payment = get_object_or_404(
                RentPayment.objects.select_related("event"),
                pk=payment_id,
                obligation_id=obligation_id,
                obligation__user=user,
            )
            original = payment.event
            _reverse(user, original, data["reason"])
        obligation = get_object_or_404(obligations_for(user), pk=obligation_id)
        if obligation.last_action == "skip":
            raise FinancialConflict("Reopen skipped rent before confirming a payment.")
        _amount(data["amount_paise"])
        if data["amount_paise"] > obligation.plan.amount_paise - obligation.paid_paise:
            raise FinancialConflict("Payment exceeds this month's outstanding rent.")
        payer = contact_for(user, data["payer"]) if data.get("payer") else None
        if bool(payer) == bool(data.get("account")):
            raise ValidationError(
                {"payer": "Supply exactly one of payer (friend) or account (owner)."}
            )
        payment_data = {
            "kind": "expense",
            "amount_paise": data["amount_paise"],
            "account": data.get("account"),
            "effective_date": data["effective_date"],
            "title": data.get("title", obligation.plan.title),
            "category": obligation.plan.category_id,
            "merchant": obligation.plan.payee,
            "notes": data.get("notes", ""),
            "payment_method": data.get("payment_method", ""),
            "reason": data.get("reason", ""),
        }
        if (
            payer
            or obligation.plan.shares.filter(contact__isnull=False, amount_paise__gt=0).exists()
        ):
            prior_shares: dict[UUID | None, int] = {}
            for share in BillShare.objects.filter(
                bill__event__rent_payment__obligation=obligation, bill__event__reversal__isnull=True
            ):
                prior_shares[share.contact_id] = (
                    prior_shares.get(share.contact_id, 0) + share.amount_paise
                )
            prior_shares[None] = prior_shares.get(None, 0) + (
                RentPayment.objects.filter(
                    obligation=obligation,
                    event__kind="expense",
                    event__reversal__isnull=True,
                ).aggregate(total=Sum("event__amount_paise"))["total"]
                or 0
            )
            remaining_shares = [
                Share(row.contact_id, row.amount_paise - prior_shares.get(row.contact_id, 0))
                for row in obligation.plan.shares.all()
            ]
            shares = partial_shares(data["amount_paise"], remaining_shares)
            if payer and payer.id not in {row.contact_id for row in shares}:
                shares.append(Share(payer.id, 0))
            event = post_bill(
                user,
                {
                    **payment_data,
                    "payer": payer.id if payer else None,
                    "split_method": "custom",
                    "participants": [
                        {"contact": row.contact_id, "amount_paise": row.amount_paise}
                        for row in shares
                    ],
                },
                supersedes=original,
            )
        else:
            event = _post(
                user,
                payment_data,
                supersedes=original,
            )
        if original and original.kind != event.kind:
            raise ValidationError({"payer": "A correction must preserve the original payer kind."})
        payment = RentPayment.objects.create(obligation=obligation, event=event)
        _assign_claim_reserves(user, obligation)
        protected = _claim_earmarks(user, obligation)
        # Friend-paid cash belonging to other participants is no longer an owner
        # commitment. Only excess unassigned earmarks can be released here.
        current = get_object_or_404(obligations_for(user), pk=obligation.id)
        reserve_rows = list(reserves_for(user).filter(obligation=obligation))
        remaining = (
            max(
                0,
                sum(row.reserved_paise for row in reserve_rows)
                - (current.plan.amount_paise - current.paid_paise + current.friend_payable_paise),
            )
            if payer
            else data["amount_paise"]
        )
        for reserve in reserve_rows:
            assigned = sum(
                amount for (row_id, _), amount in protected.items() if row_id == reserve.id
            )
            used = min(remaining, reserve.reserved_paise - assigned)
            if used:
                ReserveChange.objects.create(
                    reserve=reserve,
                    payment=payment,
                    delta_paise=-used,
                    reason="Release non-owner rent shares" if payer else "Confirmed rent payment",
                )
                remaining -= used
            if not remaining:
                break
        assert_fundable_history(user)
        assert_claim_history(user)
        rebuild_attribution(user=user, trigger_event=event)
        return payment.id

    return _idempotent(
        user=user,
        key=key,
        operation="rent.payment.correct" if payment_id else "rent.payment.create",
        data={"obligation": obligation_id, "payment": payment_id, **data},
        action=action,
    )


def check_rent(user: User) -> dict[str, int]:
    """Read-only reconciliation of active payments, skipped rent and earmarks."""
    with transaction.atomic():
        User.objects.select_for_update().get(pk=user.pk)
        obligations = list(obligations_for(user))
        reserves = list(reserves_for(user))
        reserved_by_obligation: dict[UUID, int] = {}
        for reserve in reserves:
            if reserve.reserved_paise < 0:
                raise FinancialConflict("Negative active rent reserve.")
            reserved_by_obligation[reserve.obligation_id] = (
                reserved_by_obligation.get(reserve.obligation_id, 0) + reserve.reserved_paise
            )
        for obligation in obligations:
            reserved = reserved_by_obligation.get(obligation.id, 0)
            if not 0 <= obligation.paid_paise <= obligation.plan.amount_paise:
                raise FinancialConflict("Rent payments do not reconcile with the obligation.")
            if reserved > (
                obligation.plan.amount_paise
                - obligation.paid_paise
                + obligation.friend_payable_paise
            ):
                raise FinancialConflict("Rent reserves exceed outstanding rent.")
            portions = _claim_earmarks(user, obligation)
            for reserve in (row for row in reserves if row.obligation_id == obligation.id):
                held = sum(
                    amount for (row_id, _), amount in portions.items() if row_id == reserve.id
                )
                if held > reserve.reserved_paise or any(amount < 0 for amount in portions.values()):
                    raise FinancialConflict("Protected rent earmarks do not reconcile.")
            for claim in claims_for(user).filter(source_event__rent_payment__obligation=obligation):
                if (
                    sum(
                        amount for (_, claim_id), amount in portions.items() if claim_id == claim.id
                    )
                    > claim.outstanding_paise
                ):
                    raise FinancialConflict("Protected rent earmarks exceed the friend payable.")
            if obligation.last_action == "skip" and (obligation.paid_paise or reserved):
                raise FinancialConflict("Skipped rent retains an active payment or reserve.")
        return {"obligations": len(obligations), "reserves": len(reserves)}
