"""Explicit backfill or read-only reconciliation of funding attribution."""

from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser

from apps.funds.services import check_attribution, rebuild_attribution
from apps.ledger.exceptions import FinancialConflict
from apps.users.models import User


class Command(BaseCommand):
    help = "Backfill immutable funding snapshots, or verify them without changes using --check."

    def add_arguments(self, parser: CommandParser) -> None:
        owners = parser.add_mutually_exclusive_group(required=True)
        owners.add_argument("--all", action="store_true")
        owners.add_argument("--user-id", type=int)
        parser.add_argument("--check", action="store_true")

    def handle(self, *args: Any, **options: Any) -> None:
        users = User.objects.all()
        if options["user_id"] is not None:
            users = users.filter(pk=options["user_id"])
            if not users.exists():
                raise CommandError("Owner not found.")
        count = 0
        incomplete = 0
        try:
            for user in users.iterator():
                if options["check"]:
                    check_attribution(user)
                else:
                    run = rebuild_attribution(user=user, strict=False)
                    incomplete += run.status == "incomplete"
                count += 1
        except FinancialConflict as exc:
            raise CommandError(str(exc.detail)) from exc
        if incomplete:
            raise CommandError(
                f"INCOMPLETE: {incomplete} of {count} owners have recorded attribution gaps; ledger unchanged."
            )
        self.stdout.write(
            f"PASS: {'checked' if options['check'] else 'rebuilt'} attribution for {count} owners."
        )
