"""Tests for OpenAPI schema generation and developer documentation endpoints."""

from __future__ import annotations

import pytest
from rest_framework import status
from rest_framework.test import APIClient


@pytest.mark.unit
class TestOpenAPISchemaAndDocs:
    """Verify OpenAPI 3 schema and documentation endpoints."""

    def test_schema_endpoint_returns_valid_yaml(self, api_client: APIClient) -> None:
        """GET /api/schema/ must return 200 with OpenAPI schema content."""
        response = api_client.get("/api/schema/")
        assert response.status_code == status.HTTP_200_OK
        content = response.content.decode("utf-8")
        assert "openapi: 3.0.3" in content
        assert "Kivo API" in content
        assert "/api/v1/health/" in content

    def test_swagger_ui_endpoint_accessible(self, api_client: APIClient) -> None:
        """GET /api/docs/ must serve Swagger UI html."""
        response = api_client.get("/api/docs/")
        assert response.status_code == status.HTTP_200_OK
        assert "swagger-ui" in response.content.decode("utf-8")

    def test_redoc_endpoint_accessible(self, api_client: APIClient) -> None:
        """GET /api/redoc/ must serve ReDoc html."""
        response = api_client.get("/api/redoc/")
        assert response.status_code == status.HTTP_200_OK
        assert "redoc" in response.content.decode("utf-8")
