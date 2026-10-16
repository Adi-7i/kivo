"""Rent scheduling, confirmed payments and separate earmarks."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.funds.services import rebuild_attribution
from apps.ledger.exceptions import FinancialConflict
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
from apps.sharing.models import (
    MetadataChange,
    ObligationChange,
    RentObligation,
    RentPayment,
    RentPlan,
    RentReserve,
    RentShare,
    ReserveChange,
)
from apps.sharing.selectors import obligations_for, reserves_for
from apps.sharing.splits import Share, split_bill
from apps.users.models import User


def validated_shares(user: User, data: dict[str, Any]) -> list[Share]:
    supplied = data.get("participants", [])
    method = data.get("split_method", "custom")
    if supplied and (
        (method == "equal" and any("amount_paise" in row for row in supplied))
        or (method == "custom" and any("amount_paise" not in row for row in supplied))
    ):
        raise ValidationError(
            {"participants": "Equal splits omit amounts; custom splits require every amount."}
        )
    participants = data.get(
        "participants", [{"contact": None, "amount_paise": data["amount_paise"]}]
    )
    try:
        shares = split_bill(
            data["amount_paise"],
            data.get("split_method", "custom"),
            [Share(row.get("contact"), row.get("amount_paise", 0)) for row in participants],
        )
    except ValueError as exc:
        raise ValidationError({"participants": str(exc)}) from exc
    for share in shares:
        if share.contact_id:
            contact_for(user, share.contact_id)
    return shares


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
        if target + reserved_elsewhere > obligation.plan.amount_paise - obligation.paid_paise:
            raise FinancialConflict("Reserves exceed this obligation's unpaid rent.")
        if target != current:
            ReserveChange.objects.create(
                reserve=reserve, delta_paise=target - current, reason=data["reason"]
            )
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
        if obligation.plan.shares.filter(contact__isnull=False, amount_paise__gt=0).exists():
            raise FinancialConflict(
                {
                    "code": "policy_pending",
                    "detail": "Shared-rent financial posting awaits approval of the Phase 5 FIFO policy.",
                }
            )
        event = _post(
            user,
            {
                "kind": "expense",
                "amount_paise": data["amount_paise"],
                "account": data["account"],
                "effective_date": data["effective_date"],
                "title": data.get("title", obligation.plan.title),
                "category": obligation.plan.category_id,
                "merchant": obligation.plan.payee,
                "notes": data.get("notes", ""),
                "payment_method": data.get("payment_method", ""),
                "reason": data.get("reason", ""),
            },
            supersedes=original,
        )
        payment = RentPayment.objects.create(obligation=obligation, event=event)
        remaining = data["amount_paise"]
        for reserve in (
            reserves_for(user).filter(obligation=obligation).order_by("created_at", "id")
        ):
            used = min(remaining, reserve.reserved_paise)
            if used:
                ReserveChange.objects.create(
                    reserve=reserve,
                    payment=payment,
                    delta_paise=-used,
                    reason="Confirmed rent payment",
                )
                remaining -= used
            if not remaining:
                break
        assert_fundable_history(user)
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
            if reserved > obligation.plan.amount_paise - obligation.paid_paise:
                raise FinancialConflict("Rent reserves exceed outstanding rent.")
            if obligation.last_action == "skip" and (obligation.paid_paise or reserved):
                raise FinancialConflict("Skipped rent retains an active payment or reserve.")
        return {"obligations": len(obligations), "reserves": len(reserves)}
