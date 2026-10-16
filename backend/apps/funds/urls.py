from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.funds.views import AllocationViewSet, FundingBatchViewSet, FundSummaryView

router = SimpleRouter(use_regex_path=False)
router.register("batches", FundingBatchViewSet, basename="funding-batch")
router.register("allocations", AllocationViewSet, basename="fund-allocation")
urlpatterns = [path("summary/", FundSummaryView.as_view(), name="fund-summary"), *router.urls]
