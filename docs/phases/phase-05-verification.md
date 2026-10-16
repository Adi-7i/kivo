# Phase 5 verification: personal contacts and rent

Status: **PARTIALLY COMPLETE**. Phase 6 readiness: **NOT READY**.

This is not a completed Phase 5 gate. Lending, borrowing, shared financial
posting, settlements and their FIFO integration remain blocked on the accounting
decisions requested from the user. No answer has been inferred from elapsed time.
See [ADR-005](../decisions/ADR-005-personal-sharing-and-rent.md) and the
[execution plan](phase-05-plan.md). No Phase 6 or 7 implementation was started.

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

## Remaining completion requirements

| Required area | Current status |
| --- | --- |
| Phase 1–4 prerequisite regression | PASS: 129 actual tests |
| Calendar/exact split calculations | PASS: 19 actual pure tests |
| Contacts, personal-rent and reserves integration | PASS: dedicated 31-test run and final 160-test regression |
| Lending/borrowing and repayment caps/concurrent settlements | BLOCKED: FIFO v2 policy answer pending; not implemented |
| Friend-paid shared-bill recognition | BLOCKED: recognition policy answer pending; not implemented |
| User-paid shared bills, shared rent and settlement attribution | BLOCKED: required FIFO integration pending |
| Full post-change regression and final security audit | PASS for implemented scope: 160 passed, 0 failed/skipped/warnings; unimplemented lending/shared requirements remain blocked |

Proposed decisions awaiting explicit user answers:

1. Friend-paid bills: expense plus payable on the bill date, with later settlement
   reducing cash/payable only (recommended), or cash-basis recognition on settlement.
2. FIFO v2: hold original source capacity in receivables while lent, restore that
   lineage on repayment, identify borrowing as liability-funded capacity rather
   than income, and classify principal-return allocation separately from expense.

The required lending examples and INR 6,000 three-roommate financial example
have **NOT VERIFIED** status. Passing rent tests cannot establish those features.
Phase 5 cannot be marked complete and Phase 6 must not begin.
