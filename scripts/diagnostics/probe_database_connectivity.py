"""Bounded read-only route measurement; never print connection strings or SQL values."""

from __future__ import annotations

import argparse
import json
import math
import os
import platform
import socket
import sys
import time
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--samples", type=int, choices=range(1, 61), default=60)
    parser.add_argument(
        "--observed-log", type=Path, help="Observe connection PIDs from a repository server log"
    )
    args = parser.parse_args()
    ROOT = Path(__file__).resolve().parents[2]
    sys.path.insert(0, str(ROOT / "backend"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
    import django

    django.setup()
    from common.database_failure import failure_fields, tcp_snapshot
    from django.conf import settings
    from django.db import connection

    config = connection.settings_dict
    if (
        settings.SETTINGS_MODULE != "config.settings.development"
        or config["NAME"] != "postgres"
        or connection.vendor != "postgresql"
    ):
        raise SystemExit("Approved development PostgreSQL target required")
    config["OPTIONS"]["options"] = (
        "-c default_transaction_read_only=on -c statement_timeout=5000 -c lock_timeout=1000 -c application_name=kivo_p6_connectivity_probe"
    )
    pooled = bool(config["OPTIONS"].get("pool"))
    host = config["HOST"]
    connection_mode = (
        "direct"
        if host.startswith("db.") and host.endswith(".supabase.co")
        else "session_pooler"
        if host.endswith(".pooler.supabase.com") and int(config["PORT"]) == 5432
        else "unverified"
    )
    result = {
        "mode": "configured_route_with_local_psycopg_pool"
        if pooled
        else "configured_route_persistent",
        "connection_mode": connection_mode,
        "os": platform.system(),
        "python": platform.python_version(),
        "django": django.get_version(),
        "port": config["PORT"],
        "sslmode": config["OPTIONS"]["sslmode"],
        "conn_max_age": config["CONN_MAX_AGE"],
        "health_checks": config["CONN_HEALTH_CHECKS"],
        "pool_options": config["OPTIONS"].get("pool"),
        "requests": 0,
        "failures": [],
        "utc_start": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    start = time.monotonic()
    suspend_base = time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic()
    stage = "dns"
    observed = {}
    try:
        tick = time.perf_counter()
        addresses = socket.getaddrinfo(config["HOST"], config["PORT"], type=socket.SOCK_STREAM)
        result["dns_ms"] = round((time.perf_counter() - tick) * 1000, 3)
        result["address_families"] = sorted({socket.AddressFamily(a[0]).name for a in addresses})
        stage = "initialization"
        tick = time.perf_counter()
        connection.ensure_connection()
        result["initialization_ms"] = round((time.perf_counter() - tick) * 1000, 3)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT current_database()='postgres', current_setting('transaction_read_only'), (SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()), current_setting('max_connections')::int, current_setting('statement_timeout')"
            )
            row = cursor.fetchone()
            if row[0] is not True or row[1] != "on" or row[2] is not True:
                raise RuntimeError("Development identity, read-only or TLS gate failed")
            result["identity_verified"] = row[0]
            result["read_only"] = row[1]
            result["tls"] = row[2]
            result["max_connections"] = row[3]
            result["probe_statement_timeout"] = row[4]
            cursor.execute(
                "SELECT state,wait_event_type,count(*) FROM pg_stat_activity WHERE datname=current_database() GROUP BY state,wait_event_type"
            )
            result["sessions_before"] = cursor.fetchall()
            cursor.execute(
                "SELECT count(*) FILTER(WHERE cardinality(pg_blocking_pids(pid))>0), count(*) FROM pg_stat_activity WHERE datname=current_database()"
            )
            result["blocked_and_total_sessions_before"] = cursor.fetchone()
            if args.observed_log:
                stage = "observed_connections"
                observed_log = args.observed_log.resolve()
                if not observed_log.is_relative_to(ROOT):
                    raise ValueError("The observed server log must be inside the repository")
                pids: set[int] = set()
                for line in observed_log.read_text().splitlines():
                    try:
                        event = json.loads(line)
                    except ValueError:
                        continue
                    if isinstance(event, dict):
                        pids.update(
                            pid
                            for pid in event.get("db_backend_pids", [])
                            if type(pid) is int and pid > 0
                        )
                result["observed_backend_pid_count"] = len(pids)
                result["remaining_observed_server_connections"] = None
                if pids:
                    cursor.execute(
                        "SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid=ANY(%s)",
                        [sorted(pids)],
                    )
                    result["remaining_observed_server_connections"] = cursor.fetchone()[0]
            cursor.execute("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT 1")
            plan = cursor.fetchone()[0][0]
            result["select1_server_execution_ms"] = plan["Execution Time"]
            result["select1_server_planning_ms"] = plan["Planning Time"]
        if pooled:
            connection.close()
        stage = "samples"
        query_times, acquisition_times = [], []
        for index in range(args.samples):
            if time.monotonic() - start > 180:
                raise TimeoutError("Overall probe duration exceeded")
            tick = time.perf_counter()
            connection.ensure_connection()
            acquisition_times.append(round((time.perf_counter() - tick) * 1000, 3))
            raw = connection.connection
            pid = raw.info.backend_pid
            before = tcp_snapshot(connection)
            tick = time.perf_counter()
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                assert cursor.fetchone() == (1,)
            ms = round((time.perf_counter() - tick) * 1000, 3)
            query_times.append(ms)
            after = tcp_snapshot(connection)
            result["requests"] += 1
            if before and after:
                if pid not in observed:
                    observed[pid] = {"before": before, "after": after}
                observed[pid]["after"] = after
            if ms > 1000 or (before and after and after["total_retrans"] > before["total_retrans"]):
                print(
                    json.dumps(
                        {
                            "event": "slow_or_retransmitted_sample",
                            "mode": result["mode"],
                            "sample": index + 1,
                            "query_ms": ms,
                            "tcp_before": before,
                            "tcp_after": after,
                        }
                    ),
                    flush=True,
                )
            if pooled:
                connection.close()
            if (index + 1) % 15 == 0:
                print(
                    json.dumps(
                        {
                            "event": "progress",
                            "mode": result["mode"],
                            "samples": index + 1,
                            "max_query_ms": max(query_times),
                        }
                    ),
                    flush=True,
                )
            time.sleep(1)

        def stats(values: list[float]) -> dict[str, float]:
            ordered = sorted(values)
            return {
                "min": min(values),
                "median": ordered[len(ordered) // 2],
                "p95": ordered[math.ceil(len(ordered) * 0.95) - 1],
                "max": max(values),
            }

        result["query_ms"] = stats(query_times)
        result["acquisition_ms"] = stats(acquisition_times)
        result["observed_physical_connections"] = len(observed)
        result["tcp_connections"] = list(observed.values())
        result["retransmission_delta"] = sum(
            v["after"]["total_retrans"] - v["before"]["total_retrans"] for v in observed.values()
        )
        result["query_over_1s"] = sum(v > 1000 for v in query_times)
        if pooled:
            result["pool_stats"] = connection._connection_pools[connection.alias].get_stats()
        else:
            stage = "fresh_initialization"
            connection.close()
            fresh = []
            for _ in range(3):
                tick = time.perf_counter()
                connection.ensure_connection()
                fresh.append(round((time.perf_counter() - tick) * 1000, 3))
                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    assert cursor.fetchone() == (1,)
                connection.close()
            result["fresh_initialization_ms"] = fresh
        result["status"] = "passed"
    except Exception as exc:
        result["failures"].append({"stage": stage, **failure_fields(exc, connection)})
        result["status"] = "failed"
    finally:
        connection.close()
        if pooled:
            connection.close_pool()
        result["duration_seconds"] = round(time.monotonic() - start, 3)
        result["suspend_delta_seconds"] = round(
            time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic() - suspend_base, 3
        )
        print(json.dumps(result, default=str), flush=True)
        folder = ROOT / "kivo-frontend/.playwright-auth"
        folder.mkdir(mode=0o700, parents=True, exist_ok=True)
        stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + "-" + str(time.time_ns())
        artifact = folder / (
            "connectivity-" + stamp + "-" + ("local-pool" if pooled else "direct") + ".json"
        )
        fd = os.open(artifact, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as stream:
            json.dump(result, stream, indent=2, default=str)
    print(json.dumps({"artifact": str(artifact.relative_to(ROOT))}), flush=True)
    if result["status"] != "passed":
        raise SystemExit(1)


if __name__ == "__main__":
    main()
