"""Exact INR boundary conversions; no binary floating point."""

from __future__ import annotations

import re

from rest_framework import serializers

MAX_PAISE = 9_000_000_000_000_000


def format_money(paise: int) -> str:
    sign = "-" if paise < 0 else ""
    rupees, cents = divmod(abs(paise), 100)
    return f"{sign}{rupees}.{cents:02d}"


class MoneyField(serializers.CharField):
    """Require a decimal string with two places and return integer paise internally."""

    def get_default(self) -> int:
        return self.to_internal_value(super().get_default())

    def to_internal_value(self, data: object) -> int:
        if not isinstance(data, str) or not re.fullmatch(r"(0|[1-9][0-9]{0,13})\.[0-9]{2}", data):
            raise serializers.ValidationError('Use an exact INR string, for example "120.50".')
        rupees, cents = data.split(".")
        paise = int(rupees) * 100 + int(cents)
        if paise > MAX_PAISE:
            raise serializers.ValidationError("Amount exceeds the supported limit.")
        return paise

    def to_representation(self, value: int) -> str:
        return format_money(value)
