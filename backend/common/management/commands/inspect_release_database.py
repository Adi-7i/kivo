"""Read-only release snapshot; report aggregate integrity and catalog evidence only."""

from __future__ import annotations

import json
from typing import Any

from django.core.management.base import BaseCommand
from django.db import connection, transaction
from django.db.migrations.executor import MigrationExecutor


class Command(BaseCommand):
    help = "Inspect migration/index/constraint/connection state without changing the database."

    def handle(self, *args: Any, **options: Any) -> None:
        with transaction.atomic(), connection.cursor() as cursor:
            cursor.execute("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
            cursor.execute("SET LOCAL statement_timeout = '10s'")
            cursor.execute("SET LOCAL lock_timeout = '2s'")
            cursor.execute("""
                SELECT current_database(), current_setting('server_version'),
                    current_setting('transaction_read_only'),
                    (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()),
                    current_setting('max_connections'), current_setting('idle_in_transaction_session_timeout')
            """)
            database, version, read_only, tls, maximum, idle_timeout = cursor.fetchone()
            result: dict[str, Any] = {
                "database": database,
                "server_version": version,
                "read_only": read_only,
                "tls": tls,
                "sslmode": connection.settings_dict["OPTIONS"].get("sslmode"),
                "max_connections": maximum,
                "idle_transaction_timeout": idle_timeout,
            }
            executor = MigrationExecutor(connection)
            result["pending_migrations"] = [
                f"{migration.app_label}.{migration.name}"
                for migration, backwards in executor.migration_plan(
                    executor.loader.graph.leaf_nodes()
                )
            ]
            cursor.execute("""
                SELECT count(*) FROM (SELECT lower(email) FROM users
                    GROUP BY lower(email) HAVING count(*) > 1) duplicates
            """)
            result["case_insensitive_duplicate_email_groups"] = cursor.fetchone()[0]
            cursor.execute("""
                SELECT EXISTS(SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
                    WHERE c.relname='users_email_ci_unique' AND i.indisvalid AND i.indisunique)
            """)
            result["email_unique_index_valid"] = cursor.fetchone()[0]
            cursor.execute("""
                SELECT count(*), count(*) FILTER (WHERE NOT i.indisvalid)
                FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
                JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
            """)
            result["indexes_total_and_invalid"] = cursor.fetchone()
            cursor.execute("""
                SELECT contype, count(*), count(*) FILTER (WHERE NOT convalidated)
                FROM pg_constraint WHERE connamespace='public'::regnamespace
                GROUP BY contype ORDER BY contype
            """)
            result["constraints_type_total_unvalidated"] = cursor.fetchall()
            cursor.execute("""
                SELECT count(*) FILTER (WHERE cardinality(pg_blocking_pids(pid)) > 0), count(*)
                FROM pg_stat_activity WHERE datname=current_database()
            """)
            result["blocked_and_total_sessions"] = cursor.fetchone()
            cursor.execute("""
                SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
                JOIN pg_namespace n ON n.oid=c.relnamespace
                WHERE n.nspname='public' AND NOT t.tgisinternal AND t.tgenabled='D'
            """)
            result["disabled_public_triggers"] = cursor.fetchone()[0]
        self.stdout.write(json.dumps(result, sort_keys=True))
