<p align="center">
  <img src="docs/assets/kivo-logo.png" alt="Kivo Logo" width="140" height="140" />
</p>

# Kivo — Personal Money & Expense Management Backend

Kivo is a private, manual-entry personal finance, budgeting, and shared-living expense management application backend built with **Python 3.14/3.13**, **Django 6.1**, and **Django REST Framework**, persisting to a remote **Supabase-hosted PostgreSQL** database.

It is architected as an **API-first modular monolith** that exposes a unified, versioned REST API (`/api/v1/`) to serve future React web, Android, and iOS clients.

---

## 1. Confirmed Technology Stack

| Layer | Component | Version / Specification | Status |
|---|---|---|---|
| **Runtime** | Python | 3.14.4 (Ubuntu 26.04 LTS native) | CONFIRMED |
| **Backend Framework** | Django | 6.1.2 | CONFIRMED |
| **REST API Framework** | Django REST Framework | 3.18.3 | CONFIRMED |
| **Primary Database** | Supabase PostgreSQL | Remote managed PostgreSQL | CONFIRMED |
| **PostgreSQL Driver** | psycopg | 3.3.6 (`psycopg[binary,pool]`) | CONFIRMED |
| **Authentication** | Django Auth + Custom User | `users.User` (email-based) | CONFIRMED |
| **API Documentation** | drf-spectacular | 0.30.0 (OpenAPI 3.0 / Swagger / ReDoc) | CONFIRMED |
| **Testing** | pytest + pytest-django | pytest 9.1.1 + pytest-django 4.14.0 | CONFIRMED |
| **Linting & Formatting** | Ruff | 0.17.1 | CONFIRMED |
| **Filtering** | django-filter | 26.2 | CONFIRMED |

---

## 2. Local Development Prerequisites

- **Operating System:** Linux (Ubuntu 24.04/26.04 recommended), macOS, or Windows WSL2.
- **Python:** Python 3.13+ (existing development environment: 3.14.4).
- **Git:** Git 2.40+.
- **Supabase Account:** Access to a Supabase PostgreSQL instance (Cloud or Dedicated).

---

## 3. Virtual Environment Setup & Installation

All dependencies must be installed inside an isolated virtual environment (never globally):

```bash
# 1. Clone repository (or navigate to workspace root)
cd /path/to/Kivo

# 2. Create Python virtual environment inside backend/
python3 -m venv backend/.venv

# 3. Activate virtual environment
source backend/.venv/bin/activate

# 4. Install pinned dependencies from lockfile
pip install -r requirements.lock
```

---

## 4. Secure Environment Configuration

Kivo strictly requires environment variables for secrets and connection parameters. **Never commit the `.env` file.**

```bash
# 1. Copy the environment template
cp .env.example .env

# 2. Populate .env with your real Supabase PostgreSQL connection string and secret key:
```

Edit `.env`:
```ini
DJANGO_SETTINGS_MODULE=config.settings.development
DJANGO_SECRET_KEY=your-secure-random-secret-key-at-least-50-characters
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost,testserver

# Supabase PostgreSQL Connection String (Direct or Session Pooler on Port 5432)
SUPABASE_DB_URL=postgresql://postgres.your-project-ref:your-db-password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

---

## 5. Database Migrations

Before applying migrations, ensure `SUPABASE_DB_URL` points to an authorized development database:

```bash
# Preview migration operations (dry run)
python backend/manage.py makemigrations --dry-run

# Inspect existing migration state
python backend/manage.py showmigrations

# Apply initial migrations to authorized Supabase PostgreSQL
python backend/manage.py migrate
```

---

## 6. Running the Development Server

```bash
source backend/.venv/bin/activate
python backend/manage.py runserver 127.0.0.1:8000
```

Verify service liveness:
```bash
curl http://127.0.0.1:8000/api/v1/health/
# Response: {"status":"ok","service":"kivo-backend","version":"0.1.0"}

curl http://127.0.0.1:8000/api/v1/health/db/
# Response (when connected): {"status":"ok","database":"connected"}
```

---

## 7. Interactive API Documentation

With the server running, access developer documentation at:
- **Swagger UI:** [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **ReDoc:** [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/)
- **Raw OpenAPI Schema:** [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)

Validate OpenAPI schema offline:
```bash
python backend/manage.py spectacular --validate
```

---

## 8. Automated Testing & Code Quality

Run tests with `pytest`:
```bash
# Run all unit tests
python -m pytest -v

# Run with coverage (when configured)
python -m pytest -v -m "unit"
```

Run code formatting and linting with `Ruff`:
```bash
# Check code style and rules
ruff check .

# Check formatting
ruff format --check .

# Auto-format codebase
ruff format .
```

Run Django system configuration checks:
```bash
python backend/manage.py check
```

---

## 9. Current Phase Status

Phase 1–6 entries retain their historical checkpoint results. Phase 7 records the
current consolidated audit and regression evidence on the established runtime.

* **Phase 2 prerequisite:** PASS on Python 3.14.4: 69 regression tests passed against isolated remote PostgreSQL. See [readiness evidence](docs/phases/phase-02-readiness.md).
* **Phase 3:** PASS: 107 tests passed on Python 3.13.16 against isolated remote PostgreSQL. See [verification](docs/phases/phase-03-verification.md).
* **Phase 4:** PASS: dedicated gate 25 passed; final full regression **129 passed** on Python 3.13.16 against isolated remote PostgreSQL. See [verification](docs/phases/phase-04-verification.md).
* **Phase 5:** PARTIALLY COMPLETE; approved lending/shared posting and FIFO v2 have passing Python 3.13/PostgreSQL evidence (56 selected Phase 5 module cases in the earlier combined run; complete socket HTTP passed on retry). The friend-paid rent reserve policy is now approved and implemented; targeted verification is recorded in [Phase 5 evidence](docs/phases/phase-05-verification.md). The clean full-suite gate remains open. Phase 6 readiness: NOT READY.
* **Phase 6:** PARTIALLY COMPLETE. Budgets, dashboard, shared history filtering, reports and streaming CSV are implemented and tested on Python 3.13/PostgreSQL. Earlier full regression: **224 passed / 1 Supabase connection-timeout failure**; the complete HTTP + CSV focused retry then **2 passed**. A clean full-suite gate remains open; the prior Phase 5 rent policy question is resolved. See [current evidence](docs/phases/phase-06-verification.md), [plan](docs/phases/phase-06-plan.md) and [ADR-006](docs/decisions/ADR-006-budgets-and-reporting.md). Phase 7 readiness: NOT READY.
* **Architecture Rules:** See [AGENTS.md](AGENTS.md) for permanent engineering principles, financial calculation invariants, and anti-hallucination policies.
* **Phase 7:** PARTIALLY COMPLETE in the original lowercase repository, using the existing Python **3.14.4** `backend/.venv` without runtime/dependency changes. Authentication/security fixes, reporting contract repairs and actual PostgreSQL financial/concurrency regressions are implemented. Complete post-change regression: **293 passed / 1 HTTP response-timeout failure / 0 skipped**, with all 294 cases executed. The timeout, privileged database role, pending application email index, deployment controls and recovery drill keep production **NOT READY**. See [Phase 7 evidence](docs/phases/phase-07-verification.md), [release gates](docs/release/kivo-v1-release-readiness.md) and [operations](docs/security-and-operations.md).

## 10. Financial API contracts

The existing session authentication remains in use. Obtain the CSRF cookie with
`GET /api/v1/auth/csrf/`, register/log in, and send the current cookie value in
`X-CSRFToken` on writes. Financial POSTs also require `Idempotency-Key` (1–128
characters). A successful first write returns 201; an identical retry returns
200 with the same public ID; conflicting key reuse returns 409.

| Route | Supported operations |
| --- | --- |
| `/api/v1/accounts/` | GET paginated accounts; POST account with optional opening funds |
| `/api/v1/accounts/{uuid}/` | GET; PATCH name or archived state |
| `/api/v1/accounts/summary/` | GET liquid balance, net personal expense, external receipts |
| `/api/v1/categories/` | GET; POST custom category or subcategory |
| `/api/v1/categories/{uuid}/` | GET; PATCH category metadata |
| `/api/v1/categories/defaults/` | POST idempotently seed customizable defaults |
| `/api/v1/transactions/` | GET paginated history; POST receipt, expense, transfer or refund |
| `/api/v1/transactions/{uuid}/` | GET immutable transaction and signed financial effects |
| `/api/v1/transactions/{uuid}/reverse/` | POST reason and Idempotency-Key |
| `/api/v1/transactions/{uuid}/void/` | POST reason and Idempotency-Key |
| `/api/v1/transactions/{uuid}/correct/` | POST complete replacement input and reason, with Idempotency-Key |

Monetary JSON values are exact INR strings, e.g. `"120.50"`. Account creation
accepts `name`, `kind` (`cash`, `bank`, `wallet`), `opened_on` (ISO date) and
`opening_balance` (default `"0.00"`). Opening funds are equity, not income.

Transactions require `kind`, `amount`, `account`, `effective_date` and `title`.
Receipts require `funding_source`; expenses require `category`; transfers require
`destination`; refunds require `original_expense`. Optional expense metadata is
`merchant`, `notes` and `payment_method`. Related resource fields use owned UUIDs.
The API does not accept monetary JSON numbers. Zero/negative financial postings
are rejected. Financial conflicts return 409 and fully roll back; foreign-owned
resource UUIDs return the same 404 as missing resources. Anonymous calls return
401; missing CSRF on authenticated writes returns 403.

History accepts `kind`, `account`, `destination`, `category`, `date_from`,
`date_to`, `amount_min`, `amount_max`, `search`, `ordering` and `page`. Amount
bounds are inclusive exact INR strings and select transaction face amounts;
shared bills still contribute only the owner's expense to spending reports.
Sort fields are `effective_date`,
`created_at`, `amount_paise` (prefix `-` for descending). Response money is always
a decimal string. `/api/schema/` documents the actual generated contracts.
Responses carry a validated/generated `X-Request-ID`; logs contain structured
request metadata and committed write identifiers, never request bodies.

Unexpected API errors remain JSON, including CSRF and unknown-route errors.
Database outages return sanitized 503 responses. A failed financial response may
have an ambiguous commit outcome: retry the identical body with its original
Idempotency-Key. Production schema/docs require authentication. See
[security/deployment procedures](docs/security-and-operations.md).

See [ADR-003](docs/decisions/ADR-003-financial-ledger.md) for ledger semantics,
historical correction order, archival, insufficient-funds rejection and deferred
product decisions. The implementation does not create provisional funds or
silently allow cleared overdrafts.

Run database tests only on the automatically isolated remote PostgreSQL test
database:

```bash
backend/.venv/bin/python -m pytest -v --reuse-db
backend/.venv/bin/python backend/manage.py reconcile_ledger
```

The test setup refuses a database mirror, a non-PostgreSQL engine, or a test name
that equals the development database. `--reuse-db` preserves the separate test
database between runs. Never point test cleanup at the development database.

## 11. Fund source attribution

| Route | Read contract |
| --- | --- |
| `/api/v1/funds/batches/` | Paginated independently traceable source batches |
| `/api/v1/funds/batches/{uuid}/` | Original, allocated, remaining, account holdings and exhaustion |
| `/api/v1/funds/batches/{uuid}/journey/` | Chronological transfers, expense allocations and refunds |
| `/api/v1/funds/batches/{uuid}/breakdown/` | Net expense by category and effective date |
| `/api/v1/funds/allocations/?transaction={uuid}` | All source portions attributed to an owned financial event |
| `/api/v1/funds/summary/` | Snapshot totals, policy version, completeness and explicit gaps |

These APIs are authenticated and read only. `?run={owned snapshot UUID}` selects
a retained historical run; otherwise they use the latest committed run. All money
remains exact INR strings. A batch's remaining capacity is source attribution,
not another account balance. Transfers preserve lineage without consuming source
capacity. Refunds restore original source allocations rather than becoming new
income. Missing/inactive capacities and incomplete exhaustion dates are null.
Exhaustion duration counts inclusive calendar dates. FIFO does not identify which
physical rupees were spent. See [ADR-004](docs/decisions/ADR-004-funding-attribution.md).

Backfill existing journal history after inspecting/applying the additive funds
migrations. New ledger writes refresh attribution atomically:

```bash
python backend/manage.py migrate --plan
python backend/manage.py migrate --noinput
python backend/manage.py rebuild_funds --all
python backend/manage.py rebuild_funds --all --check
```

Backfill may record explicit incomplete legacy attribution and exit with an error;
it never rewrites ledger history or fabricates funding. Recovery, negative-balance
and manual-override policies remain restricted. Phase 5's approved FIFO v2 extends
attribution to receivable custody, recovery and liability-funded borrowing sources.
Prior v1 snapshots and its algorithm remain available. V2 remaining capacity
includes recoverable receivables and is not cash.

Earlier Phase 5–6 evidence used a temporary Python 3.13.16 environment, which has
expired. Current Phase 7 explicitly requires the established Python 3.14.4
environment at `backend/.venv`; do not rebuild or replace it without approval.
The friend-paid rent link follows the approved retained-reserve policy in ADR-005.
Phase 7 is now authorized; its verification is recorded separately.

## 12. Phase 5 contacts, personal rent and reserves

Phase 5 is **PARTIALLY COMPLETE** pending the full verification gate. The
friend-paid rent reserve decision is approved. Recognition and FIFO v2 rules were
approved and are documented in
[ADR-005](docs/decisions/ADR-005-personal-sharing-and-rent.md). The implemented
claims/shared-bill workflows are described below; unexecuted tests are not passes.

| Route | Operations |
| --- | --- |
| `/api/v1/contacts/` | GET; POST display name, notes, roommate classification |
| `/api/v1/contacts/{uuid}/` | GET; PATCH metadata/archive with audit history |
| `/api/v1/contacts/{uuid}/history/` | GET linked financial history |
| `/api/v1/rent/plans/` | GET; POST fixed monthly terms and personal/equal/custom shares |
| `/api/v1/rent/plans/{uuid}/` | GET; PATCH active status |
| `/api/v1/rent/plans/{uuid}/generate/` | POST `through` ISO date; generate unpaid monthly obligations |
| `/api/v1/rent/plans/{uuid}/obligations/` | GET monthly history |
| `/api/v1/rent/obligations/` and `/{uuid}/` | GET issued obligations and derived status |
| `/api/v1/rent/obligations/{uuid}/change-status/` | POST action `skip`/`reopen` and reason |
| `/api/v1/rent/obligations/{uuid}/history/` | GET status audit history |
| `/api/v1/rent/obligations/{uuid}/payments/` | GET payment history; POST confirmed owner-paid or friend-paid personal/shared rent |
| `/api/v1/rent/payments/` and `/{uuid}/` | GET immutable linked payments |
| `/api/v1/rent/payments/{uuid}/correct/` | POST replacement payment input and reason |
| `/api/v1/rent/payments/{uuid}/reverse/` | POST reason; reopen outstanding rent and restore consumed reserve |
| `/api/v1/rent/reserves/` and `/{uuid}/` | GET; POST an earmark linked to an obligation |
| `/api/v1/rent/reserves/{uuid}/adjust/` | POST target amount and reason; zero releases the reserve |
| `/api/v1/rent/reserves/{uuid}/history/` | GET signed changes and whether payment-linked consumption remains active |
| `/api/v1/rent/spending-capacity/` | GET actual liquid balance, active reserves and signed safe-to-spend |

All mutations require `Idempotency-Key`; the owner-wide namespace is shared with
the ledger. Identical retries return 200; first successful mutation returns 201.
Missing/foreign resources return 404. There are no financial DELETE endpoints.
Session cookies and CSRF remain required as documented above. All money uses
exact two-place INR strings.

Rent plans accept `title`, `payee`, `start_date`, `due_day` (null for last day),
`amount`, `category`, optional `split_method` and `participants`. Each participant
has `contact` (null for the owner); custom splits also require `amount`. Equal
splits omit individual amounts and distribute spare paise owner-first, then by
contact UUID. Plans without participants describe personal rent. Terms are fixed;
deactivate and replace a plan to change future terms. Existing obligations remain
auditable. Generation handles February/leap years and clamps days 29–31. Each call
can generate at most 120 new months; repeat calls continue from the last month.

An obligation posts no cash or expense. Owner-paid rent confirmation accepts
`account`, `amount`, `effective_date` and optional `title`, `notes`, `payment_method`.
Friend-paid confirmation supplies an owned `payer` contact instead of `account`.
It immediately recognizes the owner's expense/payable, with no owner cash posting.
Obligation `paid`/`outstanding` refer to the landlord; `friend_payable` separately
shows the remaining debt. Generic bills never infer this obligation link.
Partial payments cannot exceed outstanding rent and must pass historical funding
checks. Corrections use the rent endpoint; generic transaction correction/refund
cannot orphan its obligation. Reversal appends compensating postings and retains
payment history. A skipped obligation needs a reason and cannot have active payments.
Shared rent creates one linked shared bill and one ledger event per payment.
Partial payments distribute remaining contractual shares proportionally with
integer largest-remainder rounding; only the owner's share is personal expense.

Reserve creation accepts `obligation`, `label`, `amount`, `reason`. Adjustment
accepts the new target `amount` and `reason`. Reserves do not alter ledger cash.
Owner payments consume unassigned reserve portions in creation order. Friend-paid
rent preserves protected portions until repayment; partial settlements release
them proportionally with exact integer rounding, and final settlement releases
all remaining protection. Repayments post no new expense. Reversal restores the
exact consumed portions. Manual adjustment cannot release protected portions.
Multiple reserves and claims use ADR-005's deterministic assignment/release rules.
Reserve history includes original payment, claim, settlement and active status.
Skipping unpaid rent releases its unassigned reserves. Per-obligation reserves
cannot exceed unpaid gross landlord rent plus linked outstanding friend payables.
Safe-to-spend is signed:
reserving future rent beyond current cash exposes a shortfall without inventing
funding. Multiple rent earmarks can cover the 2,000 + 400 example; generic budgets
and non-rent reserve workflows are outside this phase.

Expense writes may explicitly use `classification: "gift"` or `"treat"` with an
owned `contact`. These remain personal expenses and create no receivable. Archived
contacts remain visible in existing financial history.

Read-only reconciliation commands:

```bash
python backend/manage.py reconcile_ledger
python backend/manage.py rebuild_funds --all --check
python backend/manage.py reconcile_rent
```

Development journal counts are not substitutes for populated isolated PostgreSQL
tests. The Phase 5 report records the actual verification boundaries.

## 13. Personal lending, shared bills and FIFO v2

| Route | Operations |
| --- | --- |
| `/api/v1/loans/` and `/{event_uuid}/` | GET history/detail; POST `lend` or `borrow` |
| `/api/v1/loans/{event_uuid}/correct/` and `/reverse/` | POST audited replacement or reversal |
| `/api/v1/claims/` and `/{uuid}/` | GET ledger-derived principal, outstanding and settlement status |
| `/api/v1/claims/{uuid}/history/` | GET originating, settlement and reversal events |
| `/api/v1/settlements/` and `/{event_uuid}/` | GET; POST a partial/full settlement of one owned claim |
| `/api/v1/settlements/{event_uuid}/correct/` and `/reverse/` | POST audited correction or reversal |
| `/api/v1/shared-bills/` and `/{bill_uuid}/` | GET; POST owner-paid or friend-paid bill |
| `/api/v1/shared-bills/{bill_uuid}/correct/` and `/reverse/` | POST full replacement or reversal |

Loans require `kind`, `contact`, `account`, `amount`, `effective_date`, `title`;
settlements require `claim` instead of `kind`/`contact`. Optional text fields are
`notes` and `payment_method`. A settlement targets exactly one claim and cannot
exceed its posted outstanding amount. Archived contacts cannot receive new
claims, but existing claims may still be settled. Loans create no personal
expense; borrowing and principal recovery create no external income.

Shared bills require gross `amount`, `title`, `effective_date`, `category`,
`split_method` and `participants`; optional fields are `merchant`, `notes` and
`payment_method`. Null/omitted `payer` means the owner paid and requires `account`.
An owned participating contact as `payer` means friend-paid and requires no owner
account. The owner appears exactly once as a null contact. Equal splits omit
share amounts; custom splits supply exact amounts conserving the gross bill.
Zero owner share is valid and creates no personal expense/payable.

An owner-paid INR 6,000 bill split equally between three participants posts
6,000 cash out, 2,000 personal expense and 4,000 receivables. Reimbursements reduce
receivables without income. A friend-paid bill immediately posts only the owner's
expense/payable; later settlement does not recognize another expense. Event face
amount is the gross bill; `financial_effects` exposes actual signed owner effects.
Generic shared-bill writes do not infer or attach rent obligations. Use the rent
workflow for owner-paid or friend-paid rent to preserve the obligation, payable,
reserve and settlement links without duplicating recognition.

All writes use the existing owner-wide idempotency namespace and PostgreSQL owner
lock. Corrections require complete replacement data plus `reason` and preserve
operation kind. Reverse dependent settlements before correcting/reversing an
origin. Historical shortfalls roll back the entire write. Shared-bill corrections
use their linked workflow; a generic expense refund is not a shared-bill refund.

FIFO v2 retains original source portions in receivable custody, recovers oldest
source portions of the selected claim into the selected account, and resumes
ordinary account FIFO on later spending. Borrowing creates distinct liability
sources, never income. Journey kinds distinguish `expense`, `transfer`, `refund`,
`advance`, `recover` and `principal`. Expense allocations on friend-paid settlement
link the bill's public `expense_event`; allocation date and recognition date may
differ. Batch `receivable_positions` identifies recoverable claim portions.
Lending alone does not exhaust a source. Old `?run=` snapshots remain immutable.

## 14. Phase 6 budgets, dashboard and reports

All endpoints use existing authenticated sessions and ownership scoping. OpenAPI
at `/api/schema/` describes actual input/output serializers. Monetary JSON values
are exact INR strings. Reports derive from immutable ledger effects and existing
FIFO snapshots; they never maintain or modify another balance.

| Route | Operations |
| --- | --- |
| `/api/v1/budgets/` | GET paginated; POST owned overall/category budget |
| `/api/v1/budgets/{uuid}/` | GET progress; PATCH configuration/archive |
| `/api/v1/dashboard/` | GET current accounts, spending, claims, rent, budgets, reserves and activities |
| `/api/v1/transactions/` | Existing history, extended shared filters and stable sorting |
| `/api/v1/reports/summary/` | GET recognized expenses, cash-flow classes, averages and prior-period comparison |
| `/api/v1/reports/trends/` | GET net expense by `interval=day\|week\|month` |
| `/api/v1/reports/breakdown/` | GET `dimension=category\|merchant\|account\|payment_method\|contact\|kind` |
| `/api/v1/reports/funds/` | GET paginated existing funding batches plus classified attribution movements; optional owned `run` |
| `/api/v1/reports/export/` | GET filtered streaming UTF-8 CSV |

Exports include `X-Kivo-Export-Timezone`, `X-Kivo-Export-Generated-At`,
`X-Kivo-Export-Filters` and applicable `X-Kivo-Export-Date-From/To` headers.
Calendar presets are pinned before streaming. CSV exports all selected rows;
history pagination does not limit the export.

Budget creation requires `name`, `period_start`, `period_end`, and `limit`.
`period_type` defaults to `monthly`, which requires one full calendar month;
`custom` permits other inclusive periods. `category` null means overall. A category
budget covers that exact category and its refunds; parent/child budgets are not
implicitly combined. `warning_percent` defaults to 80 (allowed 1–100). All budget
writes require `Idempotency-Key`. Conflicting retries return 409; overlapping
active periods in the same owner/category scope return 400. Archive using PATCH
`archived: true`; audit records are automatic and append-only in PostgreSQL.

Progress returns signed `spent`, `remaining`, `overspending`, exact
`utilization_percent` and `warning_state`: `ok`, `warning`, `at_limit`, `exceeded`.
Zero limits have null utilization, with positive spending marked exceeded.
Budgets never reject otherwise valid spending or change cash. Dashboard reserve
and safe-to-spend values reuse the existing rent earmarks. Current dashboard
budget details are capped at 20 with `budget_count`; use the budget list for more.

History, reports and CSV share `date`, inclusive `date_from`/`date_to`, or
`period=today|yesterday|week|last_seven_days|month|previous_month|year|all`.
`week` is Monday–Sunday; rolling seven days includes today and six prior dates.
Do not combine presets with explicit dates. Add `account`, `destination`,
`category`, `kind`, `contact`, `payment_method`, `merchant`, `search`, and
`sort=newest|oldest|highest|lowest`. Legacy comma-separated `ordering` over
effective date, creation timestamp and amount remains supported, with stable ID
ties. Search retains DRF's term/quoted-phrase behavior and includes associated
contacts. Unknown, repeated, invalid and contradictory parameters return 400.

History defaults to all retained records. Reports and export default to the
current full calendar month. Reports identify INR, Asia/Kolkata, effective-date
bounds, inclusive calendar-day denominator and incomplete-period state. Future
effective entries within a selected full period are included; dashboard calendar
spending separately runs through today. Prior-period percentage comparison is
null for an incomplete current period or nonpositive prior expense. The daily
average includes every selected calendar date, even dates with no expense.

Shared spending is the owner's recognized expense, with borrowing, lending,
recovery, principal returns and transfers separately classified. Rent due alone
is not spending. Refunds reduce expense and budget consumption; corrections and
reversals recalculate through active economic history. Primary-contact breakdown
uses a direct contact or friend payer; multi-contact owner-paid bills appear in
the unassigned group. Contact filters include participants, so separately filtered
participant reports can overlap and should not be added together.

Fund reports expose `expense_attributed`, `refund_restored`, `principal_returned`,
`advanced_to_receivables`, `recovered_from_receivables` and `internal_transferred`.
Advance/recovery/transfer totals are movements, not consumed source capacity.
Remaining capacity includes recoverable receivables; it is not cash. Existing
batch detail/journey endpoints provide provenance and historical snapshots.

CSV includes effective date, stable transaction ID/type, face amount, account,
category, merchant, contacts/source, payment method, notes and status. User text
is protected against spreadsheet formulas. Retained reversed/voided originals
and technical reversals have zero `net_expense_inr`/`net_external_cash_inr`
contribution. Sum those columns to reconcile reports; never sum gross face
amounts as personal spending. The external cash column excludes opening equity
and own transfers. Streaming preloads relationships in chunks of 200.

Multi-query reports and CSV hold the existing owner lock for a consistent read.
An unfinished stream can delay that owner's writes until closed. No cache,
background worker or alternate financial database was introduced. See ADR-006
for date, comparison, classification and concurrency semantics, and the Phase 6
report for executed evidence and remaining gates.
