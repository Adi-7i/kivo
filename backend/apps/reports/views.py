"""Authenticated orchestration; all financial figures are derived selectors."""

from __future__ import annotations

from typing import Any

from django.db.models import BigIntegerField, Q, QuerySet, Sum, Value
from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import mixins, serializers, viewsets
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.funds.models import FundingBatch
from apps.funds.views import FundingBatchViewSet
from apps.ledger.history import validate_query
from apps.ledger.serializers import StrictSerializer
from apps.ledger.views import IDEMPOTENCY
from apps.reports import selectors
from apps.reports.export import csv_rows
from apps.reports.models import Budget
from apps.reports.serializers import (
    BreakdownQuerySerializer,
    BudgetSerializer,
    BudgetWriteSerializer,
    DashboardSerializer,
    ReportBreakdownSerializer,
    ReportFundingBatchSerializer,
    ReportQuerySerializer,
    ReportSummarySerializer,
    TrendQuerySerializer,
    TrendsSerializer,
)
from apps.reports.services import consistent_read, save_budget


class BudgetQuerySerializer(StrictSerializer):
    archived = serializers.BooleanField(required=False)
    page = serializers.IntegerField(min_value=1, required=False)


@extend_schema_view(
    list=extend_schema(parameters=[BudgetQuerySerializer], responses=BudgetSerializer(many=True))
)
class BudgetViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = BudgetSerializer
    lookup_value_converter = "uuid"
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[Budget]:
        return (
            Budget.objects.none()
            if getattr(self, "swagger_fake_view", False)
            else selectors.budgets_for(self.request.user)
        )

    def list(self, request: Request) -> Response:
        query = validate_query(request.query_params, BudgetQuerySerializer)
        with consistent_read(request.user):
            rows = self.get_queryset()
            if "archived" in query:
                rows = rows.filter(archived=query["archived"])
            page = self.paginate_queryset(rows)
            return self.get_paginated_response(
                BudgetSerializer(selectors.budget_progresses(page), many=True).data
            )

    def retrieve(self, request: Request, **kwargs: Any) -> Response:
        with consistent_read(request.user):
            return Response(
                BudgetSerializer(selectors.budget_progresses([self.get_object()])[0]).data
            )

    @extend_schema(
        request=BudgetWriteSerializer,
        responses={201: BudgetSerializer, 200: BudgetSerializer},
        parameters=[IDEMPOTENCY],
    )
    def create(self, request: Request) -> Response:
        return self._write(request)

    @extend_schema(
        request=BudgetWriteSerializer,
        responses={201: BudgetSerializer, 200: BudgetSerializer},
        parameters=[IDEMPOTENCY],
    )
    def partial_update(self, request: Request, **kwargs: Any) -> Response:
        return self._write(request, self.get_object())

    def _write(self, request: Request, budget: Budget | None = None) -> Response:
        payload = BudgetWriteSerializer(data=request.data, partial=budget is not None)
        payload.is_valid(raise_exception=True)
        resource_id, replayed = save_budget(
            user=request.user,
            key=request.headers.get("Idempotency-Key", ""),
            data=payload.validated_data,
            budget_id=budget.pk if budget else None,
        )
        with consistent_read(request.user):
            data = selectors.budget_progresses([self.get_queryset().get(pk=resource_id)])[0]
            return Response(BudgetSerializer(data).data, status=200 if replayed else 201)


class DashboardView(APIView):
    @extend_schema(parameters=[ReportQuerySerializer], responses=DashboardSerializer)
    def get(self, request: Request) -> Response:
        query = validate_query(request.query_params, ReportQuerySerializer)
        with consistent_read(request.user):
            return Response(DashboardSerializer(selectors.dashboard_for(request.user, query)).data)


class SummaryView(APIView):
    @extend_schema(parameters=[ReportQuerySerializer], responses=ReportSummarySerializer)
    def get(self, request: Request) -> Response:
        query = validate_query(request.query_params, ReportQuerySerializer)
        with consistent_read(request.user):
            return Response(
                ReportSummarySerializer(selectors.summary_for(request.user, query)).data
            )


class TrendsView(APIView):
    @extend_schema(parameters=[TrendQuerySerializer], responses=TrendsSerializer)
    def get(self, request: Request) -> Response:
        query = validate_query(request.query_params, TrendQuerySerializer)
        with consistent_read(request.user):
            return Response(TrendsSerializer(selectors.trends_for(request.user, query)).data)


class BreakdownView(APIView):
    @extend_schema(parameters=[BreakdownQuerySerializer], responses=ReportBreakdownSerializer)
    def get(self, request: Request) -> Response:
        query = validate_query(request.query_params, BreakdownQuerySerializer)
        with consistent_read(request.user):
            return Response(
                ReportBreakdownSerializer(selectors.breakdown_for(request.user, query)).data
            )


class ExportView(APIView):
    @extend_schema(
        parameters=[ReportQuerySerializer], responses={(200, "text/csv"): OpenApiTypes.STR}
    )
    def get(self, request: Request) -> StreamingHttpResponse:
        query = validate_query(request.query_params, ReportQuerySerializer)
        if not any(key in query for key in ("period", "date", "date_from", "date_to")):
            query["period"] = "month"
        response = StreamingHttpResponse(
            csv_rows(request.user, query), content_type="text/csv; charset=utf-8"
        )
        response["Content-Disposition"] = 'attachment; filename="kivo-transactions.csv"'
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class FundReportQuerySerializer(StrictSerializer):
    run = serializers.UUIDField(required=False)
    page = serializers.IntegerField(min_value=1, required=False)


@extend_schema_view(
    list=extend_schema(
        parameters=[FundReportQuerySerializer], responses=ReportFundingBatchSerializer(many=True)
    )
)
class FundReportViewSet(FundingBatchViewSet):
    serializer_class = ReportFundingBatchSerializer

    def list(self, request: Request, **kwargs: Any) -> Response:
        with consistent_read(request.user):
            return super().list(request, **kwargs)

    def get_queryset(self) -> QuerySet[FundingBatch]:
        if not getattr(self, "swagger_fake_view", False):
            validate_query(self.request.query_params, FundReportQuerySerializer)
        rows = super().get_queryset()
        run = self.allocation_run
        fields = {
            "expense_attributed": "expense",
            "refund_restored": "refund",
            "principal_returned": "principal",
            "advanced_to_receivables": "advance",
            "recovered_from_receivables": "recover",
            "internal_transferred": "transfer",
        }
        return rows.annotate(
            **{
                name: Sum(
                    "allocations__amount_paise",
                    filter=Q(allocations__run=run, allocations__kind=kind),
                    default=0,
                )
                if run
                else Value(None, output_field=BigIntegerField())
                for name, kind in fields.items()
            }
        )
