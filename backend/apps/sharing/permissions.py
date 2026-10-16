"""Object ownership for payment records owned through a rent obligation."""

from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.sharing.models import RentPayment


class IsRentPaymentOwner(BasePermission):
    def has_object_permission(self, request: Request, view: APIView, obj: Any) -> bool:
        return isinstance(obj, RentPayment) and obj.obligation.user_id == request.user.pk
