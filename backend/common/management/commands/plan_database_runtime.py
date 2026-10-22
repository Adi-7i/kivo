"""Print a reviewable least-privilege rehearsal; never execute permission changes."""

from __future__ import annotations

from typing import Any

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import connection

from common.runtime_role import role_statements


class Command(BaseCommand):
    help = "Print rollback-only SQL for an isolated runtime-role rehearsal. No changes performed."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--role", default="kivo_runtime_probe")
        parser.add_argument("--test-database", default="test_kivo_phase07")

    def handle(self, *args: Any, **options: Any) -> None:
        target = options["test_database"]
        if not target.startswith("test_") or target == connection.settings_dict["NAME"]:
            raise CommandError("Plan requires a distinct test_ database target.")
        tables = sorted(
            {model._meta.db_table for model in apps.get_models(include_auto_created=True)}
            | {"django_migrations"}
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_user")
            administrator = cursor.fetchone()[0]
            cursor.execute(
                """
                SELECT s.relname FROM pg_class s JOIN pg_depend d ON d.objid=s.oid
                JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace n ON n.oid=t.relnamespace
                WHERE s.relkind='S' AND d.deptype IN ('a','i')
                  AND n.nspname='public' AND t.relname=ANY(%s)
                ORDER BY s.relname
                """,
                [tables],
            )
            sequences = [row[0] for row in cursor.fetchall()]
        statements = role_statements(
            role=options["role"],
            administrator=administrator,
            database=options["test_database"],
            tables=tables,
            sequences=sequences,
        )
        self.stdout.write("-- REVIEW ONLY. Run solely on the approved isolated test database.")
        self.stdout.write("-- Role DDL is cluster-wide but stays uncommitted and is rolled back.")
        self.stdout.write("BEGIN;")
        # role_statements validated this identifier before interpolation.
        self.stdout.write(
            "DO $kivo$ BEGIN IF current_database() <> '" + target + "' THEN "
            "RAISE EXCEPTION 'Approved isolated target required'; END IF; END $kivo$;"
        )
        for statement in statements:
            self.stdout.write(statement + ";")
        self.stdout.write("-- SET LOCAL ROLE and execute approved workflow probes before rollback.")
        self.stdout.write("ROLLBACK;")
