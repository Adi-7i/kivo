# Kivo Backend v1.0 — final hardening report

Date: 2026-10-27. **NOT READY / PARTIALLY COMPLETE.** Source/configuration fixes
and safe checks are complete for the available environment. Required isolated
regression, production-host controls, least-privilege remediation and recovery
verification remain blocked or failing. No release/cutover is authorized by this
report. This is a hardening pass, not a new development phase or rewrite.

## Environment and preserved workspace

Verified physical and Git root `/home/lucifer/Desktop/kivo`; `UTA-TESTING` at
`e5fe3a8e3843844c1fd688a3c161e293b6869132`; clean initial status. Backend and
frontend locations verified, existing Python 3.14.4 environment retained. No
dependency installation, frontend source change, production mutation, migration
application, privilege change, secret rotation, database reset, DNS change,
deployment, worktree, project copy or automatic commit occurred. Root `.env`
remains ignored/mode 600. All persistent implementation resides in this Git root.

See [audit](backend-readiness-audit.md), [security](security-verification.md),
[database plan](database-and-migration-plan.md), [deployment](deployment-runbook.md)
and [recovery](backup-and-recovery.md) for findings and approval procedures.

## Implemented changes

- Fail explicitly and safely on an existing unreadable environment file.
- Preserve explicit TLS root certificates; reject repeated/empty TLS options.
- Require an explicitly authorized, isolated PostgreSQL target before pytest DB
  setup; retain all earlier engine/target/mirror safety checks.
- Extend the real privilege audit to reject DDL and forbidden table/column/user
  privilege mutations. Add a repeatable-read catalog/migration snapshot command.
- Prepare **unapplied** migration `ledger.0009_private_financial_helpers` to revoke
  client/PUBLIC financial helper execution. SQL generation verified; application
  and runtime compatibility require the approved staging target.
- Add repository-owned repeatable checks and scoped private-value scanning.
- Prepare nginx/systemd/environment templates and six linked release documents.

No financial calculation, classification, FIFO, ledger, reserve, API serializer
or frontend implementation changed. The OpenAPI contract remains 68 paths and
84 operations. The new migration changes permissions only when explicitly applied.

## Actual execution ledger

Commands run from the root unless stated. `P` below means the actual
`backend/.venv/bin/python`; `R` means `backend/.venv/bin/ruff`. These abbreviations
are documentation only, not installed shell aliases. Individual subprocess
commands, stdout/stderr and real exit codes are retained in ignored local JSON.

| Actual command | Exit | Observed result |
| --- | --- | --- |
| `P -m pytest -m unit -q --junitxml=.pytest_cache/production/baseline-unit.xml` | 0 | Baseline 174 passed, 140 deselected, 3.57s |
| `P -m pytest tests/test_environment_loading.py tests/test_db_config.py -q --junitxml=.pytest_cache/production/config-before.xml` | 1 | 4 failed, 10 passed, 0.10s; reproduced configuration defects |
| `P -m pytest tests/test_environment_loading.py tests/test_db_config.py tests/test_database_test_safety.py -q --junitxml=.pytest_cache/production/config-after.xml` | 0 | 18 passed, 0.06s |
| `P scripts/diagnostics/run_release_checks.py offline` (final) | 0 | Checks below; artifact `offline-1793112413120349087.json` |
| `P backend/manage.py check` | 0 | Zero issues |
| `P backend/manage.py spectacular --validate --fail-on-warn --file .pytest_cache/production/openapi.yaml` | 0 | Strict schema validation, 68 paths / 84 operations |
| `R check .`; `R format --check .`; `P -m pip check` | 0 each | Lint/format clean; no broken requirements |
| `P -m pytest -m unit -q --junitxml=.pytest_cache/production/final-unit.xml` | 0 | Final 187 passed, 140 deselected, 3.15s |
| `P -m pytest --collect-only -q` | 0 | 327 collected; collection is not execution |
| `P -m pytest -q --maxfail=1 --tb=short --junitxml=.pytest_cache/production/full-regression-final-blocked.xml` | 1 | 1 setup error, 0 tests passed/skipped; stopped before DB setup due missing isolated-target authorization; remaining 326 not run |
| `P scripts/diagnostics/run_release_checks.py production-profile` | 0 | Synthetic HTTPS host/origin/random secret; `check --deploy --fail-level WARNING` 0; not actual deployment environment |
| `P scripts/diagnostics/run_release_checks.py database` (final, authorized network) | 1 | Aggregate nonzero because privilege gate fails; artifact `database-1793112438965638412.json` |
| `P backend/manage.py diagnose_database --samples 3` | 0 | Actual DNS/TLS/SELECT/session evidence |
| `P backend/manage.py inspect_release_database` | 0 | Applied users.0003, valid index/no duplicates; only new ledger.0009 pending |
| `P backend/manage.py makemigrations --check --dry-run` | 0 | No model-state changes |
| `P backend/manage.py showmigrations`; `P backend/manage.py migrate --plan`; `P backend/manage.py sqlmigrate ledger 0009` | 0 each | Read-only plans/SQL inspected; nothing applied |
| `P backend/manage.py audit_database_security` | 1 | Two administrative roles, 36 owned tables, CREATE/forbidden mutations, helper privacy failure |
| `P backend/manage.py reconcile_ledger` | 0 | 590 events balanced and match expected posting multisets |
| `pnpm typecheck`; `pnpm lint` in `kivo-frontend` | 0 each | Completed successfully; shell emitted stream-FD permission diagnostics |
| `pnpm test` in `kivo-frontend` | 0 | 431 passed / 64 files, 72.37s; isolated frontend tests |
| `node node_modules/next/dist/bin/next build` in `kivo-frontend` | 0 | Next 16.4.2 build completed; compile 3.2s, TypeScript 4.6s, 25 generated entries |
| `P scripts/diagnostics/scan_release_secrets.py` | 0 | 599 non-ignored workspace files and 44 built browser JS files, 2 configured private patterns, 0 matched paths; excludes Git history |
| `P scripts/diagnostics/probe_database_connectivity.py --samples 30` (authorized network) | 0 | 30 read-only samples, 0 failures; 44.301s overall |
| `systemd-analyze verify --man=no .pytest_cache/production/kivo-backend.service` | 1 | Actual validator: Gunicorn executable absent; no unit start/install |
| `git status --short --untracked-files=all`; `git diff --check` | 0 | Original-root inventory reviewed; no whitespace errors |

Database runner subprocesses set read-only PGOPTIONS and diagnostic bounds.
The first sandbox DB runner failed network checks; its artifact
`database-1793112033968686670.json` is retained. Its makemigrations returned 0
despite failed history-connectivity warning; it is not database verification.
Network-authorized reruns supplied actual connection evidence. Initial standalone
probe also failed sandbox DNS (exit 1), then passed with authorized network.
Systemd's first sandbox attempt failed on restricted sockets; the external
read-only validator then identified the genuinely missing executable.

An intermediate offline run exited 1: 182 unit passes, 1 failure because an
existing mocked audit cursor lacked the new query results. The fixture was
updated and expanded to independently exercise the new failing privilege gates;
its helper-exposure assertion is preserved. The final unit count is 187. No
test was disabled or assertion weakened to obtain a pass.

Final source checks and the full regression attempt were run after the last
source/config/migration edits. Subsequent changes are documentation only. A
targeted/unit pass does not replace the blocked full regression. No current
mutating PostgreSQL integration, full browser, load or restore pass is claimed.

## Current database, integrity and reliability findings

The inspected existing application/development connection is direct IPv6,
PostgreSQL 17.11, TLS true, `sslmode=require`, maximum 60 connections.
Production target identity is not independently provided. users.0003 was already
applied before this pass; no duplicate groups exist. Catalogs show no invalid
indexes/unvalidated constraints/disabled public triggers in the observed snapshot.

Configured runtime privileges are unsuitable for production. RLS/client table
and sequence privacy pass; callable `kivo_expected_postings(bigint)` remains
exposed by EXECUTE grant. Function invoker semantics and revoked table grants
mean this audit does not establish an actual disclosure exploit. The prepared
migration and runtime-role plan remain approval dependent.

All **590 current journal events** pass real reconciliation. Full FIFO, rent,
reporting, concurrency, atomic rollback, IDOR and session persistence verification
must still run on isolated PostgreSQL. Existing same-owner atomic locks and
durable retry receipts remain unchanged. The historical rent-reserve timeout and
2026-10-26 shared-bill commit at 31,014ms are retained open reliability evidence;
no current financial write was retried to investigate them. See the historical
[Part 6 report](../integration/part-06-budgets-reports-export-verification.md).

Initial three-sample direct read-only probe: initialization 1485.601ms;
SELECT min/median/p95/max **196.524/228.351/229.017/229.017ms**, 3 successes,
0 failures, 0 blocked of 7 sessions, 0 retransmission increase; trivial server
execution 0.020ms. This tiny serial sample does not certify a latency SLO or
resolve the timeout. The final 30-sample serial development probe completed in
44.301s with 0 failures: min/median/p95/max
**178.307/228.343/277.929/298.347ms**, connection initialization 1436.379ms,
0 retransmission increase and 0 suspend delta. Server execution of the trivial
SELECT was 0.019ms. Artifact:
`kivo-frontend/.playwright-auth/connectivity-20261027T144900Z-1793112540915576057-direct.json`.
Conditions: one requesting client, one persistent direct IPv6 connection, TLS,
read-only sessions and no application HTTP requests or financial writes.
Neither interval is a concurrent staging load test. No endpoint, application
timeout, retry or pool-size change was made.

## Seven mandatory gates

| Gate | Outcome | Reason |
| --- | --- | --- |
| G1 Authentication & authorization | BLOCKED | Fresh actual-PostgreSQL and production-origin lifecycle/IDOR/rate-limit evidence unavailable |
| G2 Functional completeness | BLOCKED | Full integrated backend/browser workflows not rerun on authorized staging |
| G3 Financial data integrity | NOT VERIFIED | 590 journal events reconcile; full FIFO/rent/report/concurrency gate remains outstanding |
| G4 Database readiness | FAIL | Overprivileged configured runtime, helper exposure, unapplied new permission migration, no approved production role |
| G5 Security | FAIL | Least-privilege release blocker unresolved; deployed HTTPS/shared enforcement unverified |
| G6 Reliability & performance | BLOCKED | Current full regression blocked; historical deadline violations unresolved; staged capacity unmeasured |
| G7 Operational readiness | BLOCKED | Actual production server/ingress/secrets and backup/restore drill not verified |

## Required operator inputs and approvals

Provide private file paths/variable names for an authorized separate test/staging
connection, approved mutating/load-test scope and independent restore target.
Do not paste secrets. The target must not be the current application database;
review whether test database creation/drop privileges affect a production cluster.
Test flags are an explicit safety acknowledgement, not a grant of authority.

Provide actual hosting/origin/TLS topology, production runtime/migration
principals and Supabase plan/backup evidence. Approve exact role/ACL and helper
migration changes after isolated validation; approve required server/client tool
installations and any later deployment separately. Full regression, actual
runtime-role workflows, HTTPS/security matrix, staging load and isolated restore
must all pass before changing the release conclusion.

## Complete changed-file inventory

Baseline clean; **6 modified tracked files and 15 new files**, 21 total. Generated
build/evidence/cache files are excluded. No frontend source files changed.

Modified:

- `backend/common/db.py`
- `backend/common/env.py`
- `backend/common/management/commands/audit_database_security.py`
- `tests/conftest.py`
- `tests/test_database_diagnostics.py`
- `tests/test_db_config.py`

New:

- `backend/apps/ledger/migrations/0009_private_financial_helpers.py`
- `backend/common/management/commands/inspect_release_database.py`
- `deploy/backend.env.example`
- `deploy/kivo-backend.service.example`
- `deploy/nginx.conf.example`
- `scripts/diagnostics/run_release_checks.py`
- `scripts/diagnostics/scan_release_secrets.py`
- `tests/test_database_test_safety.py`
- `tests/test_environment_loading.py`
- `docs/production/backend-readiness-audit.md`
- `docs/production/security-verification.md`
- `docs/production/database-and-migration-plan.md`
- `docs/production/deployment-runbook.md`
- `docs/production/backup-and-recovery.md`
- `docs/production/final-release-report.md`

Final Git inventory matches this list; all 21 paths resolve inside the original
root. Tracked diff: 99 insertions / 11 deletions across six files (excludes the
15 new files). Whitespace and relative-document links were checked separately
for new files as well. Evidence is
local ignored `.pytest_cache/production/` and the existing ignored frontend
private artifact directory; source diagnostics remain in `scripts/diagnostics/`.
No required implementation exists only in temporary storage.
