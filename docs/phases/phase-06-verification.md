# Phase 6 verification: budgets, dashboard, analytics and CSV

Date: 2026-10-17. Status: **PARTIALLY COMPLETE**. Required features are implemented and the
financial/API cases passed, but a clean full-suite gate remains outstanding.
The user has now approved the Phase 5 friend-paid rent reserve policy; the
targeted fix/evidence is recorded in the addendum below. Earlier pending-policy
statements describe the prior verification run.
Phase 7 readiness: **NOT READY**. No Phase 7 implementation.

## Scope and prerequisite provenance

The renewed user directive explicitly requests Phase 6 implementation. The entry
commit is `874bfe2`, containing the approved Phase 5 lending, borrowing, repayment,
shared-bill, owner-paid shared-rent and FIFO v2 workflows. Earlier inspection at
`59aaad8` found those missing; that historical BLOCKED assessment and its 39-test
Python 3.14 diagnostic run do not describe the current code. Original recognition
and FIFO decisions were subsequently approved, documented and implemented.

The preceding Python 3.13 domain gate passed **22 tests in 641.49 seconds** before
final Phase 5 batching/concurrency additions. Its later 185-test full run was
interrupted across turns: no final exit/JUnit artifact was available, so no full
pass is inferred. The combined run below records fresh regression evidence. The separate pending
friend-paid landlord-bill/rent-obligation reserve policy remains explicit in
[ADR-005](../decisions/ADR-005-personal-sharing-and-rent.md); Phase 6 does not assign
that financial write rule or claim that path works. Phase 5 remains partially
complete until its mandatory pending matter is resolved.

Reviewed AGENTS.md, README, ADRs 001–005, existing API/schema configuration and
Phase 1–5 reports; inspected real journal, FIFO, sharing/rent/reserve, auth,
migrations and test code. PRD, Backend Blueprint and Final Development Suite
files are absent; no review of unavailable material is claimed. Follow the
[implementation plan](phase-06-plan.md) and [ADR-006](../decisions/ADR-006-budgets-and-reporting.md)
for actual reporting semantics and limits.

## Implemented features and files

- `backend/apps/reports/models.py`, `services.py`: owned overall/category monthly
  and custom-period budgets; archival, warning configuration, nonoverlapping
  active scopes, durable retry protection and existing atomic owner locking.
  PostgreSQL appends immutable before/after configuration audit rows.
- `reports/selectors.py`: SQL-derived budget progress, current liquid/claim/rent
  and reserve dashboard, net personal expense, classified gross external cash
  flow, averages, highest spending day, calendar trends and additive breakdowns.
  No editable/cached financial totals or second balance system.
- `reports/serializers.py`, `views.py`, `urls.py`: versioned budget, dashboard,
  summary, trends, breakdown, fund-source integration and CSV contracts. Funds
  reuse immutable v1/v2 runs and expose separate expense, refund, principal,
  advance, recovery and transfer attribution amounts.
- `backend/apps/ledger/history.py` and existing `ledger/views.py`: one strict
  shared filter contract, exact/preset/inclusive ranges, participant/contact
  search, merchant/payment filters, backwards-compatible multi-field ordering
  and deterministic tie IDs. No duplicate history endpoint or posting engine.
- `reports/export.py`: streaming UTF-8/BOM CSV, chunks of 200, related-resource
  preloading, formula escaping, precise INR, retained status and explicit net
  contribution columns for reversal-safe reconciliation.
- `backend/config/settings/base.py`, `config/urls.py`: app and v1 routes only;
  authentication, environment DB configuration and dependencies are preserved.
- `tests/test_reporting.py`, `test_reporting_concurrency.py`, extended
  `test_finance_http.py` and `test_database_privacy.py`: actual financial/API,
  isolation, filtering, export, concurrency and query-count scenarios.
- README, ADR-006, plans and phase reports document scope and actual evidence.

| Endpoint | Implemented behavior |
| --- | --- |
| `/api/v1/budgets/` | GET paginated / POST with Idempotency-Key |
| `/api/v1/budgets/{uuid}/` | GET progress / PATCH configuration and archival |
| `/api/v1/dashboard/` | Current source-derived balances, spending, claims, rent, budget progress, earmarks, safe-to-spend and activities |
| `/api/v1/transactions/` | Existing API extended with shared strict filters/search/stable pagination |
| `/api/v1/reports/summary/` | Net expense, cash-flow classifications, counts, average, highest day and comparison |
| `/api/v1/reports/trends/` | Day, Monday-based week or month aggregation |
| `/api/v1/reports/breakdown/` | Category, merchant, account, payment method or primary contact |
| `/api/v1/reports/funds/` | Paginated existing batch snapshots with classified attribution movements; owned historic run selection |
| `/api/v1/reports/export/` | Authorized filtered CSV with exact net contribution columns |

## Environment and database evidence

Target commands use `/tmp/kivo-venv313/bin/python` (**Python 3.13.16**), with the
unchanged locked Django 6.1.2/DRF 3.18.3/psycopg 3.3.6 dependencies. This is the
restored temporary environment documented in the Phase 5 report, not a Python
3.14 compatibility substitution. No dependency or credential file was changed.

The configured remote Supabase TLS PostgreSQL development database is used for
additive migrations/read-only checks. Destructive tests use the distinct existing
remote `test_postgres` database, guarded by `tests/conftest.py`; no SQLite/local
PostgreSQL, mocks presented as integration, reset or migration-history deletion.

One new migration: `reports.0001_initial`. Its creation transaction adds two
budget/audit tables, owner/period indexes and amount/date/threshold constraints;
locks owners and validates category ownership, monthly calendars and active
scope overlap; protects identity/history; automatically audits raw SQL updates;
enables RLS and revokes PUBLIC/anon/authenticated/service_role table privileges.
There are no new integer sequences. Applied existing ledger/fund migrations were
not edited.

| Executed command/check | Exit | Actual result |
| --- | --- | --- |
| `python --version` using target prefix | 0 | Python 3.13.16 |
| Sandbox `makemigrations reports --dry-run`, then `makemigrations reports` | 0 / 0 | Migration generated; both warned that sandbox DNS prevented migration-history verification |
| Network-enabled `makemigrations --check --dry-run` | 0 | No model drift, actual history connection |
| Network-enabled `migrate --plan` | 0 | Only additive reports 0001 planned; inspected before application |
| Sandbox `sqlmigrate reports 0001` | 1 | DNS resolution failure; not a database verification pass |
| Network-enabled `sqlmigrate reports 0001` | 0 | Inspected generated schema, guards, audit and privacy SQL |
| Network-enabled `migrate --noinput` | 0 | reports.0001_initial applied successfully in development |
| Initial strict OpenAPI generation | 1 | Duplicate Breakdown component name warning; fixed by naming the report schema explicitly |
| Repeated `spectacular --validate --fail-on-warn --file /tmp/kivo-phase-06-openapi.yaml` | 0 | Expanded actual contracts validate with no warnings |
| Pure Phase 6 `pytest ... -m 'not django_db'` | 0 | 25 passed, 10 deselected in 0.19 s; after pagination addition, 25 passed, 11 deselected in 0.22 s |
| First target PostgreSQL run | 1 | 2 passed, 1 failed in 161.26 s; test reserve request omitted existing required reason |
| Corrected request, target rerun | 1 | 2 passed, 1 failed in 159.21 s; exposed dashboard nullable rent-status exclusion bug |
| Rent selector repair / remaining targeted run | 0 | **38 passed, 2 deselected, 0 failed, 0 skipped in 435.15 s**; 25 pure tests and 13 database-backed tests including concurrency |
| Intermediate Django check / Ruff check / Ruff format / whitespace | 0 | No system issues; lint clean; 123 files formatted; whitespace clean |
| Final Django check | 0 | No system issues |
| Final Ruff check / format check | 0 / 0 | Lint clean; 123 files already formatted |
| Final strict OpenAPI validation | 0 | `/tmp/kivo-phase-06-final-openapi.yaml`, no warnings |
| Generated contract assertions | 0 | Required routes, string money, required budget retry header and text/csv media type verified |
| Final migration drift / plan / readback | 0 / 0 / 0 | No model changes or pending migrations; ledger 0001–0008, funds 0001–0005, sharing 0001–0003 and reports 0001 applied |
| Final read-only ledger / FIFO / rent audits | 0 / 0 / 0 | Development contains 0 financial events/owners/obligations/reserves; operational checks, not populated financial evidence |
| First combined 224-test run | 2 | Stale process after turn interruption; explicitly stopped, no tests completed in its observed 635.85 s result; no passing gate |
| Second combined 224-test run | 2 | 37 passed in 345.12 s before deliberate restart to include strengthened performance cases; not a completed gate |
| Strengthened current-budget / multi-chunk CSV checks | 0 | 2 passed in 84.88 s; six current budgets correct, 202 streamed events reconcile with actual ledger/FIFO |
| Full combined 225-test run | **1** | **224 passed, 1 failed, 0 skipped in 2670.94 s**; real HTTP failed on a Supabase session-connection timeout during `/categories/`, before Phase 6 calls |
| Focused real HTTP / corrected CSV measurement rerun | **0** | **2 passed, 0 failed, 0 skipped in 268.92 s**; complete genuine session/CSRF HTTP financial + Phase 6 flow, CSV query count corrected and verified |

The reserve test now supplies its required audit reason. The dashboard bug was
repaired by explicitly retaining obligations with no status-change record;
assertions were kept. Neither failure was hidden or weakened. Some earlier
passing target results preceded later filter/fund-report refinements, so they
are intermediate evidence, not a final completion claim.

Actual test commands (all from the repository root):

```bash
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_reporting.py -m 'not django_db' --tb=short
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_reporting.py tests/test_database_privacy.py --reuse-db --maxfail=1 --tb=short --junitxml=/tmp/kivo-phase-06-targeted.xml
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_reporting.py tests/test_reporting_concurrency.py tests/test_database_privacy.py --reuse-db --maxfail=1 --tb=short --junitxml=/tmp/kivo-phase-06-targeted-fixed.xml
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_reporting.py tests/test_reporting_concurrency.py tests/test_database_privacy.py -k 'not reporting_distinguishes and not shared_recognition' --reuse-db --maxfail=1 --tb=short --junitxml=/tmp/kivo-phase-06-targeted-rent-fixed.xml -o junit_logging=system-out
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_reporting.py::test_budget_aggregation_query_count_does_not_grow_per_row tests/test_reporting.py::test_csv_streams_multiple_chunks_without_per_event_queries --reuse-db --maxfail=1 --tb=short --junitxml=/tmp/kivo-phase-06-performance.xml -o junit_logging=system-out
/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --tb=short --junitxml=/tmp/kivo-phase-06-final-225.xml -o junit_logging=system-out
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_finance_http.py::test_real_http_financial_lifecycle tests/test_reporting.py::test_csv_streams_multiple_chunks_without_per_event_queries --reuse-db --tb=short --junitxml=/tmp/kivo-phase-06-http-csv-rerun.xml -o junit_logging=system-out
```

## Financial, security and performance gates

Observed intermediate PostgreSQL passes include the required 1000 received / 800
spent / 200 lent case; owned transfers; borrowing/recoveries without income;
shared 6000 gross / 2000 owner expense; reimbursement and immediate friend-paid
recognition; unpaid rent/reserves/payment reversal; budget warning thresholds,
zero limits and overspending; and refund/backdated correction recalculation.
The full run confirms all 15 required Phase 6 accounting/filter/security scenarios:
1000/800/200 receipt-expense-lending; owned transfer conservation; non-income
borrowing/recovery and non-expense principal; 6000/2000 shared recognition;
unpaid rent; reserves; refunds/reversals; backdated recalculation; inclusive date
boundaries; empty periods; budget thresholds; cross-user isolation; formula
escaping; filtered export reconciliation; and actual FIFO source analysis.
These are executed assertions against the production selectors/domain services,
with real remote PostgreSQL for database cases and pure tests identified as such.

The targeted run passed cross-user isolation, filtered CSV/report equivalence,
formula protection, raw privacy guards, immutable budget audit, row-lock report
consistency and concurrent same/distinct-key budget creation. Measured budget
progress used one SQL aggregate for six budgets with actual expense data. The
observed dashboard baseline used 19 queries with two events and six stored
historical budgets. The strengthened test checks six currently applicable
budgets and observes **20 SQL queries**, including the aggregate for their real
spending. Both assertions and actual count passed.

The multi-chunk case populates 201 balanced ORM expense events after an actual
receipt, retaining PostgreSQL financial guards and invoking the actual solvency
and FIFO services. It verifies all 202 exported events, INR 201 expense and INR
799 cash, with ledger/FIFO reconciliation. Its initial diagnostic printed the
query context after later HTTP calls reset Django's query log, yielding an
invalid zero measurement. That number is not accepted as evidence. The test now
snapshots the count immediately and requires it to be nonzero. The focused rerun
passed with **6 SQL queries for 202 CSV events** across chunks of 200. The earlier
zero diagnostic is superseded, not presented as a performance pass.

The full run completed with 224 passes and one failure. The failure traceback is
an OperationalError connection timeout while loading the database-backed session
for POST `/api/v1/categories/`; urllib observed HTTP 500. No financial assertion
was weakened or application connection configuration changed. The focused rerun
then passed the complete real socket registration/login/CSRF, receipt, expense,
transfer, refund, lending/recovery, shared bill, rent, budget, dashboard, report,
fund-source and CSV flow. Its assertions reconcile INR 590 liquid, INR 180 personal
expense, INR 230 receivables, INR 100 reserved and INR 490 safe-to-spend.

Every implemented test case has passing execution evidence across these runs,
but the successful focused rerun does **not** turn the recorded failed full run
into a clean full-suite exit 0. That mandatory completion gate remains open.
Full-run XML is `/tmp/kivo-phase-06-final-225.xml`; focused evidence is
`/tmp/kivo-phase-06-http-csv-rerun.xml`. The runner persists
`/tmp/kivo-phase-06-final-225.log` and `/tmp/kivo-phase-06-final-225-status.json`
so interruption cannot be mistaken for success. No blocked-test count or
throughput benchmark is invented. Unexecuted gates are not skipped pytest cases.

## Outstanding limitations and decisions

- The formerly pending ADR-005 friend-paid rent reserve policy is now approved.
  The targeted fix preserves earmarks until actual friend settlement; ordinary
  generated rent remains unrecognized until an actual owner/friend payment.
  New verification is recorded in the addendum below.
- Reports identify the configured Asia/Kolkata calendar; no new per-user timezone
  preference or currency conversion was introduced.
- Category budgets cover the exact category. Per-participant filtered shared
  reports can overlap; primary-contact breakdown avoids invented split expense.
- Report/export reads serialize with owner writes. A slow CSV stream holds that
  owner's lock until completion/closure; no unmeasured throughput claim.
- Current dashboard budget detail is capped at 20, with total count and paginated
  budget API for the rest. Source remaining capacity includes receivables, not cash.
- A clean full-suite exit 0 has not been recorded after the transient full-run
  HTTP connection failure. The focused retry passed; the failed run remains FAIL.
  No production-readiness claim is made.

Phase 6 is not claimed complete while mandatory verification or prerequisite
matters remain. Phase 7 readiness is NOT READY; no Phase 7 work was started.

## Final gate assessment

| Gate | Evidence-backed result |
| --- | --- |
| Target Python 3.13 / installed dependencies | PASS |
| Actual additive development migration / no drift | PASS |
| Budget, dashboard, filtering, report and CSV financial assertions | PASS |
| Owner isolation, private PostgreSQL tables and immutable audit | PASS |
| Actual concurrency, duplicate prevention and rollback | PASS |
| Actual HTTP flow | PASS on focused rerun; earlier timeout failure retained |
| Measured query efficiency | PASS for the stated small representative datasets: 1 aggregate / 6 budgets; 20 dashboard queries / 6 current budgets; 6 CSV queries / 202 events |
| Clean full regression command | FAIL: recorded exit 1, 224 passed / 1 failed; targeted retry exit 0 does not rewrite it |
| Phase 5 friend-paid rent/reserve prerequisite | Policy resolved; targeted implementation evidence in the addendum below |
| Phase 6 overall | PARTIALLY COMPLETE |
| Phase 7 readiness | NOT READY |

No pytest cases were silently skipped. Full-run skipped count is 0; the targeted
subset intentionally deselected two cases that subsequently ran in the full
suite. Pending business/gate items are not invented as blocked pytest counts.

## Targeted friend-paid rent reconciliation addendum — 2026-10-17

The user explicitly approved retaining the owner's rent reserve until actual
repayment to the friend, with proportional partial releases and complete release
on final settlement. ADR-005 now documents deterministic protected portions,
multi-reserve rounding and reversal behavior. No new Phase 6 feature is part of
this fix. Source-derived dashboard/reserve selectors use the existing earmark
journal, now with claim/settlement references and reversal-aware activation.

The initial fix-specific run on Python **3.13.16** against isolated remote
PostgreSQL exited **0**, **12 passed in 857.61 s**, **0 failed / 0 skipped**:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_friend_paid_rent.py --reuse-db --maxfail=1 --tb=short --junitxml=/tmp/kivo-friend-rent-initial.xml
```

It verifies cash/reserve INR 3000/2000, 2200/1200 and 1000/0, safe-to-spend INR
1000 throughout, expense INR 2000 recognized once, exact repayment reversals,
corrections, deterministic multiple-reserve release, protected owner-payment
behavior, owner isolation, raw PostgreSQL guards and three actual concurrent
settlement scenarios. The four pure serializer cases separately passed (exit
0, 4 passed / 14 deselected, 0.11 s). Details, migration evidence and subsequent
regression results are in [Phase 5's targeted addendum](phase-05-verification.md#targeted-friend-paid-rent-reserve-fix--2026-10-17).

Migration `sharing.0004_friend_paid_rent_reserves` was inspected and applied to
the authorized development database (exit 0); showmigrations, drift check and
the empty subsequent migration plan each exited 0. There is no destructive
application-database test or reset. Populated assertions use the distinct remote
test database, not mocks or an SQLite substitute.

A clean entire-project regression after this targeted fix is **NOT VERIFIED**.
The earlier full-suite timeout failure is retained above. This task does not
investigate that unrelated timeout or claim Phase 6 complete. Phase 7 readiness
remains **NOT READY**.
