"""Actual recurring-rent calendar calculation, including leap years."""

from datetime import date

import pytest
from apps.sharing.calendar import monthly_due_date, monthly_schedule, next_month


@pytest.mark.unit
@pytest.mark.parametrize(
    ("month", "day", "expected"),
    [
        (date(2024, 2, 1), None, date(2024, 2, 29)),
        (date(2025, 2, 1), None, date(2025, 2, 28)),
        (date(2025, 2, 1), 31, date(2025, 2, 28)),
        (date(2024, 2, 1), 30, date(2024, 2, 29)),
        (date(2025, 4, 1), 31, date(2025, 4, 30)),
        (date(2025, 1, 1), 5, date(2025, 1, 5)),
    ],
)
def test_monthly_due_date(month: date, day: int | None, expected: date) -> None:
    assert monthly_due_date(month, day) == expected


@pytest.mark.unit
def test_schedule_is_deterministic_and_does_not_prorate_or_generate_before_start() -> None:
    assert monthly_schedule(date(2024, 1, 16), date(2024, 3, 31), None) == [
        (date(2024, 1, 1), date(2024, 1, 31)),
        (date(2024, 2, 1), date(2024, 2, 29)),
        (date(2024, 3, 1), date(2024, 3, 31)),
    ]
    assert monthly_schedule(date(2024, 1, 16), date(2024, 3, 4), 5) == [
        (date(2024, 2, 1), date(2024, 2, 5))
    ]
    assert monthly_schedule(date(2025, 1, 1), date(2024, 12, 31), 1) == []
    assert next_month(date(2024, 12, 31)) == date(2025, 1, 1)


@pytest.mark.unit
@pytest.mark.parametrize("day", [0, 32, -1, True])
def test_invalid_due_day_rejected(day: int) -> None:
    with pytest.raises(ValueError):
        monthly_due_date(date(2024, 2, 1), day)
