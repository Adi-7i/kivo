"""Read-only audit; never fixes figures by mutating financial history."""

from typing import Any

from django.core.management.base import BaseCommand, CommandError

from apps.ledger.exceptions import FinancialConflict
from apps.sharing.models import RentPlan
from apps.sharing.rent import check_rent
from apps.users.models import User


class Command(BaseCommand):
    help = "Reconcile rent payments and reserves against unpaid obligations (read only)."

    def handle(self, *args: Any, **options: Any) -> None:
        obligations = reserves = owners = 0
        for user in User.objects.filter(pk__in=RentPlan.objects.values("user_id")).iterator():
            try:
                counts = check_rent(user)
            except FinancialConflict as exc:
                raise CommandError(
                    f"FAIL: rent reconciliation failed for owner {user.pk}."
                ) from exc
            obligations += counts["obligations"]
            reserves += counts["reserves"]
            owners += 1
        self.stdout.write(
            f"PASS: {owners} owners, {obligations} obligations, {reserves} reserves; no mutations performed."
        )
