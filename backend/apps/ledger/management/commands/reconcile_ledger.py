"""Read-only audit of committed financial journals."""

from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Sum
from django.db.models.functions import Coalesce

from apps.ledger.models import Event


class Command(BaseCommand):
    help = "Verify balanced event totals and exact operation-specific postings (read only)."

    def handle(self, *args: Any, **options: Any) -> None:
        from django.db import connection

        events = Event.objects.annotate(total=Coalesce(Sum("postings__amount_paise"), 0))
        invalid = events.exclude(total=0).count()
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT count(*) FROM ledger_event e WHERE EXISTS (
                    (SELECT book,account_id,claim_id,amount_paise FROM ledger_posting WHERE event_id=e.id
                     EXCEPT ALL SELECT * FROM kivo_expected_postings(e.id))
                    UNION ALL
                    (SELECT * FROM kivo_expected_postings(e.id) EXCEPT ALL
                     SELECT book,account_id,claim_id,amount_paise FROM ledger_posting WHERE event_id=e.id))
            """)
            invalid += cursor.fetchone()[0]
        count = events.count()
        if invalid:
            raise CommandError(f"FAIL: {invalid} of {count} financial events do not reconcile.")
        self.stdout.write(f"PASS: {count} financial events reconcile; no mutations performed.")
