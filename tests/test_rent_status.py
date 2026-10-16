"""Rent state presentation with an explicit deterministic clock."""

from datetime import date
from types import SimpleNamespace
from typing import Any

import pytest
from apps.sharing.serializers import ObligationSerializer


@pytest.mark.unit
def test_all_required_rent_states_and_partial_overdue_flag(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("apps.sharing.serializers.timezone.localdate", lambda: date(2025, 10, 16))
    serializer = ObligationSerializer()
    cases = [
        (date(2025, 10, 17), 0, None, "upcoming", False),
        (date(2025, 10, 16), 0, None, "due", False),
        (date(2025, 10, 15), 0, None, "overdue", True),
        (date(2025, 10, 15), 5000, None, "partial", True),
        (date(2025, 10, 15), 10000, None, "paid", False),
        (date(2025, 10, 15), 0, "skip", "skipped", False),
    ]
    for due, paid, action, status, overdue in cases:
        obligation: Any = SimpleNamespace(
            due_date=due,
            paid_paise=paid,
            last_action=action,
            plan=SimpleNamespace(amount_paise=10000),
        )
        assert serializer.get_status(obligation) == status
        assert serializer.get_overdue(obligation) is overdue
