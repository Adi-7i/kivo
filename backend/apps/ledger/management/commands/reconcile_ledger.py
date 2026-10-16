"""Read-only audit of committed financial journals."""

from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, Sum

from apps.ledger.models import Event


class Command(BaseCommand):
    help = "Verify every financial event has exactly two balanced postings (read only)."

    def handle(self, *args: Any, **options: Any) -> None:
        events = Event.objects.annotate(legs=Count("postings"), total=Sum("postings__amount_paise"))
        invalid = events.exclude(legs=2, total=0).count()
        count = events.count()
        if invalid:
            raise CommandError(f"FAIL: {invalid} of {count} financial events do not reconcile.")
        self.stdout.write(f"PASS: {count} financial events reconcile; no mutations performed.")
