"""Read-only release gate for the configured PostgreSQL runtime connection."""

from __future__ import annotations

import json
from typing import Any

from django.apps import apps
from django.core.management.base import BaseCommand, CommandError
from django.db import connection

CLIENT_ROLES = ["anon", "authenticated", "service_role"]


class Command(BaseCommand):
    help = "Audit actual TLS, runtime privileges and Django table/sequence privacy without changes."

    def handle(self, *args: Any, **options: Any) -> None:
        names = sorted(
            {model._meta.db_table for model in apps.get_models(include_auto_created=True)}
            | {"django_migrations"}
        )
        with connection.cursor() as cursor:
            cursor.execute("SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()")
            ssl = cursor.fetchone()
            cursor.execute("""
                SELECT count(*) FROM pg_roles
                WHERE (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls)
                  AND (rolname=current_user OR pg_has_role(current_user, oid, 'MEMBER'))
            """)
            administrative_roles = cursor.fetchone()[0]
            cursor.execute(
                """
                SELECT c.oid, c.relname, c.relrowsecurity,
                    pg_has_role(current_user, c.relowner, 'MEMBER'),
                    EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname=ANY(%s)
                        AND has_table_privilege(r.oid, c.oid,
                            'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
                FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='public' AND c.relkind IN ('r','p') AND c.relname=ANY(%s)
                ORDER BY c.relname
            """,
                [CLIENT_ROLES, names],
            )
            tables = cursor.fetchall()
            cursor.execute(
                """
                SELECT s.relname,
                    EXISTS (SELECT 1 FROM pg_roles r WHERE r.rolname=ANY(%s)
                        AND has_sequence_privilege(r.oid,s.oid,'USAGE,SELECT,UPDATE'))
                FROM pg_class s JOIN pg_depend d ON d.objid=s.oid
                WHERE s.relkind='S' AND d.deptype IN ('a','i') AND d.refobjid=ANY(%s)
            """,
                [CLIENT_ROLES, [row[0] for row in tables]],
            )
            sequences = cursor.fetchall()
        missing = sorted(set(names) - {row[1] for row in tables})
        exposed = [row[1] for row in tables if not row[2] or row[4]]
        owned = [row[1] for row in tables if row[3]]
        exposed_sequences = [row[0] for row in sequences if row[1]]
        result = {
            "tls": bool(ssl and ssl[0]),
            "administrative_roles_accessible": administrative_roles,
            "runtime_owned_tables": len(owned),
            "tables_checked": len(tables),
            "missing_tables": missing,
            "privacy_failures": exposed,
            "sequences_checked": len(sequences),
            "sequence_privacy_failures": exposed_sequences,
        }
        self.stdout.write(json.dumps(result, sort_keys=True))
        if (
            not result["tls"]
            or administrative_roles
            or owned
            or missing
            or exposed
            or exposed_sequences
        ):
            raise CommandError(
                "FAIL: production database security gate; review the reported findings. No changes performed."
            )
        self.stdout.write(
            "PASS: TLS, restricted runtime role and Django table/sequence privacy; no changes performed."
        )
