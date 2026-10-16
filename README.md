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
- **Python:** Python 3.12+ (3.14.4 verified in environment).
- **Git:** Git 2.40+.
- **Supabase Account:** Access to a Supabase PostgreSQL instance (Cloud or Dedicated).

---

## 3. Virtual Environment Setup & Installation

All dependencies must be installed inside an isolated virtual environment (never globally):

```bash
# 1. Clone repository (or navigate to workspace root)
cd /path/to/Kivo

# 2. Create Python virtual environment
python3 -m venv backend/.venv

# 3. Create root symlink for developer convenience
ln -s backend/.venv .venv

# 4. Activate virtual environment
source .venv/bin/activate

# 5. Install pinned dependencies from lockfile
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
source .venv/bin/activate
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

* **Current Phase:** Phase 1 — Foundation & Infrastructure (**COMPLETE / PENDING SUPABASE URL**).
* **Next Phase:** Phase 2 — Authentication & User System (Awaiting user authorization).
* **Architecture Rules:** See [AGENTS.md](AGENTS.md) for permanent engineering principles, financial calculation invariants, and anti-hallucination policies.
