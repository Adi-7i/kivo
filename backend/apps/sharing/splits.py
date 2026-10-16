"""Exact paise splits with a stable owner-first, then contact-UUID remainder rule."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class Share:
    contact_id: UUID | None
    amount_paise: int


def participant_order(contact_id: UUID | None) -> str:
    return str(contact_id) if contact_id else ""


def split_bill(total: int, method: str, participants: list[Share]) -> list[Share]:
    if type(total) is not int or total <= 0:
        raise ValueError("Gross amount must be positive integer paise.")
    if not participants or len(participants) > 100:
        raise ValueError("One to 100 participants are required.")
    identities = [share.contact_id for share in participants]
    if len(set(identities)) != len(identities) or None not in identities:
        raise ValueError("Include the owner exactly once; duplicate participants are forbidden.")
    ordered = sorted(participants, key=lambda share: participant_order(share.contact_id))
    if method == "equal":
        base, remainder = divmod(total, len(ordered))
        return [
            Share(share.contact_id, base + (index < remainder))
            for index, share in enumerate(ordered)
        ]
    if method != "custom":
        raise ValueError("Split method must be equal or custom.")
    if any(type(share.amount_paise) is not int or share.amount_paise < 0 for share in ordered):
        raise ValueError("Custom shares must be nonnegative integer paise.")
    if sum(share.amount_paise for share in ordered) != total:
        raise ValueError("Custom shares must sum exactly to the gross amount.")
    return ordered


def partial_shares(amount: int, remaining: list[Share]) -> list[Share]:
    """Allocate a partial rent payment proportionally to still-unpaid shares.

    Largest integer remainders receive spare paise; ties use participant order.
    No participant can receive more than their remaining contractual share.
    """
    total = sum(share.amount_paise for share in remaining)
    if type(amount) is not int or not 0 < amount <= total:
        raise ValueError("Payment must be positive and cannot exceed remaining rent.")
    if any(type(share.amount_paise) is not int or share.amount_paise < 0 for share in remaining):
        raise ValueError("Remaining shares must be nonnegative integer paise.")
    values = [divmod(amount * share.amount_paise, total) for share in remaining]
    spare = amount - sum(base for base, _ in values)
    priority = sorted(
        range(len(remaining)),
        key=lambda index: (-values[index][1], participant_order(remaining[index].contact_id)),
    )
    extras = set(priority[:spare])
    return [
        Share(share.contact_id, values[index][0] + (index in extras))
        for index, share in enumerate(remaining)
    ]
