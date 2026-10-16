"""Tests for health check endpoints."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.unit
class TestHealthCheckEndpoints:
    """Validate liveness and readiness probe responses."""

    def test_liveness_health_check_returns_200(self, api_client: APIClient) -> None:
        """GET /api/v1/health/ must return 200 with service metadata."""
        response = api_client.get("/api/v1/health/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "kivo-backend"
        assert data["version"] == "0.1.0"

    def test_database_health_check_returns_503_when_unavailable(
        self, api_client: APIClient
    ) -> None:
        """GET /api/v1/health/db/ must return 503 when the database is unreachable."""
        with patch(
            "common.health.views.connection.cursor", side_effect=Exception("Connection refused")
        ):
            response = api_client.get("/api/v1/health/db/")
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            assert data["status"] == "degraded"
            assert data["database"] == "unavailable"

    def test_database_health_check_returns_200_when_connected(self, api_client: APIClient) -> None:
        """GET /api/v1/health/db/ must return 200 when SELECT 1 succeeds."""
        mock_cursor = MagicMock()
        mock_cursor.__enter__.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (1,)

        with patch("common.health.views.connection.cursor", return_value=mock_cursor):
            response = api_client.get("/api/v1/health/db/")
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["status"] == "ok"
            assert data["database"] == "connected"
