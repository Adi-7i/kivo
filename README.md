<p align="center">
  <img src="docs/assets/kivo-logo.png" alt="Kivo Logo" width="120" />
</p>

<h1 align="center">Kivo</h1>

<p align="center">
  <strong>Deliberate personal money and shared expense management.</strong>
</p>

<p align="center">
  <a href="#core-capabilities">Capabilities</a> &bull;
  <a href="#technology-stack">Tech Stack</a> &bull;
  <a href="#interactive-api-documentation">API Docs</a> &bull;
  <a href="STARTUP.md">Getting Started</a> &bull;
  <a href="#project-status">Project Status</a>
</p>

---

## What is Kivo?

Kivo is a modern, privacy-first personal finance platform designed for deliberate spenders, roommates, and household managers. Unlike traditional budgeting apps that demand automated bank credential syncing and often misclassify financial movements, Kivo centers on precise, user-directed tracking where every rupee is accounted for with zero ambiguity.

At its core, Kivo separates true personal consumption from asset transfers, lending, and shared living expenses. When you pay a group dinner bill, transfer funds between personal accounts, or reserve money for next month's rent, your net worth and monthly expense metrics reflect financial reality rather than arbitrary ledger spikes.

Built as an API-first modular application, Kivo pairs a hardened Django REST backend with a modern Next.js client to deliver strict data integrity, auditability, and full sovereignty over your financial data.

---

## Why Kivo Exists

* **Manual Accuracy over Fragile Syncing:** Automated bank feeds frequently break, create duplicate entries, and expose sensitive credentials. Kivo treats financial entry as an intentional, reliable process.
* **Separation of Movement and Consumption:** Lending money to a friend is an asset transfer, not an expense. Receiving repayment is a receivable clearance, not income. Kivo enforces these accounting distinctions natively.
* **Complex Rent and Roommate Workflows:** Standard split apps treat rent as a simple one-off bill. Kivo models lease cycles, roommate payment obligations, security deposit reserves, and transparent debt settlements.
* **Fund Earmarking Without Multiple Bank Accounts:** Allocate cash into dedicated virtual funds (emergency reserves, investments, goals) within your actual liquid accounts without artificial physical transfers.
* **Strict Integer Financial Arithmetic:** Every monetary amount is calculated and stored in integer paise. No floating-point rounding errors ever enter your balance sheets.

---

## Technology Stack

### Backend
| Component | Technology | Version | Description |
|:---|:---|:---|:---|
| Language | Python | 3.13+ (Dev: 3.14.4) | Core backend runtime |
| Framework | Django | 6.1.2 | Modular monolith backend framework |
| REST API | Django REST Framework | 3.18.3 | Clean `/api/v1/` endpoint architecture |
| Database | PostgreSQL (Supabase) | Remote | Relational storage with strict constraints |
| Driver | psycopg | 3.3.6 | Native PostgreSQL adapter (`psycopg[binary,pool]`) |
| API Docs | drf-spectacular | 0.29.0 | OpenAPI 3.0 schema, Swagger UI, and ReDoc |
| Testing | pytest + pytest-django | 9.0.2 / 4.11.1 | 293+ verified unit and integration tests |
| Code Quality | Ruff | 0.15.5 | High-speed linting and formatting |

### Frontend
| Component | Technology | Version | Description |
|:---|:---|:---|:---|
| Framework | Next.js (App Router) | 16.4.2 | Server-rendered and client React framework |
| Core Library | React | 19.3.0 | Modern declarative UI foundation |
| Language | TypeScript | Strict | End-to-end static type safety |
| Styling | Tailwind CSS | 4.x | Utility-first responsive styling engine |
| Component Kit | shadcn/ui | 4.22.0 | Accessible UI primitives and components |
| Server State | TanStack Query | 5.104.3 | Async caching, mutation, and synchronization |
| Forms & Validation | React Hook Form + Zod | 7.71.1 / 4.3.6 | Type-safe form controls and schema validation |
| Package Manager | pnpm | 12.10.1 | Fast, deterministic dependency management |

---

## Core Capabilities

> **Note:** Backend business logic and REST endpoints are fully implemented and verified. The frontend web application is currently under active development.

### 1. Financial Ledger & Cash Flow
* Multi-account management (savings, current, cash, digital wallets) with real-time balance tracking.
* Hierarchical income and expense categorization.
* Strict integer paise transaction engine with atomic write transactions (`transaction.atomic`).
* Distinction between true consumption expenses, income, internal transfers, and loan disbursements.

### 2. Dedicated Fund Tracking
* Virtual envelope budgeting and financial goal tracking without opening separate bank accounts.
* Direct fund contributions, withdrawals, and balance recalculations.
* Clean visual distinction between unallocated operational cash and committed reserve funds.

### 3. Shared Living, Rent & Group Expenses
* Structured rent management: lease tracking, roommate obligation splits, and security deposit reserves.
* Peer-to-peer lending and borrowing ledgers (receivables and payables tracking).
* Multi-party shared bills with proportional debt calculation and atomic settlement recordings.

### 4. Budgets & Financial Analytics
* Monthly and category-specific budget thresholds with real-time spending rollups.
* Aggregated cash flow reporting and category distribution metrics.
* Transaction history export in CSV format for personal archiving.

### 5. Security & Architecture
* Session-based authentication with strict HTTP-only cookies and automatic CSRF validation.
* Zero floating-point math across all calculations.
* Clean separation of concerns: declarative models, DRF serializers, atomic services, and pure selectors.

---

## Interactive API Documentation

When the backend development server is running locally, interactive API documentation is available at:

* **Swagger UI:** `http://127.0.0.1:8000/api/v1/schema/swagger-ui/`
* **ReDoc:** `http://127.0.0.1:8000/api/v1/schema/redoc/`
* **Raw OpenAPI Schema:** `http://127.0.0.1:8000/api/v1/schema/`

---

## Getting Started

Ready to run Kivo locally? Follow the complete, step-by-step developer setup and operations guide in **[STARTUP.md](STARTUP.md)**.

It covers:
* System prerequisites (Python, Node.js, pnpm, Supabase PostgreSQL)
* Backend virtual environment setup and migration execution
* Frontend dependency installation and environment configuration
* Running the full development environment with verified health checks
* Test execution, database safety, and production deployment considerations

---

## Project Status

| Area | Current Status | Details |
|:---|:---|:---|
| **Backend REST API** | **Production Ready (Phase 7 Complete)** | All domain endpoints, services, permissions, and 293+ tests passing. |
| **Frontend Web App** | **Under Active Development (Phase 1 Ready)** | Core architecture, design system, route layout, and API client wired; feature pages being integrated. |
| **Mobile Clients** | **Planned** | Android and iOS applications will connect to the existing `/api/v1/` REST API. |
