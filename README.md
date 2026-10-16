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
* **Phase 5:** Not authorized and not implemented.
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
and manual-override policy decisions are deferred. Phase 5 is not implemented.

The requested Python 3.13 runtime was verified using a separately built Python
3.13.16 environment under `/tmp/kivo-venv313`; the existing Python 3.14 environment
was preserved. Substitute your activated Python 3.13 interpreter for the temporary
verification prefix in the reports. No new application dependency was introduced.
Phase 5 foundation readiness is READY; starting it requires separate authorization.
