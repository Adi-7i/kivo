# Phase 7 verification — backend audit and remediation

Execution dates: 2026-10-18–19. Current status: **NOT READY**.
This report records executed evidence, including failed attempts. It does not
inherit passing release gates from earlier phase reports.

## Workspace and runtime

- `pwd -P` and `git rev-parse --show-toplevel` both returned
  `/home/lucifer/Desktop/kivo`; `ls -ld` confirmed the exact lowercase directory.
- Baseline `git status --short` was empty. No existing user modifications existed.
- An exclusively created disposable `.phase07-write-probe-*` file in `backend/`
  was written, read back, and removed successfully inside the configured sandbox.
  The probe was repeated after the user's runtime clarification. No source copies,
  worktrees, clones, or alternative development directories were created.
- Active interpreter: `/home/lucifer/Desktop/kivo/backend/.venv/bin/python`,
  **Python 3.14.4**. Installed Django **6.1.2**, DRF **3.18.3**, psycopg **3.3.6**,
  drf-spectacular **0.30.0**, django-filter **26.2**, pytest **9.1.1**,
  pytest-django **4.14.0**, Ruff **0.17.1**. Installed `Requires-Python` metadata
  accepts the active runtime for each package; `python -m pip check` exited 0.
- All 25 installed locked distributions' license metadata/classifiers were
  inspected with `importlib.metadata` (exit 0). Declarations include BSD, MIT,
  Apache, PSF and psycopg's LGPL-3.0-only. This is metadata provenance, not a legal
  approval or a vulnerability-database scan. The initial ad-hoc metadata probe
  exited 1 on an absent license string; a corrected read-only probe inspected
  all 25 packages without changing the environment.
- The latest user instruction authorizes testing this existing runtime. No
  runtime/dependency upgrades, downgrades, replacements, or installations occurred.
  Before that clarification an official Python source archive download completed;
  no build or environment was created. A sandboxed header download failed, and
  its proposed escalated retry was interrupted. That abandoned work is not used.
- AGENTS.md, README, ADRs 001–006, Phase 1–6 records and implementation/tests were
  inspected. The governing documents were initially missed by searches limited
  to the repository/Desktop. A later Documents/Downloads search located them;
  they were then read using existing `pdftotext` and Python ZIP/XML tools, with
  extraction sent to stdout rather than temporary development files:
  `/home/lucifer/Documents/kivo/Kivo_Final_Development_Suite_v1.0.pdf` (22 pages),
  `Kivo_Full_Product_Requirements_Document_v1.0.pdf` (20 pages), and
  `Kivo_Backend_Development_Technology_Document_v1.0.docx` in that directory.
  This review occurred after the first remediation changes, not before coding;
  the late-discovered contract gaps and follow-up verification are recorded below.
  The latest user directive controls path/runtime, and later explicitly approved
  accounting policies in ADRs 003–006 remain in effect.
- New test artifacts use the repository's ignored `.pytest_cache/phase07/`;
  source and persistent documentation live only in the original repository.

## Baseline execution

All Python/Ruff commands use `backend/.venv/bin/` unless explicitly qualified.

| Command/check | Exit | Observed result |
| --- | --- | --- |
| `python backend/manage.py check` | 0 | No issues |
| `ruff check .` | 0 | All checks passed |
| `ruff format --check .` | 0 | 148 files formatted |
| `python -m pytest --collect-only -q` | 0 | 245 existing tests collected |
| Read-only remote PostgreSQL/TLS probe inside sandbox | 1 | DNS resolution blocked |
| Same probe with network authorization | 0 | PostgreSQL 17.11; actual session TLS true; 3.941 s including connection/query |
| `python -m pytest -v tests/test_auth.py tests/test_user_model.py --reuse-db --tb=short --junitxml=/tmp/kivo-phase07-auth-baseline.xml` (before runtime clarification) | 0 | 39 passed, 0 failed/skipped, 122.89 s, existing Python 3.14 environment |

Remote database tests use pytest-django's separately named PostgreSQL database;
the existing fixture rejects mirrors, non-PostgreSQL engines, missing remote
hosts, non-`test_` names and names equal to the application database. No SQLite or
local PostgreSQL substitution is used. Application database probes are read only.

## Checkpoint A — authentication

Confirmed defects and root causes:

1. Database uniqueness was case sensitive while authentication used `iexact`.
   Direct writes could create ambiguous identities; concurrent registration also
   leaked an unhandled `IntegrityError`. Added a `lower(email)` unique index via
   additive `users.0003`, canonical manager normalization, and translation of only
   the two known email constraint failures after transaction rollback.
   Existing accounts are neither merged nor deleted. A duplicate identity will
   stop migration for an explicitly reviewed resolution.
2. Django's attribute similarity validator was called without a user and therefore
   did nothing. Registration now supplies the proposed user to password validation
   in the service, with field-specific errors and no duplicated validator call.
3. DRF's default CharField behavior stripped password whitespace. Both registration
   and login now preserve the exact submitted secret.
4. `AnonRateThrottle` exempted authenticated callers; default proxy handling trusted
   spoofable `X-Forwarded-For`. Authentication throttles now cover all callers and
   explicitly use the peer IP (`NUM_PROXIES=0`). Process-local/non-atomic cache
   limitations still require ingress enforcement before release.
5. Authentication/CSRF responses had no explicit cache prohibition. All five auth
   views now apply Django's `never_cache` headers.

Before fixes, the six new non-database security cases all failed (exit 1, 0.12 s).
The four PostgreSQL cases also all failed (exit 1, 23.60 s), reproducing case-variant
duplicate insertion, ineffective similarity validation, altered password hashing,
and concurrent-registration `IntegrityError`. That run additionally had one test
teardown deadlock; the new race test now explicitly closes each thread's database
connections rather than retaining healthy persistent connections on thread exit.
The failed-run artifact is `.pytest_cache/phase07/auth-defects-before.xml`.

After fixes, all six non-database security cases passed (exit 0, 0.09 s). Complete
authentication gate including PostgreSQL, session rotation/expiration, CSRF,
logout invalidation and the actual race: **PASS — 49 passed, 0 failed/skipped,
505.20 s**, exit 0. Command:

```bash
backend/.venv/bin/python -m pytest -v tests/test_auth.py tests/test_user_model.py tests/test_auth_security.py --reuse-db --tb=short --junitxml=.pytest_cache/phase07/auth-gate.xml
```

The first post-fix authentication run exited 1: **48 passed, 1 failed, 0 skipped,
191.87 s**, artifact `.pytest_cache/phase07/auth-after.xml`. The race fixture's
fixed email still existed after the preceding failed flush, so serializer
prevalidation rejected it before either race could start. The test now uses a
fresh UUID identity per execution and retains the same single-winner/duplicate
validation assertions. The subsequent complete passing gate is recorded above.

Read-only activity snapshots also found another session continuing INSERTs in
the default test database after our process exited. Its owner/purpose is unknown;
no session was terminated. Following tests select a separately named remote
database via `KIVO_TEST_DATABASE_NAME=test_kivo_phase07`. The fixture still checks
the remote engine, name prefix, mirror and inequality with the application name
before any test setup/flush. This avoids destructive interference with a parallel
process using Django's default `test_postgres` name. The earlier teardown deadlock
cannot be conclusively attributed solely to connection cleanup.

Checkpoint Git inspection: `git status --short`, `git diff --check` and
`git diff --stat` executed; whitespace check exited 0. Actual diff and both new
files inspected in the original repository. No commit or history rewrite.

## Checkpoint status at the end of authentication review

At this checkpoint, financial, database/security, reliability/performance, full
regression and operational readiness were NOT VERIFIED. Their subsequent actual
results and remaining external gates are recorded below.

## Checkpoint B — financial review

Reviewed ledger posting/correction/reversal services, strict money serializers,
owner-scoped selectors, FIFO v1/v2 and persistence, lending/shared posting, split
and calendar rules, rent reserves and report/export selectors. No financial
business-rule change is justified by the review alone. The targeted gate covers
FIFO A/B/C, opening equity, refunds/reversals, lending/repayment, shared expenses,
retained friend-paid rent reserves, rollback, budgets and CSV reconciliation.
It ran in `test_kivo_phase07` with actual PostgreSQL constraints and no mock DB:
**PASS — 54 passed, 0 failed/skipped, 707.89 s**, exit 0. This includes 14
PostgreSQL scenarios and 40 pure algorithm/calendar/status/split cases.
Artifact: `.pytest_cache/phase07/financial-gate.xml`. The selected node names
are retained in that JUnit report. No financial calculation rewrite was needed.
Actual Git status, whitespace and diff-stat checks were rerun at the checkpoint.

An additional in-memory algorithm probe exited 0: 100 deterministic scenarios,
100 attempted movements each, seed 7007, calling the production FIFO v2 engine.
Receipt, borrowing, expense, transfer, lending and recovery combinations preserved
per-account cash and each source's original = consumed + liquid + receivable
capacity, without attribution gaps. Observed elapsed 77 ms. This is pure algorithm
evidence, not PostgreSQL throughput or a replacement for the regression suite.

## Database and operational baseline findings

The read-only application database audit exited 0 and observed:

- PostgreSQL 17.11, session encrypted with TLSv1.3.
- Zero duplicate `lower(email)` identity groups; no identities were displayed.
- 28 domain/user/session tables; zero failures of RLS/client-role table privacy.
- Configured role flags: superuser false, CREATEDB true, CREATEROLE true,
  BYPASSRLS true; owns 36 public tables. **FAIL for production least privilege**.
  No role, policy, grant, table ownership or production infrastructure was changed.
- `showmigrations` exited 0: Phase 1–6 migrations applied; new users.0003 pending.
- `migrate --plan` exited 0: only users.0003 planned. `sqlmigrate users 0003`
  exited 0: `CREATE UNIQUE INDEX users_email_ci_unique ON users (LOWER(email))`.
  Application migration approval was requested; it remains unapplied until given.

In-memory fault injection (explicitly unit evidence) reproduced exception-message
leakage to log handlers and DB connection errors returning HTTP 500. A session
load failure on liveness also raised OperationalError during logging/debug
processing (probe exit 1); the probe did not establish a healthy outage response.
At baseline the middleware forced lazy user loading, and health endpoints used
default session authentication. Both were remediated in Checkpoint C below.

Production import probes (actual subprocesses, probe exit 0) accepted each unsafe
configuration: comma-only hosts, wildcard trusted origin, HTTP trusted origin,
50 identical secret-key characters and disabled HTTPS redirect. Normal
`check --deploy --fail-level WARNING` with a generated key and synthetic host
exited 0; that pass does not invalidate these negative-configuration findings.

At baseline `.env` was Git-ignored with permission 664; no key-like filenames
were tracked. Its permissions were tightened in Checkpoint C below.
No Gunicorn, Uvicorn, Daphne or Waitress distribution is installed in the existing
virtual environment. `pg_dump`, `pg_restore` and `psql` are absent. Runtime package
installation and a backup/restore drill have not been performed or approved.

## Checkpoint C — security remediation and database verification

Executed the new negative security suite before remediation: exit 1, **17 failed,
1 passed, 0 skipped**, 0.20 s; `.pytest_cache/phase07/security-before.xml`.
The committed example's known placeholder secret separately reproduced unsafe
startup acceptance (exit 1, one regression failure, 10 deselected, 0.04 s).

Fixes in the original repository:

- Unexpected errors log only event/view/exception class and correlation metadata;
  exception text and traceback are withheld from arbitrary log handlers.
- Operational/interface DB failures return sanitized 503 JSON with explicit
  same-key/same-body retry guidance. No automatic financial-write retry was added.
  Unknown errors remain sanitized 500. Converted server errors mark atomic-request
  rollback; suspicious input produces a safe 400.
- Health probes bypass session authentication; correlation logging no longer
  evaluates a lazy user. Liveness remains independent of database/session health.
- API middleware failures use JSON, CSRF failures use JSON for API routes, and all
  API responses receive private/no-store headers. Non-API CSRF behavior is retained.
- Connection reuse enables Django health checks. A missing remote hostname fails
  closed instead of silently selecting a local socket. DSN masking removes query
  and fragment secrets as well as passwords.
- Production startup rejects weak/known-placeholder keys, empty/wildcard hosts,
  HTTP/wildcard/path-bearing trusted origins and disabled HTTPS redirection.
  WSGI/ASGI default to production; manage.py keeps explicit development behavior.
- `.env` permissions changed 664 → 600 without editing its contents. Removed the
  misleading unused CORS environment example; same-origin proxying is documented.
- Added read-only `audit_database_security` command and a loopback-only production
  Gunicorn configuration. No application server dependency was installed.

After the last security/configuration fix, non-database regression exited 0:
**51 passed, 1 database case deselected, 0 skipped, 1.01 s**, artifact
`.pytest_cache/phase07/security-unit-final.xml`. This covers the new negative
cases, existing settings/DB parser/error/health cases, and fresh-subprocess
production entrypoint checks on the existing interpreter. An intermediate Ruff
check found two issues (unused import and a bare property-validation expression);
both were fixed. Subsequent Ruff lint/format checks exited 0.

`audit_database_security` actually exited **1**, reporting TLS true, 36 tables,
20 sequences, no missing/exposed objects, two accessible administrative roles and
36 runtime-owned tables. This is an accurately failing **production role gate**,
not a passing restricted-role deployment. Its remediation requires authorized
role/grant/policy provisioning and credential cutover; that operation is stopped.
Independent regression work continues without altering the configured role.

The Gunicorn config loaded successfully with `runpy.run_path` (exit 0), asserted
the original backend path, production settings and loopback bind. Actual server
startup is **NOT VERIFIED** because Gunicorn is absent and installation is not
approved. This check does not claim a server boot or deployment.

Actual PostgreSQL isolation/concurrency/rollback gate: **PASS — 19 passed,
0 failed/skipped, 642.90 s**, exit 0. Artifact:
`.pytest_cache/phase07/database-security-gate.xml`. This verifies real row locks,
duplicate/overspending rejection, three concurrent rent-settlement cases, raw
settlement caps, report/write consistency, budget races, foreign ownership across
financial endpoints, real connectivity/privacy and rollback of a real PostgreSQL
insert after an injected API exception. No database behavior was mocked.

Production also accepts an explicit single trusted proxy hop through
`AUTH_TRUSTED_PROXY_HOPS=1`, after the operator has isolated the loopback backend
and made the ingress replace forwarded headers. Default is 0. The production
override copies, rather than mutates, shared base settings. This avoids merging
all proxy clients into one bucket after a reviewed ingress configuration. Shared
ingress rate enforcement remains mandatory because DRF cache throttles are
process-local and non-atomic. Invalid hop configuration is rejected.

Final checkpoint Git status/diff/whitespace checks and actual new source files
were inspected in the original repository. Production role provisioning and the
application migration remain explicit external release blockers; independent
performance and regression verification proceeds without these mutations.

The explicit proxy-setting follow-up unit gate exited 0: **53 passed, 1 database
case deselected, 0 skipped, 1.45 s**, replacing the final unit artifact above.

## Checkpoint D — performance and failure handling

**PASS — 4 passed, 0 failed/skipped, 137.11 s**, exit 0, actual remote PostgreSQL
in `test_kivo_phase07`. Artifact:
`.pytest_cache/phase07/performance-reliability-gate.xml`. Command:

```bash
env KIVO_TEST_DATABASE_NAME=test_kivo_phase07 backend/.venv/bin/python -m pytest -v tests/test_reliability.py tests/test_reporting.py::test_budget_aggregation_query_count_does_not_grow_per_row tests/test_reporting.py::test_csv_streams_multiple_chunks_without_per_event_queries --reuse-db --tb=short --durations=10 --junitxml=.pytest_cache/phase07/performance-reliability-gate.xml -o junit_logging=system-out
```

Measured the existing budget/dashboard and multi-chunk CSV query counts; no
unmeasured index/cache/query rewrite was introduced. The CSV test reconciles 202
events across chunks of 200 to actual ledger/FIFO data, retaining database guards.
Two new real-PostgreSQL regressions verify closed idle connection recovery before
a new query and release of the CSV owner lock on stream close. The latter proves
the writer is blocked using `pg_blocking_pids`, closes the real response stream,
then observes the actual receipt commit. No financial operation is blindly retried.

Additional read-only connection profiling exited 0. Two new connections took
1449/1433 ms; six persistent-connection SELECT 1 round trips took
204/204/204/204/159/249 ms. EXPLAIN ANALYZE reported server planning
0.020/0.026 ms and execution 0.018/0.021 ms. These small samples show network
overhead dominating trivial queries; they do not prove a universal cause of every
prior timeout or a production capacity/latency guarantee. Sandbox DNS failure was
separately demonstrated and resolved with authorized network execution.

Fault evidence is separated: unit injection proves safe outage/logging responses;
actual PostgreSQL proves transaction rollback, idle-connection recovery, lock
cleanup and durable/concurrent retry invariants. A mid-flight network/commit
failure was not forced against application financial data. Streaming completion
and large-scale production load remain distinct from response-preparation timing.

Checkpoint Git status, diff stat, whitespace and actual new files were inspected
in the original repository before starting the complete regression.

## Governing-document follow-up and regression restart

The first 282-case full-suite attempt was deliberately interrupted to fix new
confirmed specification gaps after the governing documents were located. Actual
exit **2**, **33 passed, 0 failed/skipped, 408.11 s**, not a complete suite pass.
Evidence is preserved separately in
`.pytest_cache/phase07/full-regression-interrupted.xml`.
The 408.11 s is the terminal summary; this interrupted report's XML testsuite
timing is 370.422 s. Neither timing changes its interrupted, incomplete status.

Suite F04 requires amount filtering; F05 lists groceries/social/utilities defaults;
F13 requires transaction-type breakdowns; PRD report conventions require export
timezone/filter/generation metadata. The first new unit regression printed
**4 failed, 4 passed, 2 database cases deselected, 0.12 s** (FAIL). Its process exit
was not separately captured in the shell that then preserved the prior full-run
artifact; that combined shell returned 0. Actual failures were
unknown amount fields, rejected kind dimension, absent defaults and missing CSV
metadata. Artifact: `.pytest_cache/phase07/report-contract-before.xml`.

Implemented minimal fixes through existing boundaries: exact inclusive
`amount_min`/`amount_max` face-amount filters shared by history/reports/CSV,
`dimension=kind` for net spending, three additional idempotently seeded categories,
and documented `X-Kivo-Export-*` metadata headers. Export calendar presets are
frozen before iteration so crossing midnight/month-end cannot silently switch
periods. Existing CSV contribution columns and source/expense recognition remain
unchanged. Production OpenAPI/docs now require authentication, verified through
fresh WSGI/ASGI subprocess HTTP checks. No new dependency or financial policy.

The first PostgreSQL follow-up exited **1**: **8 unit passes, 8 setup errors,
1 warning, 11.46 s**. Connection timeout occurred during session test-DB setup,
before any of these database cases executed. Django's warning concerned its
PostgreSQL administrative-connection fallback, not an SQLite/local replacement;
test-name/engine isolation guards remained active. Preserved artifact:
`.pytest_cache/phase07/report-contract-gate.xml`. This is not a passing financial
or full regression result. A read-only DNS/TLS diagnostic precedes the retry.

The diagnostic exited 0: the configured direct endpoint resolved only AF_INET6,
and actual PostgreSQL/TLS SELECT returned `(1, True)` in 1806 ms. No endpoint,
credential, timeout or financial retry policy was changed. The entire 16-case
follow-up then exited **0: 16 passed, 0 failed/skipped, 518.60 s**, artifact
`.pytest_cache/phase07/report-contract-retry.xml`. It verifies amount selection,
kind/ledger/CSV reconciliation, actual default-category persistence, month-boundary
export stability, formula protection, dashboard/CSV query counts and stream close.
Measured counts remain one budget aggregate, 20 dashboard queries, six CSV queries.
The earlier setup failure is retained rather than relabeled a clean first pass.

Two final security regressions reproduced and fixed HTML 404s on unknown API
routes and password similarity omitting the custom `name` attribute (each targeted
pre-fix command exited 1). API HTML errors now use the safe JSON envelope while
preserving security/protocol/cookie headers. Password validators explicitly check
email and name. Final non-database gate exited **0: 69 passed, 7 database cases
deselected, 0 skipped, 1.13 s**. The current full suite now collects **294 cases**.

After the last source change, Django check, strict OpenAPI validation, Ruff check
and Ruff format check each exited 0 (161 formatted files). The new complete run
uses `.pytest_cache/phase07/full-regression-final.xml`; its subsequent completed
results are recorded in Checkpoint E below. Source/config fingerprints for 145
original-repository files were captured immediately after its start in
`.pytest_cache/phase07/full-run-source-sha256.json`. All still match after the
complete run; documentation-only finalization does not change the tested source.

Read-only application reconciliation commands each exited 0: ledger 0 events,
FIFO 0 owners, rent 0 owners/obligations/reserves. These confirm an empty current
application journal, not populated functional coverage; the isolated tests supply
that coverage. Final production-profile deployment checks also exited 0 with an
in-memory generated key, explicit synthetic HTTPS host/origin and DEBUG=False.
They are configuration evidence, not deployed HTTPS or restricted-role evidence.

## Checkpoint E — complete post-change regression

**FAIL — 293 passed, 1 failed, 0 errors/skipped; all 294 collected cases ran.**
The completed JUnit testsuite records 4908.725 seconds. The running command was:

```bash
env KIVO_TEST_DATABASE_NAME=test_kivo_phase07 backend/.venv/bin/python -m pytest -v --reuse-db --tb=short --durations=15 --junitxml=.pytest_cache/phase07/full-regression-final.xml -o junit_logging=system-out
```

The user interrupted the conversation while the process remained active. On
resumption its session handle was unavailable, but its completed XML contained
all 294 results, including the final collected case. Its raw process exit code
was **not captured** after the interruption; no numeric exit is invented. The
completed one-failure report independently establishes a failed full-suite gate.

The sole failure is `tests/test_finance_http.py::test_real_http_financial_lifecycle`:
`TimeoutError: timed out` while awaiting HTTP response headers for
`POST /api/v1/rent/reserves/` at test line 141. Its unchanged client deadline is
30 seconds. The complete case took 279.915 seconds before failure. This proves
a response-deadline violation; it does not establish whether PostgreSQL/network
latency, a lock, or application execution caused it, or whether that reserve
write ultimately committed. The isolated test's cleanup cannot prove the
historical commit outcome. No automatic financial retry or timeout increase was
introduced. A separately instrumented fresh isolated execution investigates it;
a targeted retry can never replace this failed complete result.

The other real HTTP friend-paid rent flow passed. Raw PostgreSQL repayment caps,
concurrent duplicates/overpayments, reporting races, closed-connection recovery,
stream-lock cleanup and atomic rollback also passed in this complete run.
All 145 captured source/config fingerprints still match on resumption.

Final independent quality checks on 2026-10-19 each actually exited 0: Django
`check`, strict OpenAPI generation/validation, Ruff lint, Ruff format (161 files)
and `pip check`. Pip reported its non-writable external cache was disabled;
it found no broken requirements and made no package change.

### HTTP timeout investigation

A fresh isolated execution of the unchanged failing test **passed: 1 passed,
0 failed/skipped, exit 0, 232.09 seconds** (JUnit testsuite 232.078 seconds).
An in-memory Python diagnostic wrapper invoked `pytest.main` with:

```python
['-v', '-s', 'tests/test_finance_http.py::test_real_http_financial_lifecycle',
 '--reuse-db', '--tb=short', '--durations=5',
 '--junitxml=.pytest_cache/phase07/http-failure-investigation.xml']
```

The wrapper used the same `backend/.venv/bin/python` and
`KIVO_TEST_DATABASE_NAME=test_kivo_phase07`. It measured actual urllib requests,
Django request signals and `connection.execute_wrapper` timings; no DB behavior,
HTTP response, assertion or deadline was mocked/altered. It logged paths, status,
counts and timings, never SQL/parameters, credentials or request bodies. No
persistent source file, alternative environment or temporary development copy was
created. Actual exit and 50 client/50 server request measurements are preserved
in `.pytest_cache/phase07/http-failure-timings.json`.

The reserve request returned 201 in **4.9151 seconds**; server measurement was
4.9140 seconds, **13 SQL executions totaling 3.0252 seconds**, maximum individual
execution 0.3454 seconds. The slowest client request was rent payment at 10.9613
seconds. Full lifecycle assertions passed through ledger/FIFO, rent/reserve,
lending/recovery, shared expenses, budgets, reports, CSV reconciliation and logout.
These SQL timings include network round trips; they are not server-only CPU time.

Review of the reserve path found its existing owner lock, atomic durable retry
receipt and aggregate capacity validation intact. This fresh execution did not
reproduce the timeout or demonstrate a query bottleneck requiring a code change.
The earlier direct-endpoint setup timeout and IPv6/TLS findings are separate
observations, not proof of the HTTP timeout's root cause. Its original cause
remains **NOT VERIFIED**; diagnosis needs evidence captured during recurrence.
No timeout was raised, assertion weakened, speculative query rewrite applied,
or original ambiguous financial write blindly replayed. This targeted pass is
**not a clean full-suite PASS**. The complete regression and reliability gates
remain **FAIL**, and no further source change followed the complete run.

### Final command ledger

Below, `python` means the unchanged `backend/.venv/bin/python` and `ruff` means
`backend/.venv/bin/ruff`, invoked from the verified original repository. Database
commands used authorized remote access and remained read-only on the application
database. Actual subprocess returns/output for the seven final database checks
are retained in `.pytest_cache/phase07/final-database-command-results.json`.

| Executed command/check | Actual exit | Final observed result |
| --- | --- | --- |
| `python backend/manage.py check` | 0 | No issues |
| `python backend/manage.py makemigrations --check --dry-run` | 0 | No changes detected |
| `python backend/manage.py showmigrations` | 0 | Prior migrations applied; users.0003 pending |
| `python backend/manage.py migrate --plan` | 0 | Only users.0003 planned; nothing applied |
| Complete `pytest -v` command above | Not captured after conversation interruption | Completed XML: 293 passed, 1 failed, 0 errors/skipped |
| In-memory diagnostic `pytest.main` invocation above | 0 | One fresh real HTTP lifecycle passed; no full-suite substitution |
| `python backend/manage.py spectacular --validate --fail-on-warn --file .pytest_cache/phase07/openapi-final.yaml` | 0 | Schema generated/validated without warnings |
| `ruff check .` | 0 | All checks passed |
| `ruff format --check .` | 0 | 161 files formatted |
| In-memory production-profile `call_command('check', deploy=True, fail_level='WARNING')` | 0 | No issues; generated key and synthetic explicit HTTPS host/origin |
| `python -m pip check` | 0 | No broken requirements; unwritable external cache disabled |
| `python backend/manage.py audit_database_security` | **1** | TLS/privacy pass; administrative/table-owner runtime role fails |
| `python backend/manage.py reconcile_ledger` | 0 | Zero current application events reconcile; no mutation |
| `python backend/manage.py rebuild_funds --all --check` | 0 | Zero current application owners; no mutation |
| `python backend/manage.py reconcile_rent` | 0 | Zero owners/obligations/reserves; no mutation |
| `git status --short`, `git diff --check`, `git diff --stat` | 0 each | Original-root changes present; no whitespace errors |

The empty application journal is not offered as populated financial coverage.
Populated evidence comes from the separate actual PostgreSQL test database.

## Checkpoint F — production readiness

**BLOCKED** for actual deployment and recovery. Prepared
[operations procedures](../security-and-operations.md),
[ADR-007](../decisions/ADR-007-authentication-and-operations.md), production
startup guards and the reviewed loopback server configuration. Verified security
settings with fresh entrypoint subprocesses and Django's production checks;
neither check constitutes a deployed HTTPS test or a running production server.

The actual runtime database security gate is **FAIL** because the configured role
has administrative access and owns application tables. The additive email index
also remains pending on the application database; applying it awaits explicit
target approval. All application database investigation remained read-only.

Gunicorn and PostgreSQL backup/restore client tools are absent. No dependency
installation, public deployment, role provisioning, ingress configuration, DNS
change, purchase, backup or restoration was performed. Actual Supabase backup
plan, retained recovery points and successful isolated restoration are **NOT
VERIFIED**. The runbook distinguishes proposed recovery targets from measured
ones and requires approval for the target, tools and any eventual cutover.

These external controls remain mandatory release blockers even if all source
regressions pass. Independent source verification does not approve production
mutations. Detailed current gates are in the
[release readiness report](../release/kivo-v1-release-readiness.md).

## Final filesystem, Git and release decision

Canonical repository remains `/home/lucifer/Desktop/kivo`, as confirmed again
after resumption. The sandbox permits original-backend writes; the exclusive
disposable backend write probe passed before implementation and actual source/
documentation writes remain there. Git metadata is read-only in this session;
no commit, history rewrite or destructive Git command was performed.

Baseline was clean. Final status is **28 modified tracked files plus 14 new
untracked files**, all 42 resolved under the canonical original root, with no
frontend changes. The tracked diff stat is 424 insertions/75 deletions; it does
not include the 14 new files, which were separately inspected for whitespace and
conflict markers. The exact manifest below was programmatically matched to Git's
tracked/untracked file lists. Documentation links resolve. All 145 source/config
fingerprints match the full-run snapshot. Ignored `.env` remains mode 600.
Evidence: `.pytest_cache/phase07/final-workspace-evidence.json`.

**NOT READY / PARTIALLY COMPLETE.** Implementation fixes have real regression
evidence, but the failed complete HTTP regression, privileged runtime database
role, pending application email index, unverified production server/HTTPS/shared
limits and unverified isolated restoration prevent release. No targeted retry,
empty-journal reconciliation or prepared runbook changes that decision.

## Exact modified files

All 42 Git-visible changed/new files were resolved and verified under
`/home/lucifer/Desktop/kivo`. Baseline Git status was empty. The list includes
new untracked files; no source change is held exclusively in a temporary path.

- `.env.example`
- `README.md`
- `backend/apps/ledger/history.py`
- `backend/apps/ledger/services.py`
- `backend/apps/reports/selectors.py`
- `backend/apps/reports/serializers.py`
- `backend/apps/reports/views.py`
- `backend/apps/users/managers.py`
- `backend/apps/users/migrations/0003_case_insensitive_email.py`
- `backend/apps/users/models.py`
- `backend/apps/users/serializers.py`
- `backend/apps/users/services.py`
- `backend/apps/users/throttling.py`
- `backend/apps/users/views.py`
- `backend/common/db.py`
- `backend/common/exceptions.py`
- `backend/common/health/views.py`
- `backend/common/management/__init__.py`
- `backend/common/management/commands/__init__.py`
- `backend/common/management/commands/audit_database_security.py`
- `backend/common/observability.py`
- `backend/config/asgi.py`
- `backend/config/settings/base.py`
- `backend/config/settings/production.py`
- `backend/config/wsgi.py`
- `deploy/gunicorn.conf.py`
- `docs/decisions/ADR-001-technology-versions.md`
- `docs/decisions/ADR-004-funding-attribution.md`
- `docs/decisions/ADR-005-personal-sharing-and-rent.md`
- `docs/decisions/ADR-006-budgets-and-reporting.md`
- `docs/decisions/ADR-007-authentication-and-operations.md`
- `docs/phases/phase-07-verification.md`
- `docs/release/kivo-v1-release-readiness.md`
- `docs/security-and-operations.md`
- `tests/conftest.py`
- `tests/test_auth_security.py`
- `tests/test_ledger.py`
- `tests/test_production_security.py`
- `tests/test_reliability.py`
- `tests/test_reporting_contract.py`
- `tests/test_security_hardening.py`
- `tests/test_settings.py`

Additionally, ignored `.env` changed permissions only (664 to 600); its contents
were preserved. Generated test/schema/fingerprint artifacts are confined to the
repository’s ignored `.pytest_cache/phase07/`, except the pre-clarification baseline
JUnit file recorded above. No commit, reset, clean, worktree or clone was performed.
