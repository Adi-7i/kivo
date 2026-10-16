"""URL configuration for Kivo backend."""

from __future__ import annotations

from common.health.views import DatabaseHealthCheckView, HealthCheckView
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

# API v1 routes
api_v1_patterns = [
    # Health checks
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("health/db/", DatabaseHealthCheckView.as_view(), name="db-health-check"),
    # Phase 2: Authentication & User Management
    path("auth/", include("apps.users.urls")),
    path("", include("apps.ledger.urls")),
    path("funds/", include("apps.funds.urls")),
    path("", include("apps.sharing.urls")),
]

urlpatterns = [
    # Django Admin
    path("admin/", admin.site.urls),
    # REST API v1
    path("api/v1/", include((api_v1_patterns, "api-v1"))),
    # OpenAPI 3 Schema & Interactive Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]
