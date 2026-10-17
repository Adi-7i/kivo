"""Pure tests of the actual approved v2 engine, not mocked database behavior."""

from __future__ import annotations

from dataclasses import replace
from datetime import date
from uuid import UUID

import pytest
from apps.funds.engine_v2 import Entry, Portion, allocate

CASH, BANK, CLAIM, SECOND = (UUID(int=value) for value in range(1, 5))


def entry(event_id: int, kind: str, amount: int, **kwargs: object) -> Entry:
    return replace(Entry(event_id, kind, amount, date(2025, 10, 16), event_id, CASH), **kwargs)


def test_partial_multibatch_recovery_retains_source_rank_and_capacity() -> None:
    rows = [
        entry(1, "receipt", 100000),
        entry(2, "receipt", 50000),
        entry(3, "lend", 120000, claim_id=CLAIM),
        entry(4, "repay_in", 110000, claim_id=CLAIM, account_id=BANK),
    ]
    result = allocate(rows)
    assert result.claim_positions == {(CLAIM, 2): 10000}
    assert result.positions == {(CASH, 2): 30000, (BANK, 1): 100000, (BANK, 2): 10000}
    assert [(c.allocated_paise, c.remaining_paise, c.exhausted_on) for c in result.capacities] == [
        (0, 100000, None),
        (0, 50000, None),
    ]
    spent = allocate([*rows, entry(5, "expense", 105000, account_id=BANK)])
    assert [(m.source_id, m.amount_paise) for m in spent.movements if m.event_id == 5] == [
        (1, 100000),
        (2, 5000),
    ]
    assert not spent.gaps


def test_shared_gross_cash_separates_expense_from_two_recoverable_claims() -> None:
    result = allocate(
        [
            entry(1, "receipt", 600000),
            entry(
                2,
                "shared_paid",
                600000,
                portions=(Portion(None, 200000), Portion(CLAIM, 200000), Portion(SECOND, 200000)),
            ),
        ]
    )
    assert result.positions == {}
    assert result.claim_positions == {(CLAIM, 1): 200000, (SECOND, 1): 200000}
    assert result.capacities[0].allocated_paise == 200000
    assert result.capacities[0].remaining_paise == 400000
    assert result.capacities[0].exhausted_on is None
    assert sum(m.amount_paise for m in result.movements) == 600000


def test_borrowing_principal_and_friend_paid_expense_have_distinct_attribution() -> None:
    result = allocate(
        [
            entry(1, "borrow", 50000),
            entry(2, "repay_out", 20000, claim_id=CLAIM),
            entry(3, "shared_due", 90000, account_id=None),
            entry(4, "repay_out", 30000, claim_id=SECOND, expense_event_id=3),
        ]
    )
    assert [(m.kind, m.amount_paise, m.expense_event_id) for m in result.movements] == [
        ("principal", 20000, None),
        ("expense", 30000, 3),
    ]
    assert result.capacities[0].remaining_paise == 0
    assert result.capacities[0].exhausted_on == date(2025, 10, 16)


def test_recovery_cannot_invent_missing_lineage_or_cross_claims() -> None:
    result = allocate(
        [
            entry(1, "receipt", 10000),
            entry(2, "lend", 10000, claim_id=CLAIM),
            entry(3, "repay_in", 1, claim_id=SECOND),
        ]
    )
    assert result.positions == {}
    assert result.gaps[0].code == "recovery_without_lineage"
    assert result.capacities[0].exhausted_on is None


def test_backdated_replay_and_same_day_order_are_deterministic() -> None:
    rows = [
        entry(1, "receipt", 10000),
        entry(2, "receipt", 10000),
        entry(3, "lend", 15000, claim_id=CLAIM),
        entry(4, "repay_in", 10000, claim_id=CLAIM),
    ]
    assert allocate(rows) == allocate(list(reversed(rows)))
    backdated = replace(rows[1], effective_date=date(2025, 10, 15))
    result = allocate([rows[0], backdated, *rows[2:]])
    assert result.claim_positions == {(CLAIM, 1): 5000}
    assert next(m for m in result.movements if m.kind == "recover").source_id == 2


def test_v2_refund_reuses_v1_reverse_slice_policy() -> None:
    result = allocate(
        [
            entry(1, "receipt", 10000),
            entry(2, "receipt", 5000),
            entry(3, "expense", 12000),
            entry(4, "refund", 3000, original_expense_id=3),
        ]
    )
    assert [(c.allocated_paise, c.remaining_paise) for c in result.capacities] == [
        (9000, 1000),
        (0, 5000),
    ]


def test_v2_rejects_malformed_internal_operations() -> None:
    with pytest.raises(ValueError, match="conserve"):
        allocate([entry(1, "shared_paid", 100, portions=(Portion(None, 99),))])
    with pytest.raises(ValueError, match="specific claim"):
        allocate([entry(1, "repay_in", 100)])
