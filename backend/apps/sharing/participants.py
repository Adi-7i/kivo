"""Shared owned-participant validation for bills and rent configuration."""

from __future__ import annotations

from typing import Any

from rest_framework.exceptions import NotFound, ValidationError

from apps.sharing.models import Contact
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
            method,
            [Share(row.get("contact"), row.get("amount_paise", 0)) for row in participants],
        )
    except ValueError as exc:
        raise ValidationError({"participants": str(exc)}) from exc
    requested = {share.contact_id for share in shares if share.contact_id}
    contacts = dict(
        Contact.objects.filter(user=user, pk__in=requested).values_list("id", "archived")
    )
    if requested != contacts.keys():
        raise NotFound("Contact not found.")
    if any(contacts.values()):
        raise ValidationError({"contact": "Archived contacts cannot receive new claims."})
    return shares
