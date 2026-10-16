"""Pure calendar rules; obligations do not post expenses or cash movements."""

from __future__ import annotations

from calendar import monthrange
from datetime import date


def month_start(value: date) -> date:
    return value.replace(day=1)


def next_month(value: date) -> date:
    return date(value.year + (value.month == 12), value.month % 12 + 1, 1)


def monthly_due_date(month: date, due_day: int | None) -> date:
    """None means last day; days 29–31 clamp to the actual month's last day."""
    if due_day is not None and (type(due_day) is not int or not 1 <= due_day <= 31):
        raise ValueError("Due day must be 1–31, or null for the last day.")
    last = monthrange(month.year, month.month)[1]
    return month.replace(day=min(due_day or last, last))


def monthly_schedule(start: date, through: date, due_day: int | None) -> list[tuple[date, date]]:
    """Include due dates on/after start; never invent a prorated first month."""
    result = []
    current = month_start(start)
    end = month_start(through)
    while current <= end:
        due = monthly_due_date(current, due_day)
        if start <= due <= through:
            result.append((current, due))
        if current == end:
            break
        current = next_month(current)
    return result
