from uuid import UUID

import pytest
from apps.sharing.splits import Share, partial_shares, split_bill


@pytest.mark.unit
def test_equal_split_conserves_every_paisa_and_has_stable_remainders() -> None:
    inputs = [Share(UUID(int=2), 0), Share(None, 0), Share(UUID(int=1), 0)]
    expected = [Share(None, 334), Share(UUID(int=1), 334), Share(UUID(int=2), 333)]
    assert split_bill(1001, "equal", inputs) == expected
    assert split_bill(1001, "equal", list(reversed(inputs))) == expected
    assert split_bill(600000, "equal", inputs) == [
        Share(row.contact_id, 200000) for row in expected
    ]


@pytest.mark.unit
@pytest.mark.parametrize(
    "participants",
    [
        [],
        [Share(UUID(int=1), 100)],
        [Share(None, 50), Share(None, 50)],
        [Share(None, 99)],
        [Share(None, -1), Share(UUID(int=1), 101)],
        [Share(None, True)],
    ],
)
def test_invalid_custom_splits_rejected(participants: list[Share]) -> None:
    with pytest.raises(ValueError):
        split_bill(100, "custom", participants)


@pytest.mark.unit
def test_custom_split_and_partial_payments_preserve_exact_shares() -> None:
    shares = split_bill(1001, "custom", [Share(None, 334), Share(UUID(int=1), 667)])
    for paid in range(1, 1002):
        portion = partial_shares(paid, shares)
        assert sum(row.amount_paise for row in portion) == paid
        assert all(
            0 <= part.amount_paise <= original.amount_paise
            for part, original in zip(portion, shares, strict=True)
        )
    first = partial_shares(333, shares)
    remaining = [
        Share(row.contact_id, row.amount_paise - used.amount_paise)
        for row, used in zip(shares, first, strict=True)
    ]
    assert partial_shares(668, remaining) == remaining
    with pytest.raises(ValueError):
        partial_shares(1002, shares)
