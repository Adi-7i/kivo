# ADR-002: Architecture Baseline and Modularity Principles

* **Status:** Accepted
* **Date:** 2026-10-16
* **Deciders:** Backend Architect, Security Engineer, QA Engineer

---

## 1. Context and Problem Statement

Kivo is a personal money and expense management application designed to support multiple client form factors (future React web, Android, iOS) through a single versioned REST API (`/api/v1/`). The architecture must ensure strict data integrity, auditability, user-level data isolation, and clear boundaries without premature microservice complexity.

---

## 2. Decision: API-First Modular Monolith

Kivo adopts an **API-first modular monolith** structure within a unified Django application framework:

1. **Layered Request Lifecycle:**
   - **Transport / API Layer:** DRF ViewSets / APIViews handle HTTP semantics, input deserialization, and HTTP status codes.
   - **Validation Layer:** DRF Serializers validate payload types, formats, and basic invariants.
   - **Domain Service Layer:** Python modules (`services.py`) execute transactional business operations, state transitions, allocation math, and enforce multi-entity invariants.
   - **Query / Selector Layer:** Python modules (`selectors.py`) encapsulate complex read queries, reporting aggregates, and date-range filters.
   - **Persistence Layer:** Django ORM Models define declarative table schemas, foreign keys, and database-level constraints.
   - **Permissions Layer:** Strict object-level and request-level authorization ensuring a user accesses only their own financial data.

2. **No Business Logic in Views or Serializers:**
   - Views remain thin coordinators.
   - Serializers do not execute database mutations or complex financial logic.
   - All financial balance calculations and allocations are strictly centralized in service functions.

3. **User Ownership and Tenant Isolation:**
   - Every domain record (accounts, transactions, categories, budgets, loans) directly or transitively references `user_id`.
   - All queries filter by the authenticated user (`user=request.user`).
   - Default DRF permission policy is `IsAuthenticated`.

4. **Remote Supabase PostgreSQL Strategy:**
   - Direct PostgreSQL connection via TLS (`sslmode=require`).
   - Direct connection used for migrations and backend persistent operations; session pooler supported when required by network topologies.
   - Credentials strictly supplied via server-side environment variables (`SUPABASE_DB_URL`).
   - Zero client-side or frontend exposure of database credentials.

5. **Financial Accounting Integrity Invariants:**
   - Currency: Indian Rupee (INR).
   - Monetary values: Integer paise (e.g. ₹10.50 = 1050 paise) stored in `BigIntegerField` or exact integer types. Never use floating-point types (`float` or `FloatField`) for financial figures.
   - Balance conservation: Internal transfers between user accounts net to zero impact on total liquid balance.
   - Distinction of Cash Movement vs. Expense: Inflows, loans, repayments, and transfers are tracked with dedicated transaction types rather than inflating spending aggregates.

---

## 3. Directory Layout and Application Boundaries

```
kivo/
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   ├── apps/
│   │   ├── __init__.py
│   │   └── users/               # Phase 1: Custom User foundation; Phase 2: Auth endpoints
│   ├── common/
│   │   ├── __init__.py
│   │   ├── db.py                # Database configuration & URL parser
│   │   ├── exceptions.py        # Uniform API exception handling
│   │   └── health/              # Health & readiness verification
│   └── manage.py
├── docs/
│   ├── decisions/
│   └── phases/
├── tests/
├── .env.example
├── .gitignore
├── AGENTS.md
├── pyproject.toml
├── requirements.lock
└── README.md
```

Future domain apps (`accounts`, `transactions`, `categories`, `funds`, `budgets`, `recurring_bills`, `loans`, `reports`) will be introduced in their respective authorized phases without cluttering Phase 1.
