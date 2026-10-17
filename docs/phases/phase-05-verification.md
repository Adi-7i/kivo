# Phase 5 verification: personal claims, shared bills and rent

Status: **PARTIALLY COMPLETE**. Phase 6 readiness: **NOT READY**.

This is not a completed Phase 5 gate. The user has approved the original
recognition/FIFO decisions; the continuation below implements those workflows
and records new verification separately. Linked friend-paid rent reserve handling
has a newly documented pending decision. No answer is inferred from elapsed time.
See [ADR-005](../decisions/ADR-005-personal-sharing-and-rent.md) and the
[execution plan](phase-05-plan.md). The user subsequently renewed Phase 6
authorization; its implementation/evidence is recorded separately in the
[Phase 6 report](phase-06-verification.md). Phase 7 remains excluded.
The original sections below are historical evidence for the initial
contacts/personal-rent/reserve scope, not the current capability inventory.

## Prerequisite evidence

The complete existing suite was rerun before enabling the Phase 5 app or changing
the ledger. Command:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --maxfail=1 --tb=short
```

Exit **0**, **129 passed in 740.58 seconds**, no failures or skips. This includes
actual remote PostgreSQL connectivity, authentication/CSRF, private table grants,
balanced journals, FIFO A/B/C, backdated corrections/refunds, real socket HTTP and
concurrent duplicate-write/overspending behavior. Earlier Phase 1 reports' missing
credentials were historical; this session actually connected and ran the tests.
The development migration plan was empty before Phase 5. Django check and Ruff
also exited 0. No PRD, Blueprint or Final Development Suite files were available;
the latest user prompt and repository ADRs are the available specifications.

## Implemented code and contracts

- `backend/apps/sharing/`: owned contacts and audited metadata changes; monthly
  rent configuration/shares; deterministic obligations; confirmed personal-rent
  payments, partial payments, superseding corrections and reversals; rent reserve
  creation/adjustment/release, consumption and reconciliation; selectors,
  permissions, exact-money serializers, versioned APIs and OpenAPI declarations.
  `reconcile_rent` performs a read-only audit of payments and active earmarks,
  including retained obligations of inactive users.
- `sharing/calendar.py`, `splits.py`: real calendar and paise-conserving split
  calculations. Dates include leap years and last-day/clamped due-day rules.
- `backend/apps/ledger/models.py`, `serializers.py`, `services.py`: nullable owned
  contact/claim references, explicit gift/treat expense classification, reversal
  reference preservation, fundability checks over actual liquid postings, and
  protection against orphaning linked rent through generic correction/refund.
  Existing event kinds retain their two-leg accounting and FIFO v1 behavior.
- `Claim`, `SharedBill`, `BillShare` and receivable/payable book definitions are
  structural foundations only. No working lending/shared posting or settlement
  API is claimed. Shared-rent payment fails explicitly with `policy_pending`.
- Settings/routes, README and ADR-005 describe the exposed contracts and limits.
  Tests are in `test_rent.py`, `test_rent_security.py`, `test_rent_calendar.py`,
  `test_sharing_splits.py`; privacy and real HTTP regression tests were extended.

See the [README route table](../../README.md#12-phase-5-contacts-personal-rent-and-reserves)
for exact endpoints and inputs. Obligations do not post money. Reserves never
change actual cash. Personal rent uses the existing immutable expense journal
and FIFO, within one owner-locked atomic/idempotent write. Payment-linked reserve
consumption becomes inactive when the payment is reversed, preserving the audit
record and reopening outstanding rent. Safe-to-spend is signed actual liquid
balance minus active rent earmarks. Generic budgeting is excluded.

## Database/migrations

All development mutations use the configured environment-based TLS Supabase
connection; no credentials are included here. Destructive integration tests use
the separate remote PostgreSQL `test_postgres` database with the existing
fail-closed test settings guard and `--reuse-db`.

Reviewed and applied, exit **0**:

1. `ledger.0004_event_classification`
2. `sharing.0001_initial` (12 new tables, constraints/indexes, RLS and revoked
   PUBLIC/Supabase client-role table and sequence grants in the creation transaction)
3. `ledger.0005_relationship_references` (nullable references and book constraints)
4. `sharing.0002_relationship_guards` (owner guards, immutable financial references,
   rent calendar/share conservation, obligation/reserve/payment reconciliation)
5. `sharing.0003_fix_rent_guard_alias` (forward-only repair described below)

`manage.py migrate --plan` was reviewed before each development application.
`sqlmigrate sharing 0001` and `sqlmigrate ledger 0005` both exited 0; generated
schema/constraint/privacy SQL was inspected. No existing applied migration was
edited or reset. Initial generated, unapplied Phase 5 migration names/order were
refined before application, keeping posting constraints in one atomic migration.

## Executed checks and intermediate failures

All Python commands below use `/tmp/kivo-venv313/bin/python` (Python 3.13.16);
Ruff uses `/tmp/kivo-venv313/bin/ruff`. Dependencies were not changed.

| Check | Exit | Observed result |
| --- | --- | --- |
| Pure calendar/split tests | 0 | 19 passed, 0.07 s, before later API integration |
| First strict Phase 5 OpenAPI generation | 1 | One enum naming collision warning; no schema error |
| OpenAPI after matching model/input classification choices | 0 | Validated with `--validate --fail-on-warn` |
| First PostgreSQL contact/rent/reserve gate | 1 | 3 passed, 1 failed in 117.03 s; trigger record variable `p` conflicted with a table alias during payment |
| Forward repair plan and development migration | 0 | Reviewed/applied sharing 0003; applied 0002 preserved |
| Latest Ruff check | 0 | All checks passed |
| Expanded PostgreSQL/API/concurrency/privacy/socket HTTP gate | 0 | **31 passed, 1 warning in 457.53 s**; reserve pagination ordering warning subsequently fixed |
| Rent status unit test | 0 | 1 passed, 0.02 s; fixed clock, actual serializer; not PostgreSQL evidence |
| Final Django system check | 0 | No issues |
| Final `makemigrations --check --dry-run` | 0 | No changes detected |
| Final strict OpenAPI validation | 0 | No warnings; `/tmp/kivo-phase-05-openapi.yaml` |
| Latest Ruff format check | 0 | 102 files already formatted |
| Signature/OpenAPI artifact audit | 0 | All inspected application signatures annotated; money inputs are strings; 21 exposed contact/rent routes; no lending/shared posting endpoint advertised |
| Development migration state | 0 | Ledger 0001–0005, sharing 0001–0003, funds 0001–0003 applied; no planned operations |
| `reconcile_ledger` | 0 | 0 development financial events; no mutation |
| `rebuild_funds --all --check` | 0 | 0 development owners; no mutation |
| `reconcile_rent` | 0 | 0 development owners/obligations/reserves; no mutation |
| Actual development connection/privacy/count audit | 0 | PostgreSQL 17.11, TLS true, database `postgres`; `(25, True, False, False, False)` privacy result; users/events/contacts/rent plans/obligations all 0 |
| `git diff --check` | 0 | No whitespace errors |

The failed payment returned the standard masked 500 and its database transaction
rolled back. The repair renames the PL/pgSQL record variable through a new
`CREATE OR REPLACE FUNCTION` migration. Tests/constraints were not weakened.
The failing result is not counted as a passing gate.

The 31-test command was:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_rent.py tests/test_rent_security.py tests/test_rent_calendar.py tests/test_sharing_splits.py tests/test_database_privacy.py tests/test_finance_http.py --reuse-db --maxfail=1 --tb=short
```

The warning was resolved by explicitly ordering the aggregate reserve queryset
by creation timestamp and public UUID. After the final application/test changes,
the complete regression ran as:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --maxfail=1 --tb=short
```

Exit **0**: **160 passed in 1,073.20 seconds (17:53)**; **0 failed, 0 skipped,
0 warnings**. This includes all Phase 1–4 regressions, the added read-only
reconciliation checks for inactive owners, all rent presentation states, reserve
ordering, and explicit rejection of shared-rent posting while policy is pending.
The latter rejects with 409 and leaves event, allocation-run and reserve-change
counts unchanged. It does not establish a working shared-rent financial engine.

The final Django check, migration-drift check, strict OpenAPI validation, Ruff
check/format check and whitespace check all exited **0** after the last application
change. No full-suite failure was hidden or skipped. The earlier failing domain
run and warning remain recorded above.

## Financial/security results observed in the 31-test run

- PASS: issuing monthly rent leaves ledger cash and expense at zero; repeated and
  concurrent generation creates one obligation per plan/month. February 2024 is
  the 29th; last-day/clamped due dates and exact/custom split conservation pass.
- PASS: liquid INR 3,260 with rent earmarks of 2,000 and 400 yields safe-to-spend
  860, while actual liquid remains 3,260 and expense remains zero. Release and
  skip remove earmarks without posting cash movements. Reopen preserves history.
- PASS: an explicitly funded INR 1,000 balance with 500 personal-rent payment has
  500 cash, 500 expense and 1,500 unpaid rent; a 1,000 reserve becomes 500.
  Correcting that payment to 400 leaves 600 cash/600 reserved. Reversal restores
  1,000 cash/1,000 reserved with zero expense. Excess and unfunded payments roll
  back without creating orphan payment records.
- PASS: after explicit additional funding, full 2,000 rent confirmation yields
  paid status, zero cash/reserve and exactly 2,000 expense. FIFO replay reconciles.
- PASS: gifts are personal expenses, create no receivable and remain linked to
  archived contacts. Historical references prevent contact deletion.
- PASS: same-key concurrent payments create one payment and one replay; distinct
  concurrent payments cannot exceed the obligation. Workers use independent real
  PostgreSQL connections and actual owner locks.
- PASS: foreign-owned contact, plan, obligation, reserve, payment and account
  references return 404 without mutation. Anonymous contact access is denied.
  PostgreSQL rejects immutable-row modification, owner reassignment, invalid due
  dates and reserve underflow. All 25 checked private tables have RLS enabled and
  no checked privileges for `anon`, `authenticated` or `service_role`.
- PASS: real socket HTTP registration/login/CSRF session exercises the existing
  financial scenario plus contacts, gift history, rent generation, reserve,
  partial payment and reversal. Safe-to-spend stays 750 as cash/reserve move from
  850/100 to 800/50 and back to 850/100. Logout then denies access.

Empty development reconciliation/counts are operational migration/isolation
evidence only. Populated test-database scenarios above supply financial evidence.

## Initial completion requirements (historical, before user approval)

| Required area | Current status |
| --- | --- |
| Phase 1–4 prerequisite regression | PASS: 129 actual tests |
| Calendar/exact split calculations | PASS: 19 actual pure tests |
| Contacts, personal-rent and reserves integration | PASS: dedicated 31-test run and final 160-test regression |
| Lending/borrowing and repayment caps/concurrent settlements | BLOCKED: FIFO v2 policy answer pending; not implemented |
| Friend-paid shared-bill recognition | BLOCKED: recognition policy answer pending; not implemented |
| User-paid shared bills, shared rent and settlement attribution | BLOCKED: required FIFO integration pending |
| Full post-change regression and final security audit | PASS for implemented scope: 160 passed, 0 failed/skipped/warnings; unimplemented lending/shared requirements remain blocked |

The decisions awaiting answers at that earlier gate were:

1. Friend-paid bills: expense plus payable on the bill date, with later settlement
   reducing cash/payable only (recommended), or cash-basis recognition on settlement.
2. FIFO v2: hold original source capacity in receivables while lent, restore that
   lineage on repayment, identify borrowing as liability-funded capacity rather
   than income, and classify principal-return allocation separately from expense.

At that earlier gate, the required lending examples and INR 6,000 three-roommate
financial example were **NOT VERIFIED**. Passing rent tests did not establish them.
Those examples were unverified at that earlier gate. See the approved continuation
below for current evidence; a historical failure/blocker is not erased by later work.

## Approved continuation: 2026-10-17

The user approved the contact/claim/split/rent/reserve architecture, immediate
friend-paid expense/payable recognition and conditional FIFO v2. ADR-005 was
updated with deterministic claim-specific recovery, original-source ordering,
borrowing/principal classification, backdating, reversal dependencies and owner
serialization before implementing the new engine. No Phase 6 application code
was added. Existing uncommitted Phase 6 prerequisite documentation was preserved.

### Implemented continuation

- `sharing/finance.py`, `financial_views.py`, serializers and routes: lending,
  borrowing, claim listing/details/history, partial/full settlements, exact shared
  bills, friend-paid expense/payable recognition, superseding corrections and
  reversals. Claim balances derive exclusively from signed ledger postings.
- `ledger/`: six new economic kinds, nullable account only for noncash shared
  recognition/reversal, exact operation-specific multi-leg journal validation,
  claim-preserving reversals, dependency checks, historical settlement limits and
  database owner locking. Generic transaction creation remains limited to its
  original supported kinds; domain financial writes use their dedicated endpoints.
- `funds/engine_v2.py`: real account FIFO plus receivable custody/recovery, one
  liability-funded source per borrowing, distinct principal-return allocations
  and recognized-expense references for later payable settlements. The v1 engine
  and historical runs remain intact. Remaining capacity includes receivables and
  is explicitly not another liquid balance.
- `funds/` snapshots/selectors/contracts: immutable claim positions, expanded
  allocation kinds and public expense-event references, conservation across
  consumed/liquid/receivable capacity, and strict reconciliation in financial writes.
- `sharing/rent.py`: actual owner-paid shared rent creates one shared bill/event
  and one payment link. Partial payments allocate remaining contractual shares;
  correction/reversal reopens obligations and claim/reserve history together.
- New tests are `test_fifo_v2.py`, `test_personal_finance.py`; existing rent,
  funds, privacy, socket HTTP and journal reconciliation assertions were updated.
  The journal assertion now compares exact operation-specific posting multisets,
  preserving the two-leg invariant for legacy kinds while verifying shared legs.
  `sharing/participants.py` shares participant authorization/validation between
  rent and bills; contact lookups and shared claims/shares are batched.

New endpoints are `/api/v1/loans/`, `/claims/`, `/settlements/` and `/shared-bills/`
with owned details, linked history and correction/reversal actions as applicable.
The [README contract table](../../README.md#13-personal-lending-shared-bills-and-fifo-v2)
documents actual inputs and the friend-paid rent limitation.

### Runtime restoration

`python3.13` was unavailable and the earlier temporary environment had expired.
The existing environment was preserved. Python 3.13.16 was downloaded from the
[official release](https://www.python.org/downloads/release/python-31316/), its
source SHA-256 verified, and built under `/tmp/kivo-python313`. Ubuntu OpenSSL
and libffi development headers were extracted under `/tmp` with their published
package hashes checked; no system packages were installed. Initial symlink
creation reported existing package links; they were corrected to the installed
runtime libraries. The first build lacked SSL because configure did not locate
OpenSSL; reconfiguration with an explicit prefix and rebuilding fixed it.

Observed final interpreter/import probe, exit 0: **Python 3.13.16**, OpenSSL
3.5.5, successful `ssl`, `ctypes`, Django 6.1.2 and psycopg 3.3.6 imports. A new
`/tmp/kivo-venv313` uses the unchanged `requirements.lock`. Initial sandboxed pip
installation failed with exit 1/no matching package from the restricted index;
the escalated retry installed the locked requirements, exit 0. The first source
download also failed DNS resolution in the sandbox; the authorized retry passed.
These bootstrap failures are not compatibility passes. Subsequent test commands
below use Python 3.13.16 unless explicitly labelled otherwise.

### Additive development migrations and observed intermediate checks

Inspected the migration plan and generated ledger/funds SQL before authorized
development application. Applied through the configured remote Supabase TLS
connection, exit 0:

1. `ledger.0006_remove_event_event_valid_kind_and_more`
2. `ledger.0007_personal_financial_guards`
3. `funds.0004_claimposition_and_more` (new claim-position table receives RLS,
   revoked client-role/PUBLIC table and sequence grants, owner/immutability and
   deferred conservation guards in its creation transaction)
4. `funds.0005_fix_position_guard_dispatch` (forward-only repair below)
5. `ledger.0008_serialize_journal_relationships` (raw journal insert locking and
   archived-account rejection)

No previously applied migration was edited/reset. No development financial data
was created by tests. Destructive tests use the existing isolated remote PostgreSQL
test database and fail-closed fixture, never SQLite/local PostgreSQL.

| Executed continuation check | Exit | Actual observation |
| --- | --- | --- |
| Initial Ruff check during implementation | 1 | Import formatting violations, subsequently fixed |
| Initial expanded OpenAPI validation on Python 3.14 | 1 | Two enum naming warnings, no schema errors; explicit loan enum and matching split choices resolved them |
| Pure v1/v2 FIFO, calendar and split tests on Python 3.14 | 0 | 39 passed in 0.12 s; algorithm evidence only |
| Python 3.13 Django system check | 0 | No issues |
| Python 3.13 strict OpenAPI validation | 0 | No warnings; `/tmp/kivo-phase-05-approved-openapi.yaml` |
| Initial new PostgreSQL gate | 1 | **1 failed in 31.01 s**, stopped on the first test; a funding receipt returned masked 500 and rolled back |
| Forward repair plan/application | 0 / 0 | Inspected/applied funds 0005; original applied SQL preserved |
| Repaired Python 3.13 domain gate | 0 | **22 passed in 641.49 s; 0 failed, 0 skipped**; before final batching and expanded raw-concurrency/history tests |
| Model/migration drift check | 0 | No changes detected |
| Intermediate Ruff / format / whitespace | 0 / 0 / 0 | All checks passed; 109 files already formatted |
| Development migration readback on Python 3.13 | 1 | Initial DNS failure; retry and migration-plan readback hit connection timeouts |
| Sanitized connection diagnostic on Python 3.13 | 1 | DNS resolved one address; new PostgreSQL connection raised OperationalError |
| Development migration readback on existing Python 3.14 | 0 | Ledger through 0008, funds through 0005, sharing through 0003 applied; no target-runtime compatibility claim from this check |
| Retried development migration plan on Python 3.13 | 0 | No planned migration operations after connectivity recovered |
| Read-only `reconcile_ledger` on Python 3.13 | 0 | 0 development financial events; operational state only, not populated financial evidence |
| Read-only `rebuild_funds --all --check` on Python 3.13 | 0 | 0 development owners; no mutation |
| Read-only `reconcile_rent` on Python 3.13 | 0 | 0 development owners, obligations and reserves; no mutation |
| Signature and generated-contract audit on Python 3.13 | 0 | New financial signatures annotated; money inputs are strings, retry headers required, expense references use public UUIDs; no Phase 6 endpoints |

The initial database failure was a polymorphic PL/pgSQL trigger expression
accessing `NEW.event_id` on a fund-position record. The forward repair isolates
gap-only field access in a table-specific branch. Tests and financial assertions
were not weakened. The repaired domain gate passed. The later full regression
collected 185 tests and showed passing progress through the first concurrent rent
payment case. Across the turn interruption its command handle stopped providing
output and no final JUnit file or exit status was available. A read-only
PostgreSQL probe found no active test sessions. This run is **NOT VERIFIED** as
a full gate; 185 collected is not 185 passed. The final combined regression in
the Phase 6 report will record new executed evidence separately.

Commands used for these gates:

```bash
backend/.venv/bin/python -m pytest -q tests/test_fifo_v2.py tests/test_fifo_engine.py tests/test_rent_calendar.py tests/test_sharing_splits.py
/tmp/kivo-venv313/bin/python backend/manage.py check
/tmp/kivo-venv313/bin/python backend/manage.py spectacular --validate --fail-on-warn --file /tmp/kivo-phase-05-approved-openapi.yaml
/tmp/kivo-venv313/bin/python backend/manage.py migrate --plan
/tmp/kivo-venv313/bin/python backend/manage.py migrate --noinput
/tmp/kivo-venv313/bin/python backend/manage.py makemigrations --check --dry-run
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_fifo_v2.py tests/test_personal_finance.py tests/test_rent.py::test_shared_rent_uses_one_bill_and_consumes_reserve_with_owner_expense_only tests/test_database_privacy.py --reuse-db --maxfail=1 --tb=short
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_personal_finance.py tests/test_rent.py::test_shared_rent_uses_one_bill_and_consumes_reserve_with_owner_expense_only tests/test_database_privacy.py tests/test_fifo_v2.py --reuse-db --maxfail=1 --tb=short
/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --tb=short --junitxml=/tmp/kivo-phase-05-final-results.xml
```

The initial development migration/SQL inspection used `backend/.venv/bin/python`
(Python 3.14.4) while Python 3.13 was being restored. Later repairs and checks use
the Python 3.13 prefix. No mocked connection is counted as PostgreSQL evidence.

### Explicit pending matter

For a friend-paid landlord bill linked to a generated rent obligation, reserve
retention versus immediate release remains unanswered. The exact question and
recommended retention of the owner's unpaid share are in ADR-005. This does not
reopen the approved standalone friend-paid recognition. Current rent confirmation
accepts owner payments, including shared rent; generic bills cannot claim to pay
an obligation by matching its title/date. The linked friend-paid rent path is not
implemented until the user supplies that financially significant decision.

This affects available money: illustratively, with INR 6,000 cash/reserved rent,
a friend paying the full landlord bill and an owner share of INR 2,000 would leave
cash unchanged. Retaining INR 2,000 makes safe-to-spend INR 4,000; releasing all
earmarks makes it INR 6,000 while the payable remains INR 2,000. These are proposed
policy outcomes, not implemented/tested results. Instruction 4 of the latest user
request says to "stop and request a decision instead of inventing a rule" when a
financially significant ambiguity remains. No answer has been inferred.

Phase 5 remains PARTIALLY COMPLETE; Phase 6 readiness remains NOT READY until all
mandatory coverage and the rent-overlap decision are resolved. No unexecuted test
count or completion result is claimed.


### Combined Phase 1–6 verification continuation

The renewed Phase 6 session executed the full current suite on Python 3.13.16
against isolated remote PostgreSQL:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v --reuse-db --tb=short --junitxml=/tmp/kivo-phase-06-final-225.xml -o junit_logging=system-out
```

Exit **1**: **224 passed, 1 failed, 0 skipped in 2670.94 s**. The failure was a
Supabase connection timeout while loading the session for `/categories/` in the
socket HTTP flow, before Phase 6 API calls. No clean full-suite pass is claimed.

All **56 cases** in the selected Phase 5 modules passed in that actual combined
run: personal finance 18; rent 7; rent security 4; FIFO v2 7; rent calendar 11;
rent status 1; sharing splits 8. The first 29 are database-backed and the remaining
27 are pure algorithm/calendar/status tests; these are not 56 PostgreSQL-only
tests. Observed coverage includes lending/borrowing, partial/full/excess repayment,
shared owner/friend-paid bills, reimbursement, exact splits, atomic rollback,
backdating/corrections/reversals, multibatch recovery, retained v1 snapshots,
shared rent, raw PostgreSQL claim caps, concurrent repayments/rent generation and
payments, ownership, reserve conservation and audit history.

The real socket HTTP flow and final CSV measurement were then rerun, exit **0**:

```bash
/tmp/kivo-venv313/bin/python -m pytest -v tests/test_finance_http.py::test_real_http_financial_lifecycle tests/test_reporting.py::test_csv_streams_multiple_chunks_without_per_event_queries --reuse-db --tb=short --junitxml=/tmp/kivo-phase-06-http-csv-rerun.xml -o junit_logging=system-out
```

**2 passed in 268.92 s, 0 failed, 0 skipped**. The complete session/CSRF financial
flow includes actual lending/recovery/shared bills and reconciles INR 590 cash,
INR 180 expense, INR 230 receivables, INR 820 remaining source capacity and INR 490
safe-to-spend with INR 100 reserved. The earlier failed run remains recorded.

Phase 5 is still PARTIALLY COMPLETE because the explicit linked friend-paid rent
reserve decision in ADR-005 remains unanswered. These tests verify implemented
approved workflows, not the unsupported pending path. Phase 7 was not started.
