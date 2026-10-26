"""Existing-session GET probe; no authentication or financial writes."""

import argparse
import json
import os
import time
from collections import Counter
from email.message import Message
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class SameOriginRedirects(HTTPRedirectHandler):
    """Never forward an existing test-session cookie outside the local frontend."""

    def redirect_request(
        self, req: Request, fp: Any, code: int, msg: str, headers: Message, newurl: str
    ) -> Request | None:
        target = urlsplit(newurl)
        if (target.scheme, target.netloc) != ("http", "localhost:3001"):
            raise URLError("Unexpected cross-origin diagnostic redirect")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cycles", type=int, choices=range(1, 11), default=4)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    folder = root / "kivo-frontend/.playwright-auth"
    state = json.loads((folder / "session.json").read_text())
    cookie = "; ".join(
        c["name"] + "=" + c["value"]
        for c in state["cookies"]
        if c["domain"].lstrip(".") == "localhost" and c["name"] in {"sessionid", "csrftoken"}
    )
    if not cookie:
        raise SystemExit("No existing approved test session; refusing mutation fallback")
    client = build_opener(SameOriginRedirects())
    rows = []
    failure = None
    start = time.monotonic()
    suspend = time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic()
    try:
        for cycle in range(args.cycles):
            for path in [
                "/auth/me",
                "/budgets?page=1",
                "/reports/summary?period=month",
                "/reports/trends?period=month&interval=day",
                "/reports/breakdown?period=month&dimension=category",
                "/reports/export?period=month",
            ]:
                request = Request(
                    "http://localhost:3001/api/v1" + path,
                    headers={"Cookie": cookie, "Accept": "application/json"},
                )
                tick = time.perf_counter()
                try:
                    with client.open(request, timeout=18) as response:
                        status = response.status
                        body = response.read()
                except HTTPError as exc:
                    with exc:
                        status = exc.code
                        body = exc.read()
                rows.append(
                    {
                        "path": path,
                        "status": status,
                        "ms": round((time.perf_counter() - tick) * 1000, 3),
                    }
                )
                if status != 200:
                    raise RuntimeError("Unexpected HTTP status")
                if "/export" in path:
                    if not body.startswith(b"\xef\xbb\xbfeffective_date,"):
                        raise RuntimeError("Invalid CSV prefix")
                else:
                    json.loads(body)
            print(
                json.dumps(
                    {
                        "cycle": cycle + 1,
                        "completed_requests": len(rows),
                        "max_ms": max(r["ms"] for r in rows),
                    }
                ),
                flush=True,
            )
        tick = time.perf_counter()
        try:
            with client.open(
                Request(
                    "http://localhost:3001/api/v1/reports/export",
                    headers={"Accept": "application/json"},
                ),
                timeout=18,
            ) as response:
                status = response.status
                response.read()
        except HTTPError as exc:
            with exc:
                status = exc.code
                exc.read()
        rows.append(
            {
                "path": "anonymous_export",
                "status": status,
                "ms": round((time.perf_counter() - tick) * 1000, 3),
            }
        )
        if status != 401:
            raise RuntimeError("Anonymous export denial failed")
    except Exception as exc:
        failure = {"exception_class": type(exc).__name__, "completed_requests": len(rows)}
    result = {
        "status": "failed" if failure else "passed",
        "requests": len(rows),
        "statuses": dict(Counter(r["status"] for r in rows)),
        "rows": rows,
        "failure": failure,
        "duration_seconds": round(time.monotonic() - start, 3),
        "suspend_delta_seconds": round(
            time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic() - suspend, 3
        ),
    }
    stamp = time.strftime("%Y%m%dT%H%M%SZ", time.gmtime()) + "-" + str(time.time_ns())
    artifact = folder / ("connectivity-" + stamp + "-http.json")
    fd = os.open(artifact, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as stream:
        json.dump(result, stream, indent=2)
    print(json.dumps({key: value for key, value in result.items() if key != "rows"}), flush=True)
    print(json.dumps({"artifact": str(artifact.relative_to(root))}), flush=True)
    if failure:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
