from rest_framework.routers import SimpleRouter

from apps.ledger.views import AccountViewSet, CategoryViewSet, EventViewSet

router = SimpleRouter(use_regex_path=False)
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", EventViewSet, basename="transaction")
urlpatterns = router.urls
