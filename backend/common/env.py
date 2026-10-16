"""Simple, secure .env file reader using standard library."""

from __future__ import annotations

import os
from pathlib import Path


def load_dotenv(env_path: Path | str | None = None) -> None:
    """Load key-value pairs from a .env file into os.environ.

    Does not overwrite existing environment variables.
    """
    if env_path is None:
        # Default: search at workspace root
        current_dir = Path(__file__).resolve().parent
        env_path = current_dir.parent.parent / ".env"
    else:
        env_path = Path(env_path)

    if not env_path.is_file():
        return

    try:
        with open(env_path, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, _, value = line.partition("=")
                    key = key.strip()
                    value = value.strip().strip("'\"")
                    if key and key not in os.environ:
                        os.environ[key] = value
    except Exception:
        # Silently fail if .env cannot be read; environment will rely on system env vars
        pass
