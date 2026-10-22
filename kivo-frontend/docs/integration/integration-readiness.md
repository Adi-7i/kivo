# Integration Readiness Checklist & Roadmap

**Document Reference:** `docs/integration/integration-readiness.md`  
**Phase:** Kivo Frontend Phase 7 (Final Verification, UI Completion & Backend Coverage Review)  
**Status:** READY FOR FUTURE INTEGRATION (FRONTEND UI VERIFIED)  
**Author:** Principal Next.js Architect & Quality Engineering Lead  
**Date:** October 2026

---

## 1. Executive Summary

This document establishes the official readiness criteria, architectural prerequisites, data conventions, and sequential execution order for connecting the Kivo Next.js frontend to the remote Django REST Framework backend.

All frontend user interfaces (Phases 1 through 7) are **100% complete, fully audited, responsive, accessible, and verified by 200 Vitest tests and 190 Playwright E2E tests**.

> [!IMPORTANT]
> **Definitive Boundary**: No backend connections or live API requests exist in the current frontend code. This document outlines the roadmap for the **subsequent separately authorized integration stage**.

---

## 2. Readiness by Frontend Module

| Module | Route(s) | UI Components & Forms | Client Validation Schema | Backend Endpoints Target | Integration Status |
|---|---|---|---|---|---|
| **Auth & Onboarding** | `/login`, `/register`, `/onboarding` | `LoginForm`, `RegisterForm`, `OnboardingShell` | `loginSchema`, `registerSchema`, `accountSchema` | `/api/v1/auth/*` | READY |
| **Profile & Settings** | `/settings/profile`, `/settings/categories` | `ProfilePage`, `CategoryList`, `CategoryModal` | `categorySchema` | `/api/v1/auth/me/`, `/api/v1/categories/*` | READY |
| **Dashboard** | `/dashboard` | `FinancialSummaryGrid`, `SpendingChartCard`, `RecentActivityCard` | N/A (Display & Filters) | `/api/v1/dashboard/`, `/api/v1/accounts/summary/` | READY |
| **Accounts** | `/money` | `AccountList`, `AccountCard`, `AccountFormModal` | `accountManageSchema` | `/api/v1/accounts/*` | READY |
| **Transactions & Reversals** | `/transactions`, `/transactions/[id]` | `TransactionTable`, `QuickAddModal`, `TransactionActionModal` | `expenseSchema`, `receiptSchema`, `transferSchema`, `transactionActionSchema` | `/api/v1/transactions/*` | READY |
| **Money Sources & Attribution** | `/money/sources`, `/money/sources/[id]` | `FundingSourceList`, `FundJourneyTimeline`, `AllocationBreakdown` | `fundingFilterSchema` | `/api/v1/funds/*` | READY |
| **People, Loans & Repayments** | `/people`, `/people/[id]` | `ContactList`, `ContactModal`, `LendBorrowModal`, `RepaymentModal` | `contactSchema`, `loanSchema`, `settlementSchema` | `/api/v1/contacts/*`, `/api/v1/loans/*`, `/api/v1/claims/*`, `/api/v1/settlements/*` | READY |
| **Shared Expenses** | `/shared-expenses`, `/shared-expenses/[id]` | `SharedBillList`, `CreateSharedBillModal`, `SharedBillDetailView` | `sharedBillSchema` | `/api/v1/shared-bills/*` | READY |
| **Rent & Reserves** | `/rent` | `RentOverviewCard`, `RentPaymentModal`, `RentReserveModal`, `ObligationActionModal`, `RentGenerateModal` | `rentPlanSchema`, `rentPaymentSchema`, `rentReserveSchema`, `obligationActionSchema` | `/api/v1/rent/*` | READY |
| **Budgets** | `/budgets` | `BudgetList`, `BudgetOverview`, `BudgetModal`, `BudgetPeriodSelector` | `budgetSchema` | `/api/v1/budgets/*` | READY |
| **Analytics & Export** | `/reports` | `AnalyticsSummaryCard`, `SpendingTrendChart`, `CategoryBreakdownChart`, `CSVExportDialog` | `exportSchema` | `/api/v1/reports/*` | READY |

---

## 3. Core Architectural Decisions for Integration

### A. Session Authentication & CSRF Bootstrap
1. **Cookie-Based Sessions**: The Django backend relies on secure `sessionid` and `csrftoken` cookies.
2. **Bootstrap Flow**:
   - Web client makes initial call to `GET /api/v1/auth/csrf/` on app initialization.
   - Django responds with `200 OK` and sets the `csrftoken` cookie.
   - All subsequent state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) must extract the cookie value and include it in the `X-CSRFToken` request header.
3. **Session Lifecycle**:
   - `POST /api/v1/auth/login/` rotates session keys internally to prevent session fixation.
   - `POST /api/v1/auth/logout/` invalidates the active session and flushes cookies.

### B. Durable Idempotency Keys (`Idempotency-Key`)
1. **Financial Write Invariant**: Every financial mutation endpoint requires an `Idempotency-Key` header (1–128 characters, UUIDv4 recommended).
2. **Network Retry Semantics**:
   - If a request times out or receives a `500` / `503` status, client **must retry with the identical key and payload**.
   - If a request is received with an existing key and matching payload, Django returns the cached response with `status: 200` (`replayed: true`).
   - If a request is received with an existing key but differing payload, Django returns `409 Conflict`.

### C. Exact Integer Arithmetic (Paise)
1. **Zero Floating Point Rule**: Monetary amounts in the API are represented in integer paise ($1\text{ INR} = 100\text{ paise}$).
2. **Frontend Responsibility**:
   - The UI accepts standard decimal inputs from users (e.g. `1450.75`).
   - Before dispatching the JSON payload, the frontend converts the input to integer paise using `decimalStringToPaise("1450.75") -> 145075`.
   - Incoming amounts from backend responses are formatted using `formatPaise(145075) -> "₹1,450.75"`.

---

## 4. Recommended Sequential Integration Order

To minimize integration risk and preserve data integrity, the integration stage should follow these 6 sequential steps:

```mermaid
graph TD
    Step1["Step 1: Session & Authentication<br/>(CSRF, Register, Login, Me, Logout)"]
    Step2["Step 2: Core Financial Foundation<br/>(Accounts, Categories, Defaults)"]
    Step3["Step 3: Transactions & Reversals<br/>(Quick Add, History, Reversal, Void)"]
    Step4["Step 4: Social & Shared Expenses<br/>(Contacts, Loans, Settlements, Split Bills)"]
    Step5["Step 5: Rent & Safe-to-Spend<br/>(Plans, Obligations, Payments, Reserves)"]
    Step6["Step 6: Analytics, Budgets & Reports<br/>(Dashboard, Budgets, Reports, CSV Export)"]

    Step1 --> Step2
    Step2 --> Step3
    Step3 --> Step4
    Step4 --> Step5
    Step5 --> Step6
```

### Step 1: Session & Authentication (`/api/v1/auth/`)
- Verify CSRF cookie capture.
- Wire `LoginForm` and `RegisterForm` with TanStack Query mutations.
- Wire `MeView` (`/api/v1/auth/me/`) into global session provider.

### Step 2: Core Financial Foundation (`/api/v1/accounts/`, `/api/v1/categories/`)
- Fetch live account balances and category lists.
- Enable `AccountFormModal` and `CategoryModal` for real account/category creation.
- Test "Seed Defaults" (`POST /api/v1/categories/defaults/`).

### Step 3: Core Transactions & Reversals (`/api/v1/transactions/`)
- Connect `QuickAddModal` for posting receipts, expenses, and transfers.
- Verify real double-entry ledger postings on transaction detail.
- Connect `TransactionActionModal` for live reversal, void, and correction mutations.

### Step 4: Social, Lending & Shared Bills (`/api/v1/contacts/`, `/api/v1/loans/`, etc.)
- Connect contact directory and net balance calculation.
- Wire `LendBorrowModal` and `RepaymentModal`.
- Wire `CreateSharedBillModal` for roommate expense splits.

### Step 5: Rent, Reserves & Safe-to-Spend (`/api/v1/rent/`)
- Wire rent plan configuration, obligation generation (`RentGenerateModal`), and rent payments.
- Connect rent reserve balance allocations.
- Verify that `GET /api/v1/rent/spending-capacity/` drives the `SafeToSpendCard` on `/dashboard` and `/rent`.

### Step 6: Budgets, Analytics & CSV Export (`/api/v1/budgets/`, `/api/v1/reports/`)
- Connect category budget thresholds and progress bars.
- Wire dashboard and report analytics charts (Recharts) to `/api/v1/reports/*`.
- Connect `CSVExportDialog` to stream `GET /api/v1/reports/export/` with user-selected headers and filters.

---

## 5. Critical End-to-End User Journeys for Integration Testing

1. **User Onboarding & First Account**:
   - Register -> Obtain CSRF -> Login -> Create first Bank Account with Opening Balance -> Arrive at Dashboard.
2. **Daily Expense & Inflow Journey**:
   - Quick Add Expense -> Validate integer paise debit -> Check updated Account Balance -> Verify FIFO Funding Source Attribution.
3. **Friend Lending & Settlement Journey**:
   - Add Contact -> Lend Money (Asset swap, not expense) -> Contact owes user -> Record Partial Repayment -> Verify Claim reduction.
4. **Roommate Shared Bill Journey**:
   - Add Shared Bill -> User pays 100% -> 50% split with Roommate -> Verify user personal expense is only 50%, remaining is receivable claim.
5. **Monthly Rent & Safe-to-Spend Journey**:
   - View Rent Obligation -> Reserve Funds -> Safe-to-Spend drops -> Record Payment -> Account debited, obligation marked paid.
6. **Transaction Reversal Journey**:
   - Open Transaction -> Click Reversal -> Input reason -> Submit -> Verify mirror ledger entry posted with exact negative balance effect.

---

## 6. Readiness Verification Checklist

- [x] All 52 backend endpoints cataloged and mapped to UI screens.
- [x] Zod v4 validation schemas written for all user-input forms.
- [x] React Hook Form controllers configured with decimal-to-paise sanitization.
- [x] Empty, loading skeleton, and error boundary states implemented on all routes.
- [x] Responsive layout verified at 375px, 768px, and 1440px.
- [x] WCAG 2.2 AA accessibility (colors, labels, focus rings, ARIA roles) verified.
- [x] 200 Vitest component tests passing.
- [x] 190 Playwright E2E tests passing.
- [x] Production bundle successfully builds with Turbopack (43 static routes).
- [x] Zero mock persistence or fake database engines present in source code.

**Conclusion:** Kivo frontend UI is **100% verified** and ready for authorized backend integration.
