from django.urls import path
from rest_framework.routers import SimpleRouter

from apps.sharing.views import (
    ContactViewSet,
    RentObligationViewSet,
    RentPaymentViewSet,
    RentPlanViewSet,
    RentReserveViewSet,
    SpendingCapacityView,
)

router = SimpleRouter(use_regex_path=False)
router.register("contacts", ContactViewSet, basename="contact")
router.register("rent/plans", RentPlanViewSet, basename="rent-plan")
router.register("rent/obligations", RentObligationViewSet, basename="rent-obligation")
router.register("rent/payments", RentPaymentViewSet, basename="rent-payment")
router.register("rent/reserves", RentReserveViewSet, basename="rent-reserve")
urlpatterns = [
    path("rent/spending-capacity/", SpendingCapacityView.as_view(), name="spending-capacity"),
    *router.urls,
]
