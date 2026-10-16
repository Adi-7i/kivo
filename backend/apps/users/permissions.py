"""Permission classes for user authorization and object ownership."""

from __future__ import annotations

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


class IsOwner(BasePermission):
    """Object-level permission allowing only the owner to access or modify it.

    Assumes the model instance has a 'user' attribute referencing the owner.
    """

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        """Verify the requesting user owns the target object."""
        if not (request.user and request.user.is_authenticated):
            return False
        return getattr(obj, "user", None) == request.user


class IsSelf(BasePermission):
    """Permission allowing only the authenticated user to access their own User instance."""

    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        """Verify the requesting user is the target user instance."""
        if not (request.user and request.user.is_authenticated):
            return False
        return obj == request.user
