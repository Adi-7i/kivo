# Phase 2 readiness evidence for the authorized Phase 3–4 session

Date: 2026-10-16. Existing Phase 2 code was uncommitted on entry and was preserved.
No earlier Phase 2 verification report was present.

| Executed check | Exit | Observed result |
| --- | --- | --- |
| `backend/.venv/bin/python --version` | 0 | Python 3.14.4; Python 3.13 not available |
| `backend/.venv/bin/python backend/manage.py check` | 0 | No issues |
| `backend/.venv/bin/python -m pytest -v -m 'not django_db'` | 0 | 39 passed, 30 deselected |
| Read-only psycopg Supabase probe | 0 | PostgreSQL 17.11; role can create separate databases; users migrations 0001 and 0002 applied |
| `backend/.venv/bin/python -m pytest -v --reuse-db` | 0 | 69 passed in 155.71 seconds; separate remote PostgreSQL test database |
| `backend/.venv/bin/python backend/manage.py migrate --plan` | 0 | No planned operations before ledger implementation |
| `backend/.venv/bin/python backend/manage.py showmigrations` | 0 | All existing migrations applied |
| `backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run` | 0 | No changes detected before ledger implementation |
| `backend/.venv/bin/python backend/manage.py spectacular --validate --fail-on-warn --file /tmp/kivo-phase-02-openapi.yaml` | 0 | Schema validation succeeded without warnings |
| `backend/.venv/bin/ruff check .` | 0 | All checks passed |
| `backend/.venv/bin/ruff format --check .` | 0 | 42 files already formatted |

The initial sandboxed Supabase probe failed with `OperationalError` (exit 1).
The explicitly escalated network-enabled retry connected successfully. No
credentials or full connection URLs were printed. The database-backed regression
run used Django's separate `test_postgres` database, retained by `--reuse-db`.

The 69 passing tests include registration, password validation, case-insensitive
login, invalid and inactive login rejection, logout, profile isolation, CSRF,
session cookie attributes, throttling, the full auth lifecycle, and a genuine
PostgreSQL version query. Mock-based health tests are only unit evidence and are
not used as proof of database connectivity.

Prerequisite readiness: PASS on the installed Python 3.14.4 runtime. Python 3.13:
NOT VERIFIED. Phase 3 implementation began only after the complete baseline run
passed.
