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

* **Phase 2 prerequisite:** PASS on Python 3.14.4: 69 regression tests passed against isolated remote PostgreSQL. See [readiness evidence](docs/phases/phase-02-readiness.md).
* **Phase 3:** PASS: 107 tests passed on Python 3.13.16 against isolated remote PostgreSQL. See [verification](docs/phases/phase-03-verification.md).
* **Phase 4:** PASS: dedicated gate 25 passed; final full regression **129 passed** on Python 3.13.16 against isolated remote PostgreSQL. See [verification](docs/phases/phase-04-verification.md).
* **Phase 5:** PARTIALLY COMPLETE; approved lending/shared posting and FIFO v2 are undergoing Python 3.13/PostgreSQL verification. The earlier **160-test** run covers the previous contacts/personal-rent/reserve scope. A linked friend-paid rent reserve decision is pending in [ADR-005](docs/decisions/ADR-005-personal-sharing-and-rent.md). See [Phase 5 evidence](docs/phases/phase-05-verification.md). Phase 6 readiness: NOT READY.
* **Phase 6:** Authorized, **BLOCKED** at the Phase 5 prerequisite gate. The current diagnostic run passed **39 tests on Python 3.14.4**, including real remote PostgreSQL checks; it does not verify the missing lending/shared workflows or Phase 6 features. See [evidence](docs/phases/phase-06-verification.md) and the [implementation plan](docs/phases/phase-06-plan.md). Phase 7 readiness: NOT READY.
* **Architecture Rules:** See [AGENTS.md](AGENTS.md) for permanent engineering principles, financial calculation invariants, and anti-hallucination policies.

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
`date_to`, `search`, `ordering` and `page`. Sort fields are `effective_date`,
`created_at`, `amount_paise` (prefix `-` for descending). Response money is always
a decimal string. `/api/schema/` documents the actual generated contracts.
Responses carry a validated/generated `X-Request-ID`; logs contain structured
request metadata and committed write identifiers, never request bodies.

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

The temporary Python 3.13.16 verification environment has been rebuilt under
`/tmp/kivo-venv313` with the unchanged lockfile. Earlier Phase 6 prerequisite
diagnostics used Python 3.14.4; current Phase 5 evidence records the new Python
3.13 runs separately. No new application dependency was introduced. Phase 6
implementation must wait for every mandatory Phase 5 gate. Phase 7 remains excluded.

## 12. Phase 5 contacts, personal rent and reserves

Phase 5 is **PARTIALLY COMPLETE** pending the full verification gate and the
linked friend-paid rent reserve decision. Recognition and FIFO v2 rules were
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
| `/api/v1/rent/obligations/{uuid}/payments/` | GET payment history; POST confirmed owner-paid personal/shared rent |
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
Partial payments cannot exceed outstanding rent and must pass historical funding
checks. Corrections use the rent endpoint; generic transaction correction/refund
cannot orphan its obligation. Reversal appends compensating postings and retains
payment history. A skipped obligation needs a reason and cannot have active payments.
Shared rent creates one linked shared bill and one ledger event per payment.
Partial payments distribute remaining contractual shares proportionally with
integer largest-remainder rounding; only the owner's share is personal expense.

Reserve creation accepts `obligation`, `label`, `amount`, `reason`. Adjustment
accepts the new target `amount` and `reason`. Reserves do not alter ledger cash.
Payment consumes linked reserves in creation order, and reversal restores only
the amount consumed by that payment. Skipping unpaid rent releases its reserves.
Per-obligation reserves cannot exceed unpaid gross rent. Safe-to-spend is signed:
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
workflow for owner-paid rent; friend-paid rent linking awaits the documented
reserve decision so it cannot silently mark rent paid or duplicate its recognition.

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
