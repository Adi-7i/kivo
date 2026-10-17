"""Thin authenticated HTTP orchestration for the financial foundation."""

from __future__ import annotations

from typing import Any

from django.db.models import QuerySet
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.ledger import services
from apps.ledger.history import HistoryFilterBackend, HistoryQuerySerializer
from apps.ledger.models import Account, Category, Event
from apps.ledger.selectors import accounts_for, events_for, financial_summary
from apps.ledger.serializers import (
    AccountCreateSerializer,
    AccountSerializer,
    AccountUpdateSerializer,
    CategorySerializer,
    CategoryWriteSerializer,
    CorrectionSerializer,
    EventCreateSerializer,
    EventSerializer,
    ReversalSerializer,
    SummarySerializer,
)

IDEMPOTENCY = OpenApiParameter(
    name="Idempotency-Key",
    type=str,
    location=OpenApiParameter.HEADER,
    required=True,
    description="Owner-scoped durable retry key, 1–128 characters. Conflicting reuse returns 409.",
)


class AccountViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_value_converter = "uuid"
    serializer_class = AccountSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[Account]:
        if getattr(self, "swagger_fake_view", False):
            return Account.objects.none()
        return accounts_for(self.request.user)

    @extend_schema(
        request=AccountCreateSerializer,
        responses={201: AccountSerializer, 200: AccountSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        serializer = AccountCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account_id, replayed = services.create_account(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            data=serializer.validated_data,
        )
        return Response(
            AccountSerializer(self.get_queryset().get(pk=account_id)).data,
            status=200 if replayed else 201,
        )

    @extend_schema(request=AccountUpdateSerializer, responses=AccountSerializer)
    def partial_update(self, request: Request, **kwargs: Any) -> Response:
        account = self.get_object()
        serializer = AccountUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        services.update_account(
            user=request.user, account_id=account.id, data=serializer.validated_data
        )
        return Response(AccountSerializer(self.get_queryset().get(pk=account.id)).data)

    @extend_schema(responses=SummarySerializer)
    @action(detail=False, methods=["get"], pagination_class=None)
    def summary(self, request: Request) -> Response:
        return Response(SummarySerializer(financial_summary(request.user)).data)


class CategoryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_value_converter = "uuid"
    serializer_class = CategorySerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[Category]:
        if getattr(self, "swagger_fake_view", False):
            return Category.objects.none()
        return Category.objects.filter(user=self.request.user)

    @extend_schema(request=CategoryWriteSerializer, responses={201: CategorySerializer})
    def create(self, request: Request) -> Response:
        serializer = CategoryWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        category = services.save_category(user=request.user, data=serializer.validated_data)
        return Response(CategorySerializer(category).data, status=201)

    @extend_schema(request=CategoryWriteSerializer, responses=CategorySerializer)
    def partial_update(self, request: Request, **kwargs: Any) -> Response:
        category = self.get_object()
        serializer = CategoryWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = services.save_category(
            user=request.user, category_id=category.id, data=serializer.validated_data
        )
        return Response(CategorySerializer(updated).data)

    @extend_schema(request=None, responses=CategorySerializer(many=True))
    @action(detail=False, methods=["post"], pagination_class=None)
    def defaults(self, request: Request) -> Response:
        return Response(CategorySerializer(services.seed_categories(request.user), many=True).data)


@extend_schema_view(list=extend_schema(parameters=[HistoryQuerySerializer]))
class EventViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    lookup_value_converter = "uuid"
    serializer_class = EventSerializer
    lookup_field = "public_id"
    http_method_names = ["get", "post", "head", "options"]
    filter_backends = [HistoryFilterBackend]

    def get_queryset(self) -> QuerySet[Event]:
        if getattr(self, "swagger_fake_view", False):
            return Event.objects.none()
        return events_for(self.request.user)

    def _response(self, result: tuple[Any, bool]) -> Response:
        event_id, replayed = result
        return Response(
            EventSerializer(self.get_queryset().get(public_id=event_id)).data,
            status=200 if replayed else 201,
        )

    @extend_schema(
        request=EventCreateSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        serializer = EventCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._response(
            services.create_event(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
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
        return self._reverse(request, void=False)

    @extend_schema(
        request=ReversalSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def void(self, request: Request, **kwargs: Any) -> Response:
        return self._reverse(request, void=True)

    def _reverse(self, request: Request, *, void: bool) -> Response:
        event = self.get_object()
        serializer = ReversalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._response(
            services.reverse_event(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                event_id=event.public_id,
                reason=serializer.validated_data["reason"],
                void=void,
            )
        )

    @extend_schema(
        request=CorrectionSerializer,
        responses={201: EventSerializer, 200: EventSerializer},
        parameters=[IDEMPOTENCY],
    )
    @action(detail=True, methods=["post"])
    def correct(self, request: Request, **kwargs: Any) -> Response:
        event = self.get_object()
        serializer = CorrectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._response(
            services.correct_event(
                user=request.user,
                key=request.headers.get("Idempotency-Key", ""),
                event_id=event.public_id,
                data=serializer.validated_data,
            )
        )
