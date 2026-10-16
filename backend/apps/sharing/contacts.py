"""Atomic, auditable contact metadata operations."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError

from apps.ledger.services import _idempotent
from apps.sharing.models import Contact, MetadataChange
from apps.users.models import User

CONTACT_FIELDS = ("display_name", "notes", "is_roommate", "archived")


def contact_for(user: User, contact_id: UUID, *, active: bool = True) -> Contact:
    contact = get_object_or_404(Contact, user=user, pk=contact_id)
    if active and contact.archived:
        raise ValidationError({"contact": "Archived contacts cannot be used for new obligations."})
    return contact


def save_contact(
    *, user: User, key: str, data: dict[str, Any], contact_id: UUID | None = None
) -> tuple[UUID, bool]:
    def action() -> UUID:
        contact = contact_for(user, contact_id, active=False) if contact_id else Contact(user=user)
        before = {name: getattr(contact, name) for name in CONTACT_FIELDS} if contact_id else {}
        for name in CONTACT_FIELDS:
            if name in data:
                setattr(contact, name, data[name])
        contact.save()
        MetadataChange.objects.create(
            user=user,
            resource_id=contact.id,
            resource_type="contact",
            before=before,
            after={name: getattr(contact, name) for name in CONTACT_FIELDS},
        )
        return contact.id

    return _idempotent(
        user=user,
        key=key,
        operation="contact.update" if contact_id else "contact.create",
        data={"contact": contact_id, **data},
        action=action,
    )
