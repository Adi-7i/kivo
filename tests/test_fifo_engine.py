"""Behavioral tests of the actual pure FIFO engine used by PostgreSQL posting services."""

from __future__ import annotations

from datetime import date
from uuid import UUID

import pytest
from apps.funds.engine import Entry, allocate

CASH = UUID(int=1)
BANK = UUID(int=2)


def entry(
    event_id: int,
    kind: str,
    amount: int,
    day: int = 16,
    *,
    account: UUID = CASH,
    destination: UUID | None = None,
    original: int | None = None,
    sequence: int | None = None,
) -> Entry:
    return Entry(
        event_id,
        kind,
        amount,
        date(2025, 10, day),
        sequence or event_id,
        account,
        destination,
        original,
    )


@pytest.mark.unit
def test_fifo_required_scenario_a() -> None:
    result = allocate(
        [entry(1, "receipt", 100000), entry(2, "receipt", 50000), entry(3, "expense", 120000)]
    )
    assert [(row.allocated_paise, row.remaining_paise) for row in result.capacities] == [
        (100000, 0),
        (20000, 30000),
    ]
    assert not result.gaps


@pytest.mark.unit
def test_fifo_required_scenario_b_inclusive_calendar_days() -> None:
    result = allocate(
        [
            entry(1, "receipt", 100000),
            entry(2, "expense", 20000, 17),
            entry(3, "expense", 80000, 21),
        ]
    )
    capacity = result.capacities[0]
    assert capacity.remaining_paise == 0
    assert capacity.exhausted_on == date(2025, 10, 21)
    assert (capacity.exhausted_on - date(2025, 10, 16)).days + 1 == 6


@pytest.mark.unit
def test_fifo_required_scenario_c_transfer_keeps_original_source() -> None:
    result = allocate(
        [
            entry(1, "receipt", 100000, account=BANK),
            entry(2, "transfer", 100000, account=BANK, destination=CASH),
            entry(3, "expense", 25000),
        ]
    )
    assert len(result.capacities) == 1
    assert result.capacities[0].allocated_paise == 25000
    assert result.positions == {(CASH, 1): 75000}
    assert [(row.kind, row.source_id, row.amount_paise) for row in result.movements] == [
        ("transfer", 1, 100000),
        ("expense", 1, 25000),
    ]


@pytest.mark.unit
def test_fifo_orders_effective_dates_and_stable_same_day_sequence() -> None:
    inputs = [
        entry(10, "receipt", 10000, 15, sequence=1),
        entry(2, "receipt", 5000, 16),
        entry(3, "expense", 12000, 16),
    ]
    assert allocate(inputs) == allocate(list(reversed(inputs)))
    assert [row.source_id for row in allocate(inputs).movements] == [10, 2]


@pytest.mark.unit
def test_fifo_accounts_cannot_implicitly_spend_another_accounts_funds() -> None:
    result = allocate([entry(1, "receipt", 10000, account=BANK), entry(2, "expense", 1000)])
    assert result.gaps[0].amount_paise == 1000
    assert result.capacities[0].remaining_paise == 10000
    assert result.capacities[0].exhausted_on is None


@pytest.mark.unit
def test_fifo_refund_restores_original_lineage_and_clears_exhaustion() -> None:
    entries = [
        entry(1, "receipt", 100000),
        entry(2, "receipt", 50000),
        entry(3, "expense", 120000),
        entry(4, "refund", 30000, 17, original=3),
    ]
    result = allocate(entries)
    assert [(row.allocated_paise, row.remaining_paise) for row in result.capacities] == [
        (90000, 10000),
        (0, 50000),
    ]
    assert all(row.exhausted_on is None for row in result.capacities)
    again = allocate([*entries, entry(5, "expense", 60000, 21)])
    assert all(
        row.remaining_paise == 0 and row.exhausted_on == date(2025, 10, 21)
        for row in again.capacities
    )


@pytest.mark.unit
def test_fifo_partial_transfers_and_refund_into_different_account() -> None:
    result = allocate(
        [
            entry(1, "opening", 10000),
            entry(2, "transfer", 5000, destination=BANK),
            entry(3, "expense", 5000, account=BANK),
            entry(4, "refund", 2000, original=3),
        ]
    )
    assert result.positions == {(CASH, 1): 7000}
    assert result.capacities[0].allocated_paise == 3000


@pytest.mark.unit
def test_fifo_does_not_invent_source_capacity_for_unfunded_expenses_or_excess_refunds() -> None:
    result = allocate([entry(1, "expense", 1000)])
    assert result.capacities == [] and result.positions == {}
    assert result.gaps[0].amount_paise == 1000
    result = allocate(
        [
            entry(1, "receipt", 10000),
            entry(2, "expense", 5000),
            entry(3, "refund", 5001, original=2),
        ]
    )
    assert result.gaps[0].amount_paise == 1
    assert result.capacities[0].remaining_paise == 10000
    assert result.capacities[0].exhausted_on is None


@pytest.mark.unit
@pytest.mark.parametrize("amount", [0, -1, True, 1.5])
def test_fifo_rejects_invalid_internal_amounts(amount: int) -> None:
    with pytest.raises(ValueError, match="positive integer"):
        allocate([entry(1, "receipt", amount)])


@pytest.mark.unit
def test_fifo_rejects_duplicate_input_and_unapproved_future_business_types() -> None:
    receipt = entry(1, "receipt", 10000)
    with pytest.raises(ValueError, match="Duplicate"):
        allocate([receipt, receipt])
    with pytest.raises(ValueError, match="Unsupported"):
        allocate([entry(1, "loan", 10000)])
