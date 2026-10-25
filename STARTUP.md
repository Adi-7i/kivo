# Kivo Developer Startup & Operations Guide

Welcome to the Kivo developer documentation. This guide walks you through setting up, running, testing, and maintaining both the Kivo backend (Django REST Framework) and frontend (Next.js) from a completely clean environment to production readiness.

---

## Table of Contents

1. [Architecture & System Overview](#1-architecture--system-overview)
2. [Prerequisites & System Requirements](#2-prerequisites--system-requirements)
3. [Repository Structure](#3-repository-structure)
4. [Backend Setup (Django & PostgreSQL)](#4-backend-setup-django--postgresql)
   * [Step A: Navigate to Backend](#step-a-navigate-to-backend)
   * [Step B: Create & Activate Virtual Environment](#step-b-create--activate-virtual-environment)
   * [Step C: Install Python Dependencies](#step-c-install-python-dependencies)
   * [Step D: Configure Environment Variables](#step-d-configure-environment-variables)
   * [Step E: Run Database Migrations](#step-e-run-database-migrations)
   * [Step F: Create an Administrative User](#step-f-create-an-administrative-user-optional)
   * [Step G: Start the Backend Server](#step-g-start-the-backend-server)
   * [Step H: Verify Backend Health Endpoints](#step-h-verify-backend-health-endpoints)
   * [Step I: Run Backend Test Suite](#step-i-run-backend-test-suite)
   * [Step J: Code Quality & Linting](#step-j-code-quality--linting)
5. [Frontend Setup (Next.js & React)](#5-frontend-setup-nextjs--react)
   * [Step A: Navigate to Frontend](#step-a-navigate-to-frontend)
   * [Step B: Verify Package Manager](#step-b-verify-package-manager)
   * [Step C: Install Node Dependencies](#step-c-install-node-dependencies)
   * [Step D: Configure Environment Variables](#step-d-configure-environment-variables-1)
   * [Step E: Start the Frontend Server](#step-e-start-the-frontend-server)
   * [Step F: Verify Frontend UI](#step-f-verify-frontend-ui)
   * [Step G: Frontend Quality Checks](#step-g-frontend-quality-checks)
6. [Running the Full Development Environment](#6-running-the-full-development-environment)
7. [First-Time User Journey & API Walkthrough](#7-first-time-user-journey--api-walkthrough)
8. [Daily Development Workflow](#8-daily-development-workflow)
9. [Backend Production Deployment](#9-backend-production-deployment)
10. [Frontend Production Deployment](#10-frontend-production-deployment)
11. [Database Operations & Migration Safety](#11-database-operations--migration-safety)
12. [Security & Environment Checklist](#12-security--environment-checklist)
13. [Troubleshooting Guide](#13-troubleshooting-guide)
14. [Developer Verification Checklist](#14-developer-verification-checklist)

---

## 1. Architecture & System Overview

Kivo operates as an **API-first modular monolith**:

```
+-----------------------------------------------------------------+
|                     Next.js Frontend (Port 3000)                |
|           React 19, TypeScript Strict, Tailwind CSS v4          |
|      State: TanStack Query  |  Forms: React Hook Form + Zod     |
+-----------------------------------------------------------------+
                               |
                HTTP / JSON REST API with Cookies
              (credentials: "include", CSRF token)
                               |
                               v
+-----------------------------------------------------------------+
|                    Django REST Backend (Port 8000)              |
|                     Python 3.13+, Django 6.1.2                  |
|  Apps: users | ledger | funds | sharing | reports | common       |
|    Strict Integer Arithmetic (Paise)  |  Session Auth           |
+-----------------------------------------------------------------+
                               |
                     PostgreSQL Connection
                   (psycopg 3.3.6 with SSL)
                               |
                               v
+-----------------------------------------------------------------+
|               Supabase PostgreSQL Database                      |
|       Port 5432 (Direct / Migrations) | Port 6543 (Pooler)      |
+-----------------------------------------------------------------+
```

### Current Implementation Status
* **Backend:** Mature and complete (Phase 7). All core domain endpoints, atomic balance services, calculations, reporting, and 293+ automated tests are verified.
* **Frontend:** Foundation & Architecture ready (Phase 1). Global styling, design system tokens, typography, route layout, and type-safe API client are operational. Domain view screens are actively being integrated.

---

## 2. Prerequisites & System Requirements

Before starting, ensure your local development system meets the following requirements:

| Tool | Required Version | Verification Command | Notes |
|:---|:---|:---|:---|
| **Python** | `3.13+` (Dev: `3.14.4`) | `python3 --version` | Standard Linux/macOS binary or python.org installer |
| **Node.js** | `24.x LTS` | `node --version` | Required for Next.js 16 |
| **pnpm** | `12.x+` (Dev: `12.10.1`) | `pnpm --version` | Install via `npm install -g pnpm` or `corepack` |
| **Git** | `2.40+` | `git --version` | Version control |
| **PostgreSQL** | Supabase or PG `15+` | `psql --version` (optional) | Remote Supabase project or local instance |
| **libpq / SSL** | System libraries | OS-dependent | Needed by `psycopg` for TLS connections |

### Operating System Support
* **Linux (Ubuntu / Debian / Fedora / Arch):** Fully supported natively. Ensure `python3-venv` and OpenSSL headers are installed.
* **macOS (Apple Silicon / Intel):** Fully supported via Homebrew (`brew install python@3.13 node pnpm`).
* **Windows (WSL2):** Recommended to run inside WSL2 (Ubuntu 24.04). Native Windows Command Prompt/PowerShell works for standard commands with path adjustments (`\` vs `/`).

---

## 3. Repository Structure

```
kivo/
├── backend/                       # Django REST Framework application
│   ├── apps/
│   │   ├── users/                 # Custom User model, session auth, profiles
│   │   ├── ledger/                # Accounts, categories, transactions, budgets
│   │   ├── funds/                 # Dedicated savings envelopes & targets
│   │   ├── sharing/               # Rent plans, obligations, loans, shared bills
│   │   └── reports/               # Financial analytics, cash flow, CSV exports
│   ├── common/                    # Shared utilities, env loader, db URL parser
│   ├── config/                    # Django configuration & settings
│   │   ├── settings/
│   │   │   ├── base.py            # Common configuration, apps, DRF, auth
│   │   │   ├── development.py     # Local dev settings (DEBUG=True, CORS, SQLite/Supabase)
│   │   │   └── production.py      # Production settings (DEBUG=False, strict security)
│   │   ├── urls.py                # Root URL dispatcher (/api/v1/)
│   │   └── wsgi.py                # WSGI entry point for web servers
│   ├── manage.py                  # Django CLI runner
│   └── .venv/                     # Python virtual environment (ignored by Git)
├── kivo-frontend/                 # Next.js 16 web application
│   ├── public/                    # Static assets
│   ├── src/
│   │   ├── app/                   # App Router pages and layout structure
│   │   ├── components/            # shadcn/ui and reusable UI components
│   │   ├── features/              # Domain-specific feature modules
│   │   └── lib/                   # API client, query client, utility helpers
│   ├── package.json               # Frontend dependencies and npm scripts
│   ├── pnpm-lock.yaml             # Frozen dependency graph
│   └── tsconfig.json              # TypeScript strict configuration
├── deploy/                        # Production deployment configurations
│   └── gunicorn.conf.py           # Gunicorn WSGI server configuration
├── docs/                          # Architecture documentation and assets
│   ├── assets/kivo-logo.png       # Official Kivo logo
│   └── security-and-operations.md # Security baselines and operational protocols
├── tests/                         # Pytest automated test suite (31 test files)
├── .env.example                   # Master backend environment variable template
├── AGENTS.md                      # Persistent engineering directives and standards
├── pyproject.toml                 # Backend project metadata
├── README.md                      # Master GitHub landing page
├── requirements.lock              # Pinned Python dependency lockfile
└── STARTUP.md                     # This documentation file
```

---

## 4. Backend Setup (Django & PostgreSQL)

### Step A: Navigate to Backend
Open your terminal and enter the project root, then move to `backend`:

```bash
cd /path/to/kivo/backend
```

### Step B: Create & Activate Virtual Environment
Use Python 3.13 or 3.14 to create an isolated virtual environment:

```bash
# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate

# Windows (Command Prompt)
# python -m venv .venv
# .venv\Scripts\activate.bat

# Windows (PowerShell)
# python -m venv .venv
# .venv\Scripts\Activate.ps1
```

Confirm that the virtual environment is active:
```bash
which python   # Expected: /path/to/kivo/backend/.venv/bin/python
python --version
```

### Step C: Install Python Dependencies
Install all pinned dependencies from the root `requirements.lock` file:

```bash
pip install --upgrade pip
pip install -r ../requirements.lock
```

*Key installed packages:* `Django==6.1.2`, `djangorestframework==3.18.3`, `psycopg==3.3.6`, `drf-spectacular==0.29.0`, `django-filter==25.2`, `pytest==9.0.2`, `ruff==0.15.5`.

### Step D: Configure Environment Variables
Copy the root `.env.example` file to create your local `.env` file:

```bash
# From the backend directory:
cp ../.env.example .env
```

Open `.env` in your text editor and configure the values:

```ini
# Security & Debug
DJANGO_SECRET_KEY="replace-this-with-a-random-secret-key-at-least-50-chars-long"
DJANGO_DEBUG="True"
DJANGO_ALLOWED_HOSTS="127.0.0.1,localhost,0.0.0.0"
DJANGO_SETTINGS_MODULE="backend.config.settings.development"

# Remote Supabase Database URL
# Format: postgresql://[user]:[password]@[host]:[port]/[database]
# Tip: Use port 5432 (Direct / Session mode) for running migrations.
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Optional Supabase API references
SUPABASE_URL="https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_KEY="your-supabase-anon-or-service-key"

# CORS and CSRF (Allows Next.js frontend on port 3000)
CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
CSRF_TRUSTED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
```

> **How Kivo loads `.env`:** The development settings call `backend.common.env.load_dotenv()`, which searches the current directory and parent directories for `.env`. The database connector (`backend.common.db.parse_supabase_db_url`) automatically formats connection options for Supabase SSL connections.

### Step E: Run Database Migrations
Execute Django database migrations to apply the complete schema:

```bash
python manage.py migrate
```

*Expected output:*
```text
Operations to perform:
  Apply all migrations: admin, auth, contenttypes, funds, ledger, reports, sessions, sharing, users
Running migrations:
  Applying contenttypes.0001_initial... OK
  Applying users.0001_initial... OK
  ...
  Applying reports.0001_initial... OK
```

### Step F: Create an Administrative User (Optional)
If you wish to access the Django admin portal (`/admin/`), create a superuser:

```bash
python manage.py createsuperuser
```
Follow the interactive prompts to provide an email and password.

### Step G: Start the Backend Server
Run the local development HTTP server:

```bash
python manage.py runserver 127.0.0.1:8000
```

*Expected output:*
```text
Django version 6.1.2, using settings 'backend.config.settings.development'
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

### Step H: Verify Backend Health Endpoints
Open a second terminal window to verify server and database connectivity:

```bash
# 1. Server liveness check
curl -s http://127.0.0.1:8000/api/v1/health/ | jq .
# Expected output: {"status": "ok"}

# 2. Database readiness check
curl -s http://127.0.0.1:8000/api/v1/health/db/ | jq .
# Expected output: {"status": "ok", "database": "connected"}
```

You can also view the interactive OpenAPI documentation in your browser:
* **Swagger UI:** `http://127.0.0.1:8000/api/v1/schema/swagger-ui/`
* **ReDoc:** `http://127.0.0.1:8000/api/v1/schema/redoc/`

### Step I: Run Backend Test Suite
The repository includes a comprehensive test suite with 293+ unit and integration tests. Run tests from the repository root or backend directory with your virtual environment active:

```bash
# From repository root or backend directory
pytest -v
```

*Expected result:* 293+ passed tests in ~15-20 seconds.

### Step J: Code Quality & Linting
Run Ruff to check formatting and code conventions:

```bash
# Check for lint violations
ruff check .

# Check formatting compliance
ruff format --check .
```

---

## 5. Frontend Setup (Next.js & React)

### Step A: Navigate to Frontend
Open a new terminal window and navigate to the frontend directory:

```bash
cd /path/to/kivo/kivo-frontend
```

### Step B: Verify Package Manager
Kivo uses `pnpm` (version 12.x). Verify that `pnpm` is installed:

```bash
pnpm --version
```
If not installed, install it globally:
```bash
npm install -g pnpm@12
```

### Step C: Install Node Dependencies
Install frontend dependencies strictly adhering to the lockfile:

```bash
pnpm install
```

### Step D: Configure Environment Variables
Create a local `.env.local` file from the provided example:

```bash
cp .env.example .env.local
```

Ensure `.env.local` contains the backend API base URL:

```ini
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

> **Client Configuration:** The frontend client at `src/lib/api/client.ts` uses `NEXT_PUBLIC_API_URL` to prefix all API requests and automatically transmits `credentials: "include"` for session cookie authentication and CSRF headers.

### Step E: Start the Frontend Server
Start the Next.js development server:

```bash
pnpm run dev
```

*Expected output:*
```text
  ▲ Next.js 16.4.2
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Starting...
 ✓ Ready in 1.4s
```

### Step F: Verify Frontend UI
Open `http://localhost:3000` in your web browser.

> **Note on Initial View:** The root page (`/`) currently displays the **Design System & Architecture Preview** confirming that Phase 1 (Foundation) is active. The navigation bar provides access to authentication screens (`/login`, `/register`) and layout wrappers for dashboard, money, rent, and reports.

### Step G: Frontend Quality Checks
Run the following scripts to ensure code quality:

```bash
# 1. Type check TypeScript definitions
pnpm run typecheck

# 2. Run Next.js linter
pnpm run lint

# 3. Verify Prettier code formatting
pnpm run format:check

# 4. Run Vitest component and unit tests
pnpm run test

# 5. Run Playwright end-to-end tests (optional, requires browser binaries)
# pnpm exec playwright install
# pnpm run test:e2e
```

---

## 6. Running the Full Development Environment

To run the complete Kivo stack, open two separate terminal windows:

### Terminal 1: Backend API
```bash
cd /path/to/kivo/backend
source .venv/bin/activate
python manage.py runserver 127.0.0.1:8000
```
*Listens on:* `http://127.0.0.1:8000`

### Terminal 2: Frontend Web App
```bash
cd /path/to/kivo/kivo-frontend
pnpm run dev
```
*Listens on:* `http://localhost:3000`

### Recommended Startup Order
1. Start the **backend** first and ensure `curl http://127.0.0.1:8000/api/v1/health/db/` returns `"status": "ok"`.
2. Start the **frontend**. This ensures that any initial data fetches or session validations find an active API.

---

## 7. First-Time User Journey & API Walkthrough

To verify end-to-end flow from account creation to ledger entry:

### Step 1: Obtain a CSRF Token
Because Kivo uses Django session authentication with CSRF protection, fetch a fresh CSRF cookie:

```bash
curl -c cookies.txt -b cookies.txt -s http://127.0.0.1:8000/api/v1/auth/csrf/ | jq .
```
*Response:* `{"detail": "CSRF cookie set"}`

### Step 2: Register a New User
```bash
# Extract CSRF token from cookies.txt (or response header)
CSRF_TOKEN=$(grep csrftoken cookies.txt | awk '{print $7}')

curl -c cookies.txt -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -d '{
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "first_name": "Alex",
    "last_name": "Morgan"
  }' | jq .
```

### Step 3: Verify the Authenticated Session
```bash
curl -c cookies.txt -b cookies.txt -s http://127.0.0.1:8000/api/v1/auth/me/ | jq .
```
*Response:*
```json
{
  "id": "...",
  "email": "user@example.com",
  "first_name": "Alex",
  "last_name": "Morgan"
}
```

### Step 4: Create a Liquid Account (Savings / Cash)
Amounts in Kivo are stored strictly in **integer paise** (1 INR = 100 paise; 5,000 INR = 500,000 paise):

```bash
curl -c cookies.txt -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/accounts/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -d '{
    "name": "Main Savings",
    "account_type": "SAVINGS",
    "initial_balance_paise": 500000,
    "is_active": true
  }' | jq .
```

### Step 5: Create a Transaction
Record an expense of 150 INR (15,000 paise):

```bash
curl -c cookies.txt -b cookies.txt -X POST http://127.0.0.1:8000/api/v1/transactions/ \
  -H "Content-Type: application/json" \
  -H "X-CSRFToken: $CSRF_TOKEN" \
  -d '{
    "account": "<ACCOUNT_UUID_FROM_STEP_4>",
    "amount_paise": 15000,
    "transaction_type": "EXPENSE",
    "description": "Grocery essentials",
    "transaction_date": "2026-10-24T12:00:00Z"
  }' | jq .
```

---

## 8. Daily Development Workflow

Follow this standard routine when adding features or fixing bugs:

1. **Keep Environment Updated:**
   ```bash
   git pull origin main
   # Backend
   cd backend && source .venv/bin/activate && pip install -r ../requirements.lock && python manage.py migrate
   # Frontend
   cd ../kivo-frontend && pnpm install
   ```

2. **Branching:**
   Always create a focused feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Modifying Models:**
   When altering Django models in `backend/apps/*/models.py`:
   ```bash
   cd backend
   python manage.py makemigrations
   python manage.py migrate
   ```
   *Invariants Check:* Never introduce `FloatField` or `DecimalField` for currency amounts. All monetary figures must be integer paise fields (`BigIntegerField` or `IntegerField`).

4. **Running Pre-Commit Verification:**
   Before pushing any commit, ensure both test suites pass cleanly:
   ```bash
   # Backend checks
   cd backend
   ruff check .
   ruff format --check .
   pytest

   # Frontend checks
   cd ../kivo-frontend
   pnpm run typecheck
   pnpm run lint
   pnpm run test
   ```

---

## 9. Backend Production Deployment

Kivo includes a dedicated production configuration module at `backend/config/settings/production.py` and a Gunicorn configuration file at `deploy/gunicorn.conf.py`.

### A. Production Environment Enforcement
When `DJANGO_SETTINGS_MODULE="backend.config.settings.production"` is set, Django enforces the following non-negotiable security requirements at startup:
* `DJANGO_DEBUG` must be set to `"False"`. If `True`, the application refuses to start.
* `DJANGO_SECRET_KEY` must be provided, cannot be empty, and cannot contain `"insecure"` or default templates.
* `DJANGO_ALLOWED_HOSTS` cannot be empty and cannot contain wildcard `*`.
* `CSRF_TRUSTED_ORIGINS` must only contain origins beginning with `https://`.
* `SECURE_SSL_REDIRECT = True` and `SECURE_HSTS_SECONDS = 31536000` (1 year) are active.
* `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True` are active.

### B. WSGI Application Entry Point
The WSGI callable is located at:
```text
backend.config.wsgi:application
```

### C. Gunicorn WSGI Server
The repository provides a production-tuned configuration at `deploy/gunicorn.conf.py`:

```python
# deploy/gunicorn.conf.py highlights
wsgi_app = "backend.config.wsgi:application"
bind = "127.0.0.1:8000"
workers = 3
worker_class = "sync"
timeout = 60
keepalive = 5
accesslog = "-"
errorlog = "-"
```

> **Note on Gunicorn Installation:** Gunicorn is not included in the development virtual environment by default. Before running in production, install Gunicorn in your target environment:
> ```bash
> pip install gunicorn
> ```
> Run Gunicorn using the repository configuration:
> ```bash
> gunicorn -c deploy/gunicorn.conf.py
> ```

### D. Reverse Proxy Architecture (Nginx / Caddy)
In production, place a hardened reverse proxy in front of Gunicorn to handle SSL termination, static file delivery, and path routing:

```nginx
# Example Nginx snippet
server {
    listen 443 ssl http2;
    server_name api.kivo.app;

    ssl_certificate /etc/letsencrypt/live/api.kivo.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.kivo.app/privkey.pem;

    location /static/ {
        alias /path/to/kivo/backend/staticfiles/;
    }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 10. Frontend Production Deployment

### A. Production Build
Compile the optimized Next.js production bundle:

```bash
cd /path/to/kivo/kivo-frontend
pnpm run build
```

This generates an optimized output in the `.next/` directory.

### B. Production Start
Run the Next.js production server:

```bash
pnpm run start
```
By default, this listens on port 3000. Use `PORT=3000` to adjust if needed.

### C. Hosting Considerations
* **Node.js Server:** Can be hosted on any Linux VM or container with Node.js 24 installed.
* **Edge / Serverless:** Can be deployed to Vercel or similar platforms configured with `NEXT_PUBLIC_API_URL` pointing to your production Django API.
* *Note:* No containerization (Docker) or specialized cloud manifests are currently included in the repository by architectural design.

---

## 11. Database Operations & Migration Safety

Kivo uses PostgreSQL hosted on Supabase. To avoid service disruptions, observe these database directives:

### Direct vs. Pooler Connection Ports
* **Port 5432 (Session Mode / Direct):** Always use port 5432 for executing migrations (`python manage.py migrate`). Transaction poolers on port 6543 do not support PostgreSQL DDL locks or prepared statement lifecycles.
* **Port 6543 (Transaction Pooler):** Best suited for high-concurrency runtime queries if your connection volume exceeds pool thresholds.

### Migration Safety Rules
1. **Inspect Migration SQL:** Before applying any migration to production, inspect the generated SQL:
   ```bash
   python manage.py sqlmigrate <app_name> <migration_number>
   ```
2. **Zero Floating-Point Columns:** Verify that no schema changes add `float` or `decimal` fields for monetary figures.
3. **Atomic Operations:** All balance writes, fund transfers, and settlement executions must remain wrapped in `transaction.atomic()`.
4. **Never Perform Untracked Deletions:** Always archive or soft-deactivate financial records rather than executing destructive hard-deletes.

---

## 12. Security & Environment Checklist

Before exposing any Kivo instance publicly, verify each item:

- [ ] `DJANGO_DEBUG` is set to `"False"`.
- [ ] `DJANGO_SECRET_KEY` is a 50+ character cryptographically random string stored strictly in environment variables.
- [ ] `DJANGO_ALLOWED_HOSTS` contains only the exact production domain(s).
- [ ] `CSRF_TRUSTED_ORIGINS` contains only valid `https://` URLs.
- [ ] `CORS_ALLOWED_ORIGINS` is restricted to authorized frontend origins.
- [ ] Database credentials use SSL (`sslmode=require`).
- [ ] Django admin URL is either protected by IP restriction or disabled if not needed.
- [ ] No `.env` or `.env.local` files are tracked in version control (verify with `git status`).
- [ ] Python packages and Node packages are installed strictly from locked files (`requirements.lock`, `pnpm-lock.yaml`).

---

## 13. Troubleshooting Guide

### Issue 1: `ModuleNotFoundError: No module named 'backend'`
* **Symptom:** Running `python manage.py migrate` fails with `ModuleNotFoundError: No module named 'backend'`.
* **Cause:** Python path cannot resolve the `backend` package root when executing `manage.py` from an unexpected working directory.
* **Verification:** Run `pwd` to check current directory.
* **Resolution:** Ensure you are in `/path/to/kivo/backend` before running `manage.py`, or set `PYTHONPATH=.`.

### Issue 2: `psycopg.OperationalError: connection to server ... failed`
* **Symptom:** Database connection times out or fails during `migrate` or server startup.
* **Cause:** Incorrect `DATABASE_URL`, wrong Supabase password, network firewall blocking port 5432, or missing SSL mode.
* **Verification:** Run `python -c "import psycopg; psycopg.connect('$DATABASE_URL')"` inside your virtual environment.
* **Resolution:** Check your Supabase database credentials. Ensure your project is not paused. Append `?sslmode=require` if connecting directly.

### Issue 3: `django.core.exceptions.ImproperlyConfigured: Production requires DJANGO_DEBUG=False`
* **Symptom:** The backend process exits immediately on startup with `ImproperlyConfigured`.
* **Cause:** `DJANGO_SETTINGS_MODULE` is set to `backend.config.settings.production` while `DJANGO_DEBUG` is set to `True` or not specified.
* **Verification:** Check `echo $DJANGO_DEBUG` or inspect `.env`.
* **Resolution:** In production, explicitly set `DJANGO_DEBUG="False"`. In local development, use `DJANGO_SETTINGS_MODULE="backend.config.settings.development"`.

### Issue 4: CSRF Verification Failed (HTTP 403) on API Requests
* **Symptom:** POST, PUT, or DELETE requests to `/api/v1/*` return `403 Forbidden` with `"detail": "CSRF Failed: CSRF cookie not set."` or `"CSRF token missing or incorrect"`.
* **Cause:** Django session authentication requires a valid CSRF token header (`X-CSRFToken`) matching the `csrftoken` cookie.
* **Verification:** Check request headers in browser network tab or curl output.
* **Resolution:**
  1. Call `GET /api/v1/auth/csrf/` to initialize the CSRF cookie.
  2. In your request, send header `X-CSRFToken: <value_of_csrftoken_cookie>`.
  3. Ensure `CSRF_TRUSTED_ORIGINS` in backend settings includes the caller's origin (e.g., `http://localhost:3000`).

### Issue 5: Port 8000 or 3000 Already in Use
* **Symptom:** `Error: That port is already in use.` or `listen EADDRINUSE: address already in use :::3000`.
* **Cause:** A previous instance of Django `runserver` or Next.js `next dev` is still running in the background.
* **Verification:**
  ```bash
  lsof -i :8000
  lsof -i :3000
  ```
* **Resolution:** Terminate the occupying process:
  ```bash
  kill -9 <PID>
  ```
  Or launch the server on an alternate port:
  ```bash
  # Backend
  python manage.py runserver 127.0.0.1:8001
  # Frontend
  pnpm run dev -- -p 3001
  ```

### Issue 6: Next.js API Requests Fail (`fetch failed` / `ECONNREFUSED`)
* **Symptom:** Frontend UI displays network error banners; browser console shows `Failed to fetch`.
* **Cause:** The backend Django server is not running on port 8000, or `NEXT_PUBLIC_API_URL` in `kivo-frontend/.env.local` is misconfigured.
* **Verification:** Test backend liveness directly:
  ```bash
  curl -I http://127.0.0.1:8000/api/v1/health/
  ```
* **Resolution:** Verify backend is active. Confirm `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000` in `kivo-frontend/.env.local`. Restart `pnpm run dev`.

### Issue 7: Python 3.14 / 3.13 Virtual Environment Build Failures
* **Symptom:** Installing dependencies via `pip` fails with C compilation errors when building wheels.
* **Cause:** Missing local C compiler or development headers for OpenSSL.
* **Verification:** Note which package failed to build (usually `psycopg` or `cryptography`).
* **Resolution:** Ensure binary wheels are used (`requirements.lock` specifies `psycopg[binary,pool]`). On Ubuntu/Debian, run:
  ```bash
  sudo apt-get install -y build-essential libpq-dev libssl-dev
  ```

### Issue 8: `pnpm install` Lockfile Mismatch or Version Warning
* **Symptom:** `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` or warnings regarding package manager version.
* **Cause:** Using npm, yarn, or an older major version of pnpm (e.g., pnpm 8/9).
* **Verification:** Run `pnpm --version`.
* **Resolution:** Update to pnpm 12:
  ```bash
  npm install -g pnpm@12
  pnpm install --frozen-lockfile
  ```

### Issue 9: Database Migration Errors on Supabase Transaction Pooler (Port 6543)
* **Symptom:** `django.db.utils.OperationalError: cannot execute CREATE TABLE in a read-only transaction` or prepared statement errors.
* **Cause:** Running migrations through Supabase's transaction pooler (port 6543) instead of direct session connection (port 5432).
* **Verification:** Inspect the port number in your `DATABASE_URL`.
* **Resolution:** Change port from `6543` to `5432` in `DATABASE_URL` when executing `python manage.py migrate`.

### Issue 10: `gunicorn: command not found` in Production
* **Symptom:** Shell returns `command not found: gunicorn` when deploying.
* **Cause:** Gunicorn is not installed in the Python environment by default.
* **Verification:** Run `pip show gunicorn`.
* **Resolution:** Explicitly install Gunicorn in the target environment:
  ```bash
  pip install gunicorn
  ```

### Issue 11: Floating-Point Value Passed to Monetary Endpoint
* **Symptom:** API returns `400 Bad Request` with `"amount_paise": ["A valid integer is required."]`.
* **Cause:** Attempting to submit decimal currency (e.g. `150.50`) instead of integer paise (`15050`).
* **Verification:** Check the JSON request payload.
* **Resolution:** Convert all amounts to integer paise prior to submission: `Math.round(amountInRupees * 100)`.

### Issue 12: Frontend Tailwind CSS Styles Not Updating
* **Symptom:** CSS changes do not reflect in the browser during development.
* **Cause:** Stale Next.js compilation cache in `.next/`.
* **Verification:** Inspect browser styles and check if new classes are emitted.
* **Resolution:** Stop the development server and clear the cache:
  ```bash
  rm -rf .next
  pnpm run dev
  ```

---

## 14. Developer Verification Checklist

Before considering your local setup complete, verify that every check passes:

```bash
# 1. Backend virtual environment active
python -c "import django, rest_framework, psycopg; print('Backend modules OK')"

# 2. Database migrations applied
python manage.py showmigrations | grep '\[ \]'
# (Should return no unapplied migrations)

# 3. Backend tests pass
pytest
# (293+ passed)

# 4. Code quality checks pass
ruff check .
ruff format --check .

# 5. Backend health responds
curl -s http://127.0.0.1:8000/api/v1/health/ | grep '"status":"ok"'
curl -s http://127.0.0.1:8000/api/v1/health/db/ | grep '"status":"ok"'

# 6. Frontend type check and tests pass
cd ../kivo-frontend
pnpm run typecheck
pnpm run test

# 7. Frontend dev server renders
curl -s http://localhost:3000 | grep -i "Kivo"
```

If all 7 checks succeed, your local Kivo environment is fully operational!
