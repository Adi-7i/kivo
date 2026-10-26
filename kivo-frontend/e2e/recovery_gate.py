"""Bounded real authentication/read gate; no financial writes or automatic POST retries."""

from __future__ import annotations

import json
import os
import secrets
import time
from collections import Counter
from http.cookiejar import CookieJar
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener
from uuid import uuid4

ORIGIN = "http://localhost:3001"


def main() -> None:
    if os.environ.get("KIVO_ALLOW_DEV_TEST_RECORDS") != "1":
        raise SystemExit("Approved development test identity opt-in required.")
    jar = CookieJar()
    client = build_opener(HTTPCookieProcessor(jar))
    counts: Counter[int] = Counter()
    durations: list[int] = []
    suspend_start = time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic()

    def call(path: str, expected: int = 200, body: dict[str, str] | None = None) -> bytes:
        headers = {"Accept": "application/json"}
        if body is not None:
            headers.update({"Content-Type": "application/json", "Origin": ORIGIN})
            headers["X-CSRFToken"] = next(c.value for c in jar if c.name == "csrftoken")
        base, separator, query = path.partition("?")
        # Next canonicalizes API URLs without a trailing slash. urllib does not
        # replay POST across 308, so address the canonical route before sending.
        request = Request(
            ORIGIN + base.rstrip("/") + (separator + query if separator else ""),
            data=json.dumps(body).encode() if body is not None else None,
            headers=headers,
        )
        started = time.monotonic()
        try:
            with client.open(request, timeout=18) as response:
                status, data = response.status, response.read()
        except HTTPError as error:
            status, data = error.code, error.read()
        counts[status] += 1
        duration = round((time.monotonic() - started) * 1000)
        durations.append(duration)
        if status != expected:
            print(
                json.dumps(
                    {
                        "event": "gate_failed",
                        "path": path,
                        "expected": expected,
                        "status": status,
                        "duration_ms": duration,
                        "statuses": dict(counts),
                    }
                ),
                flush=True,
            )
            raise SystemExit(1)
        return data

    run = "p6-recovery-" + uuid4().hex
    credentials = {"email": run + "@example.test", "password": secrets.token_urlsafe(32) + "!a7"}
    call("/api/v1/auth/csrf/")
    user = json.loads(call("/api/v1/auth/register/", 201, {**credentials, "name": run}))
    call("/api/v1/auth/me/", 401)
    call("/api/v1/auth/login/", body=credentials)
    assert json.loads(call("/api/v1/auth/me/"))["id"] == user["id"]
    assert any(c.name == "sessionid" and c.has_nonstandard_attr("HttpOnly") for c in jar)
    for cycle in range(10):
        assert json.loads(call("/api/v1/auth/me/"))["id"] == user["id"]
        assert json.loads(call("/api/v1/budgets/?page=1"))["count"] == 0
        summary = json.loads(call("/api/v1/reports/summary/?period=month"))
        assert summary["personal_expense"] == summary["external_income"] == "0.00"
        assert (
            json.loads(call("/api/v1/reports/trends/?period=month&interval=day"))["results"] == []
        )
        assert (
            json.loads(call("/api/v1/reports/breakdown/?period=month&dimension=category"))[
                "results"
            ]
            == []
        )
        csv = call("/api/v1/reports/export/?period=month")
        assert csv.startswith(b"\xef\xbb\xbfeffective_date,")
        print(
            json.dumps({"event": "cycle_passed", "cycle": cycle + 1, "statuses": dict(counts)}),
            flush=True,
        )
    call("/api/v1/auth/logout/", 204, {})
    call("/api/v1/auth/me/", 401)
    call("/api/v1/reports/export/", 401)
    suspend_delta = time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic() - suspend_start
    print(
        json.dumps(
            {
                "event": "gate_passed",
                "requests": sum(counts.values()),
                "statuses": dict(counts),
                "max_ms": max(durations),
                "suspend_delta_seconds": round(suspend_delta, 3),
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
