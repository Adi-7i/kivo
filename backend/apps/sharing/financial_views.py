"""HTTP orchestration for loans, shared bills and explicit claim settlements."""

from __future__ import annotations

from typing import Any

from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.ledger.models import Event
from apps.ledger.selectors import events_for
from apps.ledger.serializers import EventSerializer, ReversalSerializer
from apps.ledger.services import reverse_event
from apps.ledger.views import IDEMPOTENCY
from apps.sharing.finance import write_financial
from apps.sharing.models import Claim, SharedBill
from apps.sharing.selectors import claims_for
from apps.sharing.serializers import (
    BillCorrectSerializer,
    BillSerializer,
    BillWriteSerializer,
    ClaimSerializer,
    LoanCorrectSerializer,
    LoanWriteSerializer,
    SettlementCorrectSerializer,
    SettlementWriteSerializer,
)
from apps.sharing.views import OwnedReadViewSet


class FinancialEventViewSet(OwnedReadViewSet):
    serializer_class = EventSerializer
    lookup_field = "public_id"
    http_method_names = ["get", "post", "head", "options"]
    operation = ""
    kinds: tuple[str, ...] = ()

    def get_queryset(self) -> QuerySet[Event]:
        return (
            Event.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else events_for(self.request.user).filter(kind__in=self.kinds)
        )

    def write(self, request: Request, serializer_type: type, event_id: Any = None) -> Response:
        serializer = serializer_type(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource_id, replayed = write_financial(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            operation=self.operation,
            data=serializer.validated_data,
            event_id=event_id,
        )
        return Response(
            EventSerializer(events_for(request.user).get(public_id=resource_id)).data,
            status=200 if replayed else 201,
        )

    @extend_schema(
        request=ReversalSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def reverse(self, request: Request, **kwargs: Any) -> Response:
        event = self.get_object()
        serializer = ReversalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource_id, replayed = reverse_event(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            event_id=event.public_id,
            reason=serializer.validated_data["reason"],
        )
        return Response(
            EventSerializer(events_for(request.user).get(public_id=resource_id)).data,
            status=200 if replayed else 201,
        )


class LoanViewSet(FinancialEventViewSet):
    operation = "loan"
    kinds = ("lend", "borrow")

    @extend_schema(
        request=LoanWriteSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        return self.write(request, LoanWriteSerializer)

    @extend_schema(
        request=LoanCorrectSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def correct(self, request: Request, **kwargs: Any) -> Response:
        return self.write(request, LoanCorrectSerializer, self.get_object().public_id)


class SettlementViewSet(FinancialEventViewSet):
    operation = "settlement"
    kinds = ("repay_in", "repay_out")

    @extend_schema(
        request=SettlementWriteSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        return self.write(request, SettlementWriteSerializer)

    @extend_schema(
        request=SettlementCorrectSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def correct(self, request: Request, **kwargs: Any) -> Response:
        return self.write(request, SettlementCorrectSerializer, self.get_object().public_id)


class ClaimViewSet(OwnedReadViewSet):
    serializer_class = ClaimSerializer
    http_method_names = ["get", "head", "options"]

    def get_queryset(self) -> QuerySet[Claim]:
        return (
            Claim.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else claims_for(self.request.user)
        )

    @extend_schema(responses=EventSerializer(many=True))
    @action(detail=True, methods=["get"])
    def history(self, request: Request, **kwargs: Any) -> Response:
        rows = (
            events_for(request.user)
            .filter(postings__claim=self.get_object())
            .distinct()
            .order_by("effective_date", "id")
        )
        return self.get_paginated_response(
            EventSerializer(self.paginate_queryset(rows), many=True).data
        )


class SharedBillViewSet(OwnedReadViewSet):
    serializer_class = BillSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self) -> QuerySet[SharedBill]:
        if getattr(self, "swagger_fake_view", False):
            return SharedBill.objects.none()
        return SharedBill.objects.filter(user=self.request.user).prefetch_related(
            "shares", Prefetch("event", queryset=events_for(self.request.user))
        )

    def write(self, request: Request, serializer_type: type, event_id: Any = None) -> Response:
        serializer = serializer_type(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource_id, replayed = write_financial(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            operation="bill",
            data=serializer.validated_data,
            event_id=event_id,
        )
        bill = get_object_or_404(self.get_queryset(), event__public_id=resource_id)
        return Response(BillSerializer(bill).data, status=200 if replayed else 201)

    @extend_schema(
        request=BillWriteSerializer,
        responses={201: BillSerializer, 200: BillSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        return self.write(request, BillWriteSerializer)

    @extend_schema(
        request=BillCorrectSerializer,
        responses={201: BillSerializer, 200: BillSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def correct(self, request: Request, **kwargs: Any) -> Response:
        return self.write(request, BillCorrectSerializer, self.get_object().event.public_id)

    @extend_schema(
        request=ReversalSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def reverse(self, request: Request, **kwargs: Any) -> Response:
        bill = self.get_object()
        serializer = ReversalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource_id, replayed = reverse_event(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            event_id=bill.event.public_id,
            reason=serializer.validated_data["reason"],
        )
        return Response(
            EventSerializer(events_for(request.user).get(public_id=resource_id)).data,
            status=200 if replayed else 201,
        )
