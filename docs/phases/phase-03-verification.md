# Phase 3 verification: accounts and immutable financial ledger

Date: 2026-10-16. Status: PASS. The Phase 3 gate passed on Python 3.13.16 before
Phase 4 implementation began.

## Implementation

`backend/apps/ledger/` contains models, exact INR fields, serializers, selectors,
atomic services, API views, routes, migrations and the read-only
`reconcile_ledger` command. Accounts support Cash, Bank and Wallet, ledger-derived
opening/current balances, metadata updates and safe archival. Categories support
customizable defaults, two levels and archival. Transactions implement receipts,
expenses, owned transfers, partial linked refunds, details, filtering/search,
pagination, reversals, voids and superseding corrections. Posted history is
append-only in PostgreSQL. All financial POSTs use durable owner-scoped retry
receipts, and every write takes an owner row lock inside an atomic transaction.

`backend/common/observability.py` adds structured request/write logs and validated
request IDs. Existing session authentication and CSRF enforcement are preserved.
`tests/conftest.py` refuses unsafe test database setup.

Policies and unresolved recovery/negative-balance decisions are documented in
[ADR-003](../decisions/ADR-003-financial-ledger.md). No Phase 5 business features
are included. Source documents absent from the repository are listed in the
[execution plan](phase-03-04-plan.md).

## Executed evidence to date

| Command/check | Exit | Result |
| --- | --- | --- |
| Existing `python -m pytest -v --reuse-db` before implementation | 0 | 69 passed, 155.71 s; see Phase 2 readiness report |
| First ledger run, interrupted after connection diagnostics | 2 | 1 passed, interrupted; not a passing gate |
| `backend/.venv/bin/python -m pytest -v tests/test_ledger.py --reuse-db --maxfail=1` | 0 | 32 passed, 249.76 s; two account pagination warnings subsequently fixed |
| `backend/.venv/bin/python -m pytest -v --reuse-db --maxfail=1` | 0 | 102 passed, 389.25 s; before final privacy/isolation additions |
| `backend/.venv/bin/python -m pytest -v tests/test_database_privacy.py tests/test_ledger.py::test_foreign_transaction_details_and_actions_are_isolated --reuse-db --maxfail=1` | 0 | 2 passed, 21.82 s, after final privacy/isolation additions |
| `backend/.venv/bin/python backend/manage.py check` | 0 | No issues |
| `backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run` | 0 | No changes detected |
| `backend/.venv/bin/python backend/manage.py sqlmigrate ledger 0001 --no-color > /tmp/kivo-ledger-0001.sql` | 0 | Reviewed additive schema/constraints/index SQL |
| `backend/.venv/bin/python backend/manage.py migrate --plan` | 0 | Reviewed ledger 0001/0002, then separately 0003 privacy migration |
| `backend/.venv/bin/python backend/manage.py migrate --noinput` | 0 | 0001 and 0002 applied; later 0003 applied successfully |
| `backend/.venv/bin/python backend/manage.py showmigrations` | 0 | Existing migrations and ledger 0001/0002 applied; 0003 application separately observed |
| `backend/.venv/bin/python backend/manage.py reconcile_ledger` | 0 | 0 development events, no mutations; financial scenario evidence comes from isolated PostgreSQL tests, not the empty development journal |
| `backend/.venv/bin/python backend/manage.py spectacular --validate --fail-on-warn --file /tmp/kivo-phase-03-openapi.yaml` | 0 | Valid schema with no warnings after final route changes |
| `backend/.venv/bin/ruff check .` | 0 | All checks passed |
| `backend/.venv/bin/ruff format --check .` | 0 | 61 files already formatted |

## Financial and security results observed on real PostgreSQL

- PASS: receive INR 1,000 → liquid 1,000, expense 0; spend 120 + 40 → liquid
  840, expense 160. Every tested event has two legs summing to zero.
- PASS: owned transfer preserves combined liquid balance and personal expense.
- PASS: opening INR 250.05 is equity with zero external receipts and zero expense.
- PASS: linked partial refund restores liquid funds and reduces net personal
  expense; over-refunds and pre-expense refund dates are rejected.
- PASS: identical retry creates one event/two legs/one durable retry receipt;
  conflicting reuse returns 409. Failed writes leave no consumed retry key.
- PASS: concurrent identical writes produce one event and a replay; concurrent
  independent expenses cannot overspend. These use separate real connections and
  PostgreSQL row locks, not mocks.
- PASS: backdated shortfalls, reversing spent funding and invalid historical
  corrections fail atomically. Same-day receipt corrections retain funding order.
- PASS: SQL UPDATE/DELETE of journal history and incomplete/unbalanced events are
  rejected by PostgreSQL constraints/triggers.
- PASS: foreign-owned account/category/transaction references return 404 without
  mutation; history filters do not reveal existence of foreign UUIDs. Financial
  history cannot be PATCHed or deleted.
- PASS: anonymous access is 401; authenticated writes without CSRF are 403.
- PASS: a real socket HTTP registration/login/session flow posted receipts,
  expenses, a transfer and a linked refund, reconciled SQL totals, and verified
  logout denial.
- PASS: the development database privilege audit after migration 0003 reported
  RLS enabled and `anon`/`authenticated` SELECT denied on users, sessions and all
  five ledger tables. The isolated database test also verifies `service_role` has
  no SELECT privilege on these tables. This is actual PostgreSQL metadata evidence.

## Requested runtime verification

The entry environment only supplied Python 3.14.4. Official Python 3.13.16 source
was downloaded from python.org and its SHA-256 checked against the release page:
`f4b1bfb3c79b5bb11b8d228a12504163b4c0dab4d679828d8f5f26b6cb6ab35d`.
The temporary build and virtual environment live under `/tmp`, preserving system
Python and `backend/.venv`. Ubuntu development headers were downloaded/extracted
under `/tmp`; no system package installation was performed. The exact existing
requirements lock installed successfully.

The first 3.13 check and pytest startup both exited 1 because the local interpreter
build lacked `_ctypes`, which psycopg requires. This is a runtime build failure,
not a passing test result. The build was completed with libffi headers. A later
import check confirmed ctypes, psycopg 3.3.6 and OpenSSL 3.5.5, exit 0. No test was
skipped or weakened to resolve these startup failures.

| Final gate command | Exit | Observed result |
| --- | --- | --- |
| `/tmp/kivo-venv313/bin/python -m pip check` | 0 | No broken requirements |
| `/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --maxfail=1` | 0 | **107 passed in 423.24 s**, no skips or warnings |
| `/tmp/kivo-venv313/bin/python backend/manage.py check` | 0 | No issues |
| `/tmp/kivo-venv313/bin/python backend/manage.py makemigrations --check --dry-run` | 0 | No changes detected |
| `/tmp/kivo-venv313/bin/python backend/manage.py showmigrations ledger users` | 0 | Ledger 0001–0003 and users 0001–0002 applied |
| `/tmp/kivo-venv313/bin/python backend/manage.py migrate --plan` | 0 | No planned operations |
| `/tmp/kivo-venv313/bin/python backend/manage.py spectacular --validate --fail-on-warn --file /tmp/kivo-phase-03-openapi.yaml` | 0 | Valid schema, no warnings |
| `/tmp/kivo-venv313/bin/ruff check .` | 0 | All checks passed |
| `/tmp/kivo-venv313/bin/ruff format --check .` | 0 | 62 files already formatted |

The 107-test gate includes the original regression suite, privacy migration,
rejection of TLS downgrades, financial security/concurrency tests and real socket
HTTP lifecycle. The development journal contains no test financial records.
Destructive cleanup remained in `test_postgres`. No Phase 5 work was started.

## Regression after Phase 4 integration

The final complete suite, including all Phase 1–3 regressions and Phase 4, ran as
`/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --maxfail=1 --tb=short`:
exit **0**, **129 passed in 837.26 seconds**, no skips or warnings. All six
ledger/funds migrations are applied on development Supabase, and the migration
plan is empty. See the [Phase 4 report](phase-04-verification.md) for final commands,
resolved intermediate failures and deployment/retention limitations.
