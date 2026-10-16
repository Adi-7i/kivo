"""Authenticated HTTP orchestration for personal contacts and rent."""

from __future__ import annotations

from typing import Any

from django.db.models import Prefetch, Q, QuerySet
from drf_spectacular.utils import extend_schema
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ledger.selectors import events_for
from apps.ledger.serializers import EventSerializer, ReversalSerializer
from apps.ledger.services import reverse_event
from apps.ledger.views import IDEMPOTENCY
from apps.sharing import contacts, rent
from apps.sharing.models import Contact, RentObligation, RentPayment, RentPlan, RentReserve
from apps.sharing.permissions import IsRentPaymentOwner
from apps.sharing.selectors import contacts_for, obligations_for, reserves_for
from apps.sharing.serializers import (
    ContactSerializer,
    ContactWriteSerializer,
    GenerateSerializer,
    ObligationChangeSerializer,
    ObligationHistorySerializer,
    ObligationSerializer,
    PlanActiveSerializer,
    RentPaymentCorrectSerializer,
    RentPaymentCreateSerializer,
    RentPaymentSerializer,
    RentPlanCreateSerializer,
    RentPlanSerializer,
    ReserveAdjustSerializer,
    ReserveChangeSerializer,
    ReserveCreateSerializer,
    ReserveSerializer,
    SpendingCapacitySerializer,
)
from apps.users.permissions import IsOwner


class OwnedReadViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_value_converter = "uuid"
    permission_classes = [IsAuthenticated, IsOwner]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def write_response(self, result: tuple[Any, bool]) -> Response:
        resource_id, replayed = result
        return Response(
            self.get_serializer(self.get_queryset().get(pk=resource_id)).data,
            status=200 if replayed else 201,
        )


class ContactViewSet(OwnedReadViewSet):
    serializer_class = ContactSerializer

    def get_queryset(self) -> QuerySet[Contact]:
        return (
            Contact.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else contacts_for(self.request.user)
        )

    @extend_schema(
        request=ContactWriteSerializer,
        responses={201: ContactSerializer, 200: ContactSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        serializer = ContactWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            contacts.save_contact(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                data=serializer.validated_data,
            )
        )

    @extend_schema(
        request=ContactWriteSerializer,
        responses={201: ContactSerializer, 200: ContactSerializer},
        parameters=[IDEMPOTENCY],
    )
    def partial_update(self, request: Request, **kwargs: Any) -> Response:
        contact = self.get_object()
        serializer = ContactWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            contacts.save_contact(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                data=serializer.validated_data,
                contact_id=contact.id,
            )
        )

    @extend_schema(responses=EventSerializer(many=True))
    @action(detail=True, methods=["get"])
    def history(self, request: Request, **kwargs: Any) -> Response:
        contact = self.get_object()
        rows = (
            events_for(request.user)
            .filter(Q(contact=contact) | Q(postings__claim__contact=contact))
            .distinct()
            .order_by("-effective_date", "-id")
        )
        return self.get_paginated_response(
            EventSerializer(self.paginate_queryset(rows), many=True).data
        )


class RentPlanViewSet(OwnedReadViewSet):
    serializer_class = RentPlanSerializer

    def get_queryset(self) -> QuerySet[RentPlan]:
        return (
            RentPlan.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else RentPlan.objects.filter(user=self.request.user).prefetch_related("shares")
        )

    @extend_schema(
        request=RentPlanCreateSerializer,
        responses={201: RentPlanSerializer, 200: RentPlanSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        serializer = RentPlanCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.create_plan(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                data=serializer.validated_data,
            )
        )

    @extend_schema(
        request=PlanActiveSerializer,
        responses={201: RentPlanSerializer, 200: RentPlanSerializer},
        parameters=[IDEMPOTENCY],
    )
    def partial_update(self, request: Request, **kwargs: Any) -> Response:
        plan = self.get_object()
        serializer = PlanActiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.set_plan_active(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                plan_id=plan.id,
                active=serializer.validated_data["active"],
            )
        )

    @extend_schema(
        request=GenerateSerializer,
        responses={201: RentPlanSerializer, 200: RentPlanSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def generate(self, request: Request, **kwargs: Any) -> Response:
        plan = self.get_object()
        serializer = GenerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.generate_obligations(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                plan_id=plan.id,
                through=serializer.validated_data["through"],
            )
        )

    @extend_schema(responses=ObligationSerializer(many=True))
    @action(detail=True, methods=["get"])
    def obligations(self, request: Request, **kwargs: Any) -> Response:
        rows = obligations_for(request.user).filter(plan=self.get_object())
        return self.get_paginated_response(
            ObligationSerializer(self.paginate_queryset(rows), many=True).data
        )


class RentObligationViewSet(OwnedReadViewSet):
    serializer_class = ObligationSerializer

    def get_queryset(self) -> QuerySet[RentObligation]:
        return (
            RentObligation.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else obligations_for(self.request.user)
        )

    @extend_schema(
        request=ObligationChangeSerializer,
        responses={201: ObligationSerializer, 200: ObligationSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"], url_path="change-status")
    def change_status(self, request: Request, **kwargs: Any) -> Response:
        obligation = self.get_object()
        serializer = ObligationChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.change_obligation(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                obligation_id=obligation.id,
                **serializer.validated_data,
            )
        )

    @extend_schema(methods=["GET"], responses=RentPaymentSerializer(many=True))
    @extend_schema(
        methods=["POST"],
        request=RentPaymentCreateSerializer,
        responses={201: RentPaymentSerializer, 200: RentPaymentSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["get", "post"])
    def payments(self, request: Request, **kwargs: Any) -> Response:
        obligation = self.get_object()
        if request.method == "GET":
            rows = _payments_for(request).filter(obligation=obligation).order_by("created_at", "id")
            return self.get_paginated_response(
                RentPaymentSerializer(self.paginate_queryset(rows), many=True).data
            )
        serializer = RentPaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resource_id, replayed = rent.pay_rent(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            obligation_id=obligation.id,
            data=serializer.validated_data,
        )
        return Response(
            RentPaymentSerializer(_payments_for(request).get(pk=resource_id)).data,
            status=200 if replayed else 201,
        )

    @extend_schema(responses=ObligationHistorySerializer(many=True))
    @action(detail=True, methods=["get"])
    def history(self, request: Request, **kwargs: Any) -> Response:
        rows = self.get_object().changes.all()
        return self.get_paginated_response(
            ObligationHistorySerializer(self.paginate_queryset(rows), many=True).data
        )


def _payments_for(request: Request) -> QuerySet[RentPayment]:
    return (
        RentPayment.objects.filter(obligation__user=request.user)
        .select_related("obligation")
        .prefetch_related(Prefetch("event", queryset=events_for(request.user)))
        .order_by("-created_at", "-id")
    )


class RentPaymentViewSet(OwnedReadViewSet):
    serializer_class = RentPaymentSerializer
    permission_classes = [IsAuthenticated, IsRentPaymentOwner]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self) -> QuerySet[RentPayment]:
        return (
            RentPayment.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else _payments_for(self.request)
        )

    @extend_schema(
        request=RentPaymentCorrectSerializer,
        responses={201: RentPaymentSerializer, 200: RentPaymentSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def correct(self, request: Request, **kwargs: Any) -> Response:
        payment = self.get_object()
        serializer = RentPaymentCorrectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.pay_rent(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                obligation_id=payment.obligation_id,
                payment_id=payment.id,
                data=serializer.validated_data,
            )
        )

    @extend_schema(
        request=ReversalSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def reverse(self, request: Request, **kwargs: Any) -> Response:
        payment = self.get_object()
        serializer = ReversalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        event_id, replayed = reverse_event(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            event_id=payment.event.public_id,
            reason=serializer.validated_data["reason"],
        )
        return Response(
            EventSerializer(events_for(request.user).get(public_id=event_id)).data,
            status=200 if replayed else 201,
        )


class RentReserveViewSet(OwnedReadViewSet):
    serializer_class = ReserveSerializer

    def get_queryset(self) -> QuerySet[RentReserve]:
        return (
            RentReserve.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else reserves_for(self.request.user)
        )

    @extend_schema(
        request=ReserveCreateSerializer,
        responses={201: ReserveSerializer, 200: ReserveSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        serializer = ReserveCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.adjust_reserve(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                data=serializer.validated_data,
            )
        )

    @extend_schema(
        request=ReserveAdjustSerializer,
        responses={201: ReserveSerializer, 200: ReserveSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def adjust(self, request: Request, **kwargs: Any) -> Response:
        reserve = self.get_object()
        serializer = ReserveAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self.write_response(
            rent.adjust_reserve(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                data=serializer.validated_data,
                reserve_id=reserve.id,
            )
        )

    @extend_schema(responses=ReserveChangeSerializer(many=True))
    @action(detail=True, methods=["get"])
    def history(self, request: Request, **kwargs: Any) -> Response:
        rows = self.get_object().changes.select_related("payment__event__reversal")
        return self.get_paginated_response(
            ReserveChangeSerializer(self.paginate_queryset(rows), many=True).data
        )


class SpendingCapacityView(APIView):
    @extend_schema(responses=SpendingCapacitySerializer)
    def get(self, request: Request) -> Response:
        return Response(SpendingCapacitySerializer(rent.spending_capacity(request.user)).data)
