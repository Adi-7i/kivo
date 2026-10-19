"""Read-only network/session/lock evidence without SQL text or financial rows."""

from __future__ import annotations

import json
import socket
from time import perf_counter
from typing import Any

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import connection, transaction


class Command(BaseCommand):
    help = "Measure DNS, connection initialization, query round trips and actual lock waits (read only)."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--samples", type=int, default=3)
        parser.add_argument("--backend-pid", type=int)

    def handle(self, *args: Any, **options: Any) -> None:
        samples = options["samples"]
        pid = options["backend_pid"]
        if not 1 <= samples <= 10 or (pid is not None and pid <= 0):
            raise CommandError("Use 1–10 samples and a positive optional backend PID.")
        config = connection.settings_dict
        result: dict[str, Any] = {
            "pool_enabled": bool(config["OPTIONS"].get("pool")),
            "connection_max_age": config["CONN_MAX_AGE"],
            "health_checks": config.get("CONN_HEALTH_CHECKS", False),
            "connect_timeout": config["OPTIONS"].get("connect_timeout"),
        }
        stage = "dns"
        try:
            started = perf_counter()
            addresses = socket.getaddrinfo(config["HOST"], config["PORT"], type=socket.SOCK_STREAM)
            result["dns_ms"] = round((perf_counter() - started) * 1000, 3)
            result["address_families"] = sorted(
                {socket.AddressFamily(address[0]).name for address in addresses}
            )
            stage = "connection_initialization"
            started = perf_counter()
            connection.ensure_connection()
            result["connection_initialization_ms"] = round((perf_counter() - started) * 1000, 3)
            # No changes to operator settings, locks, roles or financial records.
            with transaction.atomic(), connection.cursor() as cursor:
                cursor.execute("SET TRANSACTION READ ONLY")
                stage = "query"
                cursor.execute("""
                    SELECT current_database(), pg_backend_pid(),
                        current_setting('server_version'),
                        current_setting('statement_timeout'), current_setting('lock_timeout'),
                        current_setting('idle_in_transaction_session_timeout'),
                        current_setting('max_connections'),
                        (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid())
                """)
                row = cursor.fetchone()
                result.update(
                    zip(
                        (
                            "database",
                            "backend_pid",
                            "server_version",
                            "statement_timeout",
                            "lock_timeout",
                            "idle_transaction_timeout",
                            "max_connections",
                            "tls",
                        ),
                        row,
                        strict=True,
                    )
                )
                durations = []
                for _ in range(samples):
                    started = perf_counter()
                    cursor.execute("SELECT 1")
                    assert cursor.fetchone() == (1,)
                    durations.append(round((perf_counter() - started) * 1000, 3))
                result["select_round_trip_ms"] = durations
                cursor.execute("""
                    SELECT state, wait_event_type, count(*) FROM pg_stat_activity
                    WHERE datname=current_database() GROUP BY state, wait_event_type
                    ORDER BY state NULLS LAST, wait_event_type NULLS LAST
                """)
                result["session_counts"] = cursor.fetchall()
                if pid is not None:
                    cursor.execute(
                        """
                        SELECT pid, state, wait_event_type, wait_event,
                            extract(epoch FROM clock_timestamp()-query_start),
                            pg_blocking_pids(pid)
                        FROM pg_stat_activity WHERE datname=current_database() AND pid=%s
                        """,
                        [pid],
                    )
                    result["observed_backend"] = cursor.fetchone()
        except Exception as exc:
            result.update({"failed_stage": stage, "exception_class": type(exc).__name__})
            self.stdout.write(json.dumps(result, sort_keys=True, default=str))
            raise CommandError(
                "Database diagnostic failed; no automatic write retry performed."
            ) from None
        self.stdout.write(json.dumps(result, sort_keys=True, default=str))
