"""Bounded request SQL timing; never retain statements, parameters or exception text."""

from __future__ import annotations

import logging
from collections.abc import Callable
from dataclasses import dataclass, field
from time import perf_counter_ns
from typing import Any

logger = logging.getLogger("kivo.database")


@dataclass
class DatabaseTiming:
    count: int = 0
    total_ns: int = 0
    maximum_ns: int = 0
    backend_pids: set[int] = field(default_factory=set)

    def __call__(
        self,
        execute: Callable[..., Any],
        sql: str,
        params: Any,
        many: bool,
        context: dict[str, Any],
    ) -> Any:
        started = perf_counter_ns()
        error_class = None
        # A failed libpq connection may report PID 0 afterward. Retain the
        # active PID before execution so outage logs can still be correlated.
        raw_connection = context["connection"].connection
        pid = getattr(getattr(raw_connection, "info", None), "backend_pid", None)
        pid = pid if isinstance(pid, int) and pid > 0 else None
        if pid is not None and len(self.backend_pids) < 8:
            self.backend_pids.add(pid)
        try:
            return execute(sql, params, many, context)
        except Exception as exc:
            error_class = type(exc).__name__
            raise
        finally:
            elapsed = perf_counter_ns() - started
            self.count += 1
            self.total_ns += elapsed
            self.maximum_ns = max(self.maximum_ns, elapsed)
            if elapsed >= 1_000_000_000:
                logger.warning(
                    "database_query_slow",
                    extra={
                        "database_alias": context["connection"].alias,
                        "database_backend_pid": pid,
                        "duration_ms": elapsed // 1_000_000,
                        "exception_class": error_class,
                    },
                )

    def fields(self) -> dict[str, Any]:
        return {
            "db_query_count": self.count,
            "db_duration_ms": self.total_ns // 1_000_000,
            "db_max_query_ms": self.maximum_ns // 1_000_000,
            "db_backend_pids": sorted(self.backend_pids),
        }
