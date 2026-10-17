from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.reports.views import (
    BreakdownView,
    BudgetViewSet,
    DashboardView,
    ExportView,
    FundReportViewSet,
    SummaryView,
    TrendsView,
)

router = SimpleRouter(use_regex_path=False)
router.register("budgets", BudgetViewSet, basename="budget")

urlpatterns = [
    *router.urls,
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/summary/", SummaryView.as_view(), name="report-summary"),
    path("reports/trends/", TrendsView.as_view(), name="report-trends"),
    path("reports/breakdown/", BreakdownView.as_view(), name="report-breakdown"),
    path("reports/export/", ExportView.as_view(), name="report-export"),
    path("reports/funds/", FundReportViewSet.as_view({"get": "list"}), name="report-funds"),
]
