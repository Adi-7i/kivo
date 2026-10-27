"""Check current tracked files and emitted browser JS for configured private values.

Never print matched values. This is a scoped scan, not a Git-history or general
secret-discovery service. Runtime input comes from the existing ignored .env.
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    if Path.cwd().resolve() != ROOT:
        raise SystemExit("Run from the original repository root.")
    # Read only the local file; never enumerate or print the process environment.
    values: dict[str, str] = {}
    for line in (ROOT / ".env").read_text().splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            key, _, value = line.partition("=")
            values[key.strip()] = value.strip().strip("'\"")
    needles: set[bytes] = set()
    for key, value in values.items():
        # Public development placeholders are not private production values.
        if (
            value
            and any(part in key for part in ("SECRET", "PASSWORD", "SERVICE_ROLE", "DB_URL"))
            and not any(
                part in value.lower()
                for part in ("django-insecure-", "replace-with-", "your-db-password")
            )
        ):
            needles.add(value.encode())
        if key.endswith("DB_URL") and value:
            password = urlsplit(value).password
            if password:
                needles.update((password.encode(), unquote(password).encode()))
    needles.discard(b"")
    tracked = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
        capture_output=True,
        check=True,
    ).stdout.split(b"\0")
    sources = [ROOT / name.decode() for name in tracked if name]
    browser = sorted((ROOT / "kivo-frontend/.next/static").rglob("*.js"))
    matches = []
    for path in sources + browser:
        if path.is_file() and any(needle in path.read_bytes() for needle in needles):
            matches.append(str(path.relative_to(ROOT)))
    result = {
        "workspace_files_checked": sum(path.is_file() for path in sources),
        "browser_js_files_checked": len(browser),
        "private_patterns_checked": len(needles),
        "matched_paths": sorted(set(matches)),
        "scope": "Current non-ignored workspace files and emitted browser JS; excludes Git history.",
    }
    artifact = ROOT / ".pytest_cache/production/secret-scan.json"
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result))
    return int(bool(matches) or not browser or not needles)


if __name__ == "__main__":
    raise SystemExit(main())
