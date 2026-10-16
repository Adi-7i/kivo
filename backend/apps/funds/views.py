"""Read-only funding batches, source journeys and explicit attribution states."""

from __future__ import annotations

from functools import cached_property
from typing import Any
from uuid import UUID

from django.db.models import Count, QuerySet, Sum
from django.shortcuts import get_object_or_404
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.funds.models import Allocation, AllocationRun, FundingBatch
from apps.funds.selectors import allocations_for, batches_for, breakdown_for, select_run
from apps.funds.serializers import (
    AllocationSerializer,
    BreakdownSerializer,
    FundingBatchSerializer,
    FundSummarySerializer,
)
from apps.ledger.models import Event

RUN_PARAMETER = OpenApiParameter(
    "run",
    OpenApiTypes.UUID,
    description="Optional owned historical snapshot UUID; latest snapshot by default.",
)


class RunSelectionMixin:
    request: Request

    @cached_property
    def allocation_run(self) -> AllocationRun | None:
        if getattr(self, "swagger_fake_view", False):
            return None
        raw = self.request.query_params.get("run")
        run_id = serializers.UUIDField().run_validation(raw) if raw is not None else None
        return select_run(self.request.user, run_id)


@extend_schema(parameters=[RUN_PARAMETER])
class FundingBatchViewSet(
    RunSelectionMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    serializer_class = FundingBatchSerializer
    lookup_value_converter = "uuid"
    http_method_names = ["get", "head", "options"]

    def get_queryset(self) -> QuerySet[FundingBatch]:
        if getattr(self, "swagger_fake_view", False):
            return FundingBatch.objects.none()
        return batches_for(self.request.user, self.allocation_run)

    def get_serializer_context(self) -> dict[str, Any]:
        return {**super().get_serializer_context(), "run": self.allocation_run}

    @extend_schema(responses=AllocationSerializer(many=True))
    @action(detail=True, methods=["get"])
    def journey(self, request: Request, **kwargs: Any) -> Response:
        batch = self.get_object()
        rows = allocations_for(request.user, self.allocation_run).filter(batch=batch)
        page = self.paginate_queryset(rows)
        return self.get_paginated_response(AllocationSerializer(page, many=True).data)

    @extend_schema(responses=BreakdownSerializer(many=True))
    @action(detail=True, methods=["get"])
    def breakdown(self, request: Request, **kwargs: Any) -> Response:
        rows = breakdown_for(request.user, self.allocation_run, self.get_object())
        page = self.paginate_queryset(rows)
        return self.get_paginated_response(BreakdownSerializer(page, many=True).data)


@extend_schema(
    parameters=[
        RUN_PARAMETER,
        OpenApiParameter(
            "transaction", OpenApiTypes.UUID, description="Owned financial event UUID."
        ),
    ]
)
class AllocationViewSet(RunSelectionMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = AllocationSerializer
    http_method_names = ["get", "head", "options"]

    def get_queryset(self) -> QuerySet[Allocation]:
        if getattr(self, "swagger_fake_view", False):
            return Allocation.objects.none()
        rows = allocations_for(self.request.user, self.allocation_run)
        raw = self.request.query_params.get("transaction")
        if raw is not None:
            event_id: UUID = serializers.UUIDField().run_validation(raw)
            event = get_object_or_404(Event, user=self.request.user, public_id=event_id)
            rows = rows.filter(event=event)
        return rows


class FundSummaryView(RunSelectionMixin, APIView):
    @extend_schema(parameters=[RUN_PARAMETER], responses=FundSummarySerializer)
    def get(self, request: Request) -> Response:
        run = self.allocation_run
        data: dict[str, Any] = {
            "run_id": None,
            "policy_version": None,
            "attribution_status": "not_computed",
            "active_batches": 0,
            "original_amount": None,
            "allocated_amount": None,
            "remaining_capacity": None,
            "unfunded_amount": None,
            "gaps": [],
        }
        if run:
            totals = run.capacities.aggregate(
                count=Count("id"),
                original=Sum("original_paise"),
                allocated=Sum("allocated_paise"),
                remaining=Sum("remaining_paise"),
            )
            gaps = list(run.gaps.select_related("event").all())
            data.update(
                run_id=run.public_id,
                policy_version=run.policy_version,
                attribution_status=run.status,
                active_batches=totals["count"],
                original_amount=totals["original"] or 0,
                allocated_amount=totals["allocated"] or 0,
                remaining_capacity=totals["remaining"] or 0,
                unfunded_amount=sum(gap.amount_paise for gap in gaps),
                gaps=gaps,
            )
        return Response(FundSummarySerializer(data).data)
