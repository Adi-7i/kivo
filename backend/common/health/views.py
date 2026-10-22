"""Health check API endpoints for application liveness and database readiness."""

from __future__ import annotations

import logging

from django.db import connection
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger("kivo.health")


class HealthCheckView(APIView):
    """Liveness probe confirming the Django application process is running."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Application Liveness Check",
        description="Confirms that the Django HTTP worker process is responsive.",
        responses={
            200: OpenApiResponse(
                description="Application is healthy and serving requests",
            ),
        },
    )
    def get(self, request: Request) -> Response:
        return Response(
            {
                "status": "ok",
                "service": "kivo-backend",
                "version": "0.1.0",
            },
            status=status.HTTP_200_OK,
        )


class DatabaseHealthCheckView(APIView):
    """Readiness probe checking connectivity to Supabase PostgreSQL."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    @extend_schema(
        summary="Database Readiness Check",
        description="Performs a bounded ping query against the Supabase PostgreSQL database.",
        responses={
            200: OpenApiResponse(description="Database connection is healthy"),
            503: OpenApiResponse(description="Database connection is unavailable or degraded"),
        },
    )
    def get(self, request: Request) -> Response:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
                if row and row[0] == 1:
                    return Response(
                        {
                            "status": "ok",
                            "database": "connected",
                        },
                        status=status.HTTP_200_OK,
                    )
        except Exception as exc:
            logger.warning("Database health check failed: %s", exc.__class__.__name__)

        return Response(
            {
                "status": "degraded",
                "database": "unavailable",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
