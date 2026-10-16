# AGENTS.md — Kivo Engineering Directives and Persistent Rules

This file establishes the non-negotiable engineering laws, architectural standards, and operating rules for all AI agents and engineers working on the Kivo codebase.

---

## 1. Project Overview & Architecture
* **Product:** Kivo — Personal Money & Expense Management Application.
* **Architecture:** API-First Modular Monolith (Django 6.x + DRF + remote Supabase-hosted PostgreSQL).
* **Clients:** Serves future Web (React), Android, and iOS clients via a unified `/api/v1/` JSON REST API.
* **Execution Paradigm:** Seven strictly sequential phases (Phase 1 to Phase 7). No phase may begin without explicit user authorization after review of the previous phase's verified deliverables.

---

## 2. Seven Core Code-Quality Principles
Every modification must adhere to:
1. **Readable:** Clear naming, explicit control flow, readable docstrings where non-obvious.
2. **Reusable:** DRY design without premature over-generalization.
3. **Maintainable:** Clean module boundaries, explicit imports, zero hidden couplings.
4. **Secure:** Defense in depth, least privilege, safe logging, input sanitization.
5. **Scalable:** Clean query sets, avoiding N+1 queries, indexes on query keys.
6. **Testable:** Decoupled business logic, pure functions for calculations, test isolation.
7. **Reliable:** Graceful degradation, predictable exceptions, zero silent failures.

---

## 3. Twelve Engineering Principles
1. **SOLID:** Modular, decoupled classes and service boundaries.
2. **DRY:** Eliminate duplicated validation, query logic, and business rules.
3. **KISS:** Prefer straightforward solutions over speculative abstractions.
4. **Separation of Concerns:**
   - Models: Declarative persistence & constraints.
   - Serializers: API input validation and representation.
   - Views: HTTP request/response orchestration.
   - Services: Business operations, state transitions, atomic writes.
   - Selectors: Complex queries, filtering, reporting.
   - Permissions: User authorization.
   - Tests: Behavior verification.
5. **Type Safety:** Modern Python 3.14/3.13 type annotations on all function signatures. Runtime input validation via DRF serializers.
6. **Least Privilege:** Authenticated endpoints by default; scoped DB privileges; no wildcard CORS in production.
7. **Idempotency:** Prepare write pathways to handle network retries safely without duplicate postings.
8. **Observability:** Structured logging, request correlation IDs, clean error reporting. Never log credentials or tokens.
9. **Auditability:** Every financial write must have a durable trail. Never perform untracked destructive mutations.
10. **Fault Tolerance:** Predictable exception handling, safe rollback on failure, explicit error states.
11. **Data Integrity:** Strict PostgreSQL constraints, atomic database transactions (`transaction.atomic`), integer paise for money.
12. **Evidence Provenance:** Every claim of functionality must be backed by an executed command, actual test exit code, or verified database query.

---

## 4. Confirmed Tech Stack & Explicit Exclusions

### Approved Stack
* **Language:** Python 3.14 / 3.13
* **Backend Framework:** Django 6.1.x
* **REST Framework:** Django REST Framework (DRF) 3.18.x
* **Database:** Supabase-hosted PostgreSQL
* **Driver:** `psycopg` 3.3.x (`psycopg[binary,pool]`)
* **ORM:** Django ORM
* **Auth Foundation:** Django Authentication + Custom User Model (`AUTH_USER_MODEL = "users.User"`)
* **API Documentation:** `drf-spectacular` (OpenAPI 3.0/3.1)
* **Testing:** `pytest` + `pytest-django`
* **Linter & Formatter:** `Ruff`
* **Filtering:** `django-filter`

### Explicitly Excluded / Deferred (Do NOT introduce into initial phases)
* ❌ Docker / Docker Compose
* ❌ Redis / Celery / Background workers
* ❌ Kubernetes / Microservices
* ❌ Supabase Auth / Supabase Edge Functions (Django manages identity)
* ❌ MongoDB / Express / Node.js
* ❌ AI / OCR receipt parsing
* ❌ Bank or UPI direct account synchronization

---

## 5. Financial Calculation Invariants (Non-Negotiable)
1. **Exact Integer Arithmetic:** Store and calculate all money in **integer paise** (1 INR = 100 paise).
2. **Zero Floating-Point Arithmetic:** `float` and `FloatField` are strictly forbidden for monetary amounts.
3. **Money Movement ≠ Personal Expense:**
   - Inflows (allowance, salary) are incoming funds, not negative expenses.
   - Transfers between owned accounts change account balances, but total liquid funds remain identical.
   - Loans given to friends are receivables (assets), not expenses.
   - Repayments received reduce receivables, they are not income.
   - Borrowed money increases cash and creates a payable liability, not income.
4. **Atomicity:** All balance adjustments and ledger postings must execute within `django.db.transaction.atomic()`.

---

## 6. Strict Anti-Hallucination & No-Fake-PASS Policy
* NEVER claim a command ran if it did not run.
* NEVER fabricate terminal output, test counts, or benchmarks.
* NEVER claim a database connection succeeded without connecting.
* NEVER invent Supabase credentials or endpoints.
* NEVER replace real PostgreSQL tests with mocked tests and label them "integration tests".
* NEVER disable security checks or fall back to SQLite quietly.
* Status reporting vocabulary:
  - `VERIFIED` — Observed real passing evidence.
  - `PARTIALLY COMPLETE` — Code exists, but verification gates remain.
  - `BLOCKED` — External dependency or credential missing.
  - `FAILED` — An executed check produced an error.
  - `NOT VERIFIED` — Not yet tested.

---

## 7. Document Precedence
When resolving conflicting specifications:
1. User's latest explicit instructions.
2. *Kivo Final Development Suite v1.0*.
3. *Kivo Backend Technology Blueprint v1.0*.
4. *Kivo Product Requirements Document v1.0*.
5. Official technology documentation.
6. Independent implementation recommendations.
