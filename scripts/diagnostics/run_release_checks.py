"""Run bounded release checks in the original repository and retain real exit codes.

Database mode enforces read-only sessions. Production-profile mode uses synthetic
configuration only; it cannot certify a real deployment. No package installs,
migrations, test database mutations, financial writes or infrastructure changes.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import secrets
import subprocess
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("offline", "database", "production-profile"))
    args = parser.parse_args()
    if Path.cwd().resolve() != ROOT:
        parser.error("Run from the original repository root.")
    sys.path.insert(0, str(ROOT / "backend"))
    from common.env import load_dotenv

    environment = os.environ.copy()
    private_values: set[str] = set()
    if args.mode != "production-profile":
        load_dotenv()
        environment = os.environ.copy()
    for key, value in environment.items():
        if any(word in key for word in ("SECRET", "PASSWORD", "TOKEN", "DB_URL")) and value:
            private_values.add(value)
        if key.endswith("DB_URL") and value:
            parsed = urlsplit(value)
            private_values.update(filter(None, (parsed.hostname, parsed.username, parsed.password)))
            if parsed.password:
                private_values.add(unquote(parsed.password))

    def sanitized(value: str) -> str:
        for private in sorted(private_values, key=len, reverse=True):
            value = value.replace(private, "[REDACTED]")
        return re.sub(r"postgres(?:ql)?://[^\s\"']+", "[REDACTED_DATABASE_URL]", value)

    manage = [sys.executable, "backend/manage.py"]
    if args.mode == "database":
        environment["DJANGO_SETTINGS_MODULE"] = "config.settings.development"
        environment["KIVO_DEV_DB_POOL"] = "0"
        environment["PGOPTIONS"] = (
            "-c default_transaction_read_only=on -c statement_timeout=10000 "
            "-c lock_timeout=2000 -c application_name=kivo_release_read_only"
        )
        commands = [
            manage + ["diagnose_database", "--samples", "3"],
            manage + ["inspect_release_database"],
            manage + ["makemigrations", "--check", "--dry-run"],
            manage + ["showmigrations"],
            manage + ["migrate", "--plan"],
            manage + ["sqlmigrate", "ledger", "0009"],
            manage + ["audit_database_security"],
            manage + ["reconcile_ledger"],
        ]
    elif args.mode == "production-profile":
        environment.update(
            DJANGO_SETTINGS_MODULE="config.settings.production",
            DEBUG="False",
            DJANGO_SECRET_KEY=secrets.token_urlsafe(64),
            ALLOWED_HOSTS="api.example.invalid",
            CSRF_TRUSTED_ORIGINS="https://web.example.invalid",
            SUPABASE_DB_URL="postgresql://app:synthetic@db.example.invalid/postgres",
            SECURE_SSL_REDIRECT="True",
            AUTH_TRUSTED_PROXY_HOPS="0",
        )
        commands = [manage + ["check", "--deploy", "--fail-level", "WARNING"]]
    else:
        environment["DJANGO_SETTINGS_MODULE"] = "config.settings.development"
        commands = [
            manage + ["check"],
            manage
            + [
                "spectacular",
                "--validate",
                "--fail-on-warn",
                "--file",
                ".pytest_cache/production/openapi.yaml",
            ],
            [str(ROOT / "backend/.venv/bin/ruff"), "check", "."],
            [str(ROOT / "backend/.venv/bin/ruff"), "format", "--check", "."],
            [sys.executable, "-m", "pip", "check"],
            [
                sys.executable,
                "-m",
                "pytest",
                "-m",
                "unit",
                "-q",
                "--junitxml=.pytest_cache/production/final-unit.xml",
            ],
            [sys.executable, "-m", "pytest", "--collect-only", "-q"],
        ]
    directory = ROOT / ".pytest_cache/production"
    directory.mkdir(parents=True, exist_ok=True)
    results = []
    for command in commands:
        tick = time.monotonic()
        try:
            completed = subprocess.run(
                command,
                cwd=ROOT,
                env=environment,
                capture_output=True,
                text=True,
                timeout=180,
                check=False,
            )
            code, stdout, stderr = completed.returncode, completed.stdout, completed.stderr
        except subprocess.TimeoutExpired:
            code, stdout, stderr = 124, "", "Check exceeded the 180-second diagnostic bound."
        result = {
            "command": command,
            "exit_code": code,
            "duration_seconds": round(time.monotonic() - tick, 3),
            "stdout": sanitized(stdout),
            "stderr": sanitized(stderr),
        }
        results.append(result)
        print(
            json.dumps({key: result[key] for key in ("command", "exit_code", "duration_seconds")}),
            flush=True,
        )
    artifact = directory / f"{args.mode}-{time.time_ns()}.json"
    artifact.write_text(
        json.dumps(
            {
                "utc": datetime.now(UTC).isoformat(),
                "mode": args.mode,
                "synthetic_configuration": args.mode == "production-profile",
                "results": results,
            },
            indent=2,
        )
        + "\n"
    )
    print(json.dumps({"artifact": str(artifact.relative_to(ROOT))}))
    return int(any(result["exit_code"] for result in results))


if __name__ == "__main__":
    raise SystemExit(main())
