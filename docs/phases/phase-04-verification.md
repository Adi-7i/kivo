# Phase 4 verification: funding batches and account-aware FIFO

Date: 2026-10-16. Status: PASS. The dedicated Phase 4 gate and final complete
regression passed on Python 3.13.16 against actual remote PostgreSQL.

## Scope and changed files

- `backend/apps/funds/models.py`: permanent source identities; immutable runs,
  capacities, account holdings, allocations and explicit allocation gaps.
- `backend/apps/funds/engine.py`: typed pure account-aware FIFO implementation,
  partial allocations, transfer lineage, refund restoration and exhaustion math.
- `backend/apps/funds/services.py`: owner-locked atomic recomputation, retained
  revisions, deterministic input provenance and read-only reconciliation.
- `backend/apps/funds/selectors.py`, `serializers.py`, `views.py`, `urls.py`:
  paginated owner-scoped batch, allocation, journey, breakdown and summary APIs.
- `backend/apps/funds/migrations/0001_initial.py`, `0002_attribution_guards.py`,
  `0003_fix_position_guard.py`: additive PostgreSQL schema, ownership/conservation
  constraints, immutable audit rows, RLS and restricted Supabase client privileges.
- `backend/apps/funds/management/commands/rebuild_funds.py`: explicit legacy
  backfill and `--check` reconciliation; never rewrites financial postings.
- `backend/apps/ledger/services.py`, `exceptions.py`, `selectors.py`: explicit
  ledger-to-attribution orchestration and one-statement financial summary totals.
- `tests/test_fifo_engine.py`, `test_funds.py`, `test_ledger.py`,
  `test_finance_http.py`, `test_database_privacy.py`: actual engine, PostgreSQL,
  HTTP, isolation, concurrency, incomplete history and security verification.
- Settings/routes, README, ADR-004 and this report document actual integration.

The preceding Phase 3 added `backend/apps/ledger/` models, migrations, exact money
fields, services, selectors, serializers, APIs and reconciliation; request/log
correlation in `backend/common/observability.py`; TLS enforcement in `common/db.py`;
isolated database test guards; Python >=3.13 metadata; and corresponding tests,
README, ADR-003 and Phase 2/3 evidence reports. Existing authentication is preserved.

## Executed verification evidence

All tests below use Python 3.13.16, Django 6.1.2, DRF 3.18.3, psycopg 3.3.6 and
the configured remote Supabase PostgreSQL server. DB tests use the separate
`test_postgres` database; pure engine tests are unit evidence, not presented as
PostgreSQL integration tests. No SQLite/local PostgreSQL fallback or mocked
database integration is used.

| Executed check | Exit | Observed result |
| --- | --- | --- |
| Phase 3 prerequisite full regression | 0 | 107 passed before Phase 4 began; see Phase 3 report |
| `python -m pytest -v tests/test_fifo_engine.py` | 0 | 13 passed, 0.07 s; actual production allocation function |
| First ledger/FIFO PostgreSQL integration run | 1 | 1 failed, 30.70 s; shared trigger referenced a gap-only column on a position row |
| Same three integration scenarios after additive migration 0003 | 0 | 3 passed, 71.09 s |
| First dedicated Phase 4 gate | 1 | 1 failed, 34.79 s; breakdown expression needed explicit BigIntegerField output |
| Dedicated Phase 4 gate after expression fix | 0 | **25 passed in 390.70 s**, no skips or warnings |
| `python backend/manage.py sqlmigrate funds 0001 --no-color > /tmp/kivo-funds-0001.sql` | 0 | Reviewed additive schema, constraints and indexes |
| `python backend/manage.py migrate --plan` | 0 | Reviewed funds 0001–0003 before development application |
| `python backend/manage.py migrate --noinput` | 0 | Funds 0001, 0002 and 0003 applied successfully on authorized development Supabase |
| `python backend/manage.py rebuild_funds --all` | 0 | Rebuilt attribution for 0 development owners; no fabricated fixture data |
| `python backend/manage.py rebuild_funds --all --check` | 0 | Checked 0 development owners without modifying ledger data |
| `python backend/manage.py reconcile_ledger` | 0 | 0 development financial events reconcile; populated tests supply financial evidence |
| `python backend/manage.py makemigrations --check --dry-run` | 0 | No changes detected |
| `python backend/manage.py spectacular --validate --fail-on-warn --file /tmp/kivo-phase-04-openapi.yaml` | 0 | Schema validated without warnings |
| `ruff check .` | 0 | All checks passed |
| `ruff format --check .` | 0 | 78 files already formatted |

The dedicated gate command was:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_funds.py tests/test_fifo_engine.py tests/test_database_privacy.py tests/test_finance_http.py tests/test_ledger.py::test_concurrent_retries_and_overspending_use_real_row_locks --reuse-db --maxfail=1
```

The subsequent final full regression also includes the added source-correction and
void traceability test. Its result and final check exits are recorded below.
No existing tables or migrations were reset to resolve failures. The trigger
repair is a new forward migration, and the breakdown fix retains integer money.

The first two final-regression attempts could not initialize the remote test
database: exit 1 with one setup error in 10.36 s (DNS resolution) and 10.99 s
(connection timeout). They establish no passing tests. Concurrent read-only
`showmigrations` and `migrate --plan` attempts also exited 1 from connectivity
failures. A later explicit DNS resolution and real PostgreSQL TLS `SELECT 1`
succeeded, exit 0. The full suite and migration-state checks were then retried
without changing tests, credentials, endpoints or database isolation.

## Financial and security results

- PASS, PostgreSQL/API scenario A: receive 1,000 then 500, spend 1,200; first batch
  allocated 1,000, second allocated 200, second remaining 300.
- PASS, PostgreSQL/API scenario B: receipt October 16, full allocation by October
  21; remaining 0, exhaustion October 21, inclusive duration 6 calendar dates.
- PASS, PostgreSQL/API scenario C: bank-to-cash transfer preserves combined money,
  creates no duplicate batch, consumes no global source capacity and retains the
  original funding UUID when spending from cash.
- PASS: partial depletion, stable same-day order, earlier effective dates,
  backdated receipts, expense correction/reversal and retained historical runs.
- PASS: refunds restore original source allocations, reduce net expense and do not
  become income or new source batches. Restored capacity clears exhaustion.
- PASS: concurrent retries create one event and one allocation revision; concurrent
  independent expenses cannot overspend or overallocate. Workers use real separate
  PostgreSQL connections. Current snapshots reconcile to actual ledger postings.
- PASS: negative/excess source capacity and cross-owner snapshots are rejected by
  database guards. Snapshots cannot be updated. Foreign batch/run/event UUIDs are
  not disclosed or mutable through APIs.
- PASS: deliberately imported unfunded legacy history produces explicit gaps and
  an incomplete snapshot, preserves the real negative ledger amount and provides
  no exhaustion date. Strict recomputation and new unfunded spending fail.
- PASS: actual HTTP session/CSRF flows query source summary and source journey
  after receipts, expenses, transfer and refund, then enforce logout denial.
- PASS: real PostgreSQL metadata verifies RLS and absence of SELECT, INSERT,
  UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER privileges for `anon`,
  `authenticated` and `service_role` on all 13 checked financial/user/session tables.

## Policies, limits and pending product decisions

See [ADR-004](../decisions/ADR-004-funding-attribution.md) and
[ADR-003](../decisions/ADR-003-financial-ledger.md). FIFO is attribution, not proof
of physical rupee identity. The ledger is the only cash authority. Source
classification is separate from income, and transfers do not exhaust funds.

Provisional funding, cleared overdrafts, manual allocation overrides and recovery
write-offs need explicit product decisions. Safe rejection/incomplete reporting
is implemented. Full replay and retained snapshots have storage/write costs as
history grows; no throughput benchmark is claimed. The development credential has
schema/test-database privileges; production deployment must use a deliberately
provisioned runtime role. The temporary Python 3.13 verification environment is
under `/tmp`; the existing Python 3.14 development environment was preserved.

## Final full regression and audit

```bash
/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --maxfail=1 --tb=short
```

Exit **0**: **129 passed in 837.26 seconds (13:57)**. No skipped tests, errors or
warnings in this final run. The previously failing connectivity attempts were
retried after an actual TLS query succeeded; their failures remain recorded above.
No implementation or tests were weakened to obtain the final passing result.

| Final command/check after implementation changes | Exit | Observed result |
| --- | --- | --- |
| `/tmp/kivo-venv313/bin/python backend/manage.py check` | 0 | No issues |
| `/tmp/kivo-venv313/bin/python backend/manage.py makemigrations --check --dry-run` | 0 | No changes detected |
| `/tmp/kivo-venv313/bin/python backend/manage.py showmigrations` | 0 | All existing migrations and all six new ledger/funds migrations applied |
| `/tmp/kivo-venv313/bin/python backend/manage.py migrate --plan` | 0 | No planned migration operations |
| `/tmp/kivo-venv313/bin/python backend/manage.py spectacular --validate --fail-on-warn --file /tmp/kivo-phase-04-openapi.yaml` | 0 | Valid OpenAPI, no warnings |
| `/tmp/kivo-venv313/bin/ruff check .` | 0 | All checks passed |
| `/tmp/kivo-venv313/bin/ruff format --check .` | 0 | 79 files already formatted |
| `git diff --check` | 0 | No whitespace errors |
| Python AST signature audit of new financial/observability modules | 0 | All function signatures annotated; no static type-checker claim |
| Generated OpenAPI contract inspection | 0 | 17 financial/fund paths; money fields are strings and absent capacities are nullable |
| Final development PostgreSQL privilege query | 0 | `(13, True, False, False, False)`: 13 tables, all RLS enabled, no checked table privilege for any Supabase client role |

The final full run specifically passes source correction and void traceability:
the original batch remains available as inactive history, the replacement retains
same-day funding order, and voided sources do not receive invented exhaustion dates.
All financial reconciliation, security, audit, idempotency and concurrency scenarios
above also pass in the full regression after Phase 4 integration.

Phase 3: PASS. Phase 4: PASS. Outstanding verification blockers: none.
Phase 5 readiness: READY for a separately authorized implementation phase.
Phase 5 implementation: not started.
