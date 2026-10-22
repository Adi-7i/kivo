# Backend API ↔ Frontend UI Feature Coverage Audit

**Document Reference:** `docs/audits/backend-api-frontend-coverage.md`  
**Phase:** Kivo Frontend Phase 7 (Audit, UI Completion & Backend Coverage Review)  
**Status:** ROUTE INVENTORY VERIFIED; PART 1 IMPLEMENTED (2026-10-22)
**Auditor:** Principal Next.js Architect & Django API Contract Auditor  
**Date:** October 2026  
**Backend Mode:** READ-ONLY (Zero mutations, zero database modifications)

---

## 1. Executive Summary

This audit establishes the definitive contract comparison between the remote Django REST Framework backend (Phase 1–7 verified API) and the Next.js 16 App Router frontend client.

The 2026-10-22 Part 0 audit independently traversed the actual Django resolver and regenerated/validated OpenAPI 3.0.3 from the original backend. Both produce **68 API paths and 84 method/path operations**, excluding automatic HEAD/OPTIONS, admin and schema/docs. The previous 52-endpoint claim was incorrect. The original table covered 83 unique operations across 68 paths; `GET /api/v1/categories/{id}/` was missing and is added below.

1. **Authentication:** 5 paths / 5 operations.
2. **Ledger/accounts/categories:** 11 paths / 16 operations.
3. **Funds:** 6 paths / 6 operations.
4. **Contacts/claims/loans/settlements/shared bills:** 18 paths / 23 operations.
5. **Rent:** 18 paths / 22 operations.
6. **Budgets/dashboard/reports:** 8 paths / 10 operations.
7. **Health:** 2 paths / 2 operations.

Route existence is verified; historical FULL labels describe UI coverage, not live integration. The original staging/build NO-GO is superseded by owner approval of the existing development database and successful scoped Node execution. Part 1 integrates only auth, current-user profile and initial-account onboarding; the [current verification report](../integration/part-01-auth-onboarding-verification.md) records actual tests and remaining limits. Backend source remains unchanged.

The matrix records route-to-UI mappings, with the current limitations above. Phase 7 reported three added preview workflows:
- **Category Management (`/settings/categories`)** with default category seeding (`POST /api/v1/categories/defaults/`).
- **Interactive Transaction Reversal, Void, and Correction Dialog (`TransactionActionModal`)** matching `POST /api/v1/transactions/{id}/reverse/`, `/void/`, and `/correct/`.
- **Rent Obligation Generation (`RentGenerateModal`)** matching `POST /api/v1/rent/plans/{id}/generate/`.

---

## 2. Structured Coverage Matrix (68 Paths / 84 Operations)

| Backend Domain | Endpoint & Method | Purpose & Payload | Frontend Route / Component | UI Coverage | Gap / Notes | Priority |
|---|---|---|---|---|---|---|
| **Health** | `GET /api/v1/health/` | Liveness check | `AppHeader.tsx` status indicator | FULL | Transparent system indicator | P3 |
| **Health** | `GET /api/v1/health/db/` | Database connectivity | Dev/diagnostic tools | FULL | Non-user-facing infra | P3 |
| **Auth** | `GET /api/v1/auth/csrf/` | Obtain CSRF cookie | `src/lib/api/client.ts`, same-origin bridge | IMPLEMENTED | Bootstrap and current-cookie header; token rotates after login | P0 |
| **Auth** | `POST /api/v1/auth/register/` | User registration | `/register` (`RegisterForm.tsx`) | IMPLEMENTED | Real 201, field/duplicate validation, explicit later login | P0 |
| **Auth** | `POST /api/v1/auth/login/` | User authentication | `/login` (`LoginForm.tsx`) | IMPLEMENTED | Django sessions/CSRF; safe account-state routing | P0 |
| **Auth** | `POST /api/v1/auth/logout/` | Terminate session | `SessionMenu` in app header | IMPLEMENTED | Confirmed logout, private cache reset and full login navigation | P0 |
| **Auth** | `GET /api/v1/auth/me/` | Current user profile | `/settings/profile`, session boundary/server proxy | IMPLEMENTED | Real id/email/name/date_joined; updates/preferences unsupported | P1 |
| **Accounts** | `GET /api/v1/accounts/` | List user accounts | `/money` (`AccountList.tsx`) | FULL | Cards render liquid balances in paise | P0 |
| **Accounts** | `POST /api/v1/accounts/` | Create account + opening leg | `/onboarding`; general `/money` UI still pending | IMPLEMENTED (ONBOARDING ONLY) | Exact INR string, original-key recovery, no automatic POST retry | P0 |
| **Accounts** | `GET /api/v1/accounts/{id}/` | Account detail | `/money` (`AccountCard.tsx`) | FULL | Visual breakdown of balance & status | P1 |
| **Accounts** | `PATCH /api/v1/accounts/{id}/` | Update account | `/money` (`AccountFormModal.tsx`) | FULL | Supports name and archived only; color/icon unsupported | P1 |
| **Accounts** | `GET /api/v1/accounts/summary/` | Liquid total & stats | `/dashboard`, `/money` summary cards | FULL | Aggregates liquid vs illiquid | P0 |
| **Categories** | `GET /api/v1/categories/` | List categories | `/settings/categories` (`CategoryList.tsx`) | FULL | Implemented in Phase 7 | P1 |
| **Categories** | `GET /api/v1/categories/{id}/` | Category detail | `/settings/categories` | PENDING | Route verified in Part 0; missing from the original inventory | P1 |
| **Categories** | `POST /api/v1/categories/` | Create category | `/settings/categories` (`CategoryModal.tsx`) | FULL | Implemented in Phase 7 | P1 |
| **Categories** | `PATCH /api/v1/categories/{id}/` | Edit category | `/settings/categories` (`CategoryModal.tsx`) | FULL | Implemented in Phase 7 | P1 |
| **Categories** | `POST /api/v1/categories/defaults/` | Seed system defaults | `/settings/categories` (`CategorySeedBanner.tsx`) | FULL | Implemented in Phase 7 | P1 |
| **Transactions** | `GET /api/v1/transactions/` | Paginated ledger history | `/transactions` (`TransactionTable.tsx`) | FULL | 15+ filter params matching DRF backend | P0 |
| **Transactions** | `POST /api/v1/transactions/` | Post financial event | `QuickAddModal.tsx` | FULL | Header: `Idempotency-Key`, receipts, expenses, transfers | P0 |
| **Transactions** | `GET /api/v1/transactions/{id}/` | Retrieve transaction | `/transactions/[id]` (`TransactionDetailCard.tsx`) | FULL | Full double-entry debit/credit postings | P0 |
| **Transactions** | `POST /api/v1/transactions/{id}/reverse/` | Execute ledger reversal | `TransactionActionModal.tsx` | FULL | Implemented in Phase 7 (requires reason) | P0 |
| **Transactions** | `POST /api/v1/transactions/{id}/void/` | Void unposted event | `TransactionActionModal.tsx` | FULL | Implemented in Phase 7 (requires reason) | P1 |
| **Transactions** | `POST /api/v1/transactions/{id}/correct/` | Correct transaction | `TransactionActionModal.tsx` | FULL | Implemented in Phase 7 (audit notes) | P1 |
| **Funds** | `GET /api/v1/funds/summary/` | Attribution summary | `/money/sources` (`FundOverviewCard.tsx`) | FULL | Capacity, allocated, unfunded gaps | P1 |
| **Funds** | `GET /api/v1/funds/batches/` | List funding sources | `/money/sources` (`FundingSourceList.tsx`) | FULL | Filterable by status and account | P1 |
| **Funds** | `GET /api/v1/funds/batches/{id}/` | Batch detail | `/money/sources/[id]` | FULL | Initial amount vs remaining capacity | P1 |
| **Funds** | `GET /api/v1/funds/batches/{id}/breakdown/` | Category attribution | `/money/sources/[id]` (`AllocationBreakdown.tsx`) | FULL | Detailed bar chart & tables | P1 |
| **Funds** | `GET /api/v1/funds/batches/{id}/journey/` | FIFO audit timeline | `/money/sources/[id]` (`FundJourneyTimeline.tsx`) | FULL | Step-by-step exhaustion history | P1 |
| **Funds** | `GET /api/v1/funds/allocations/` | Query allocations | `/money/sources/[id]`, `/transactions/[id]` | FULL | Query by `transaction` or `run` UUID | P2 |
| **Contacts** | `GET /api/v1/contacts/` | List social contacts | `/people` (`ContactList.tsx`) | FULL | Displays net balance (owed to/by user) | P0 |
| **Contacts** | `POST /api/v1/contacts/` | Create contact | `/people` (`ContactModal.tsx`) | FULL | Header: `Idempotency-Key`, name, upi, phone | P1 |
| **Contacts** | `GET /api/v1/contacts/{id}/` | Contact detail | `/people/[id]` (`ContactDetailView.tsx`) | FULL | Profile, outstanding claims, settlement history | P0 |
| **Contacts** | `PATCH /api/v1/contacts/{id}/` | Edit contact | `/people/[id]` (`ContactModal.tsx`) | FULL | Update contact info | P1 |
| **Contacts** | `GET /api/v1/contacts/{id}/history/` | Transaction timeline | `/people/[id]` (`ContactActivityTimeline.tsx`) | FULL | Filtered events involving this contact | P1 |
| **Loans** | `GET /api/v1/loans/` | List personal loans | `/people` lending tab, `/transactions` | FULL | Filtered by `lend` and `borrow` | P0 |
| **Loans** | `POST /api/v1/loans/` | Record lend / borrow | `LendBorrowModal.tsx` | FULL | Header: `Idempotency-Key`, contact, asset leg | P0 |
| **Loans** | `GET /api/v1/loans/{id}/` | Retrieve loan | `/transactions/[id]` | FULL | Detailed postings view | P1 |
| **Loans** | `POST /api/v1/loans/{id}/correct/` | Correct loan record | `TransactionActionModal.tsx` | FULL | Audit trail update | P2 |
| **Loans** | `POST /api/v1/loans/{id}/reverse/` | Reverse loan | `TransactionActionModal.tsx` | FULL | Nullifies receivable/payable balance | P1 |
| **Claims** | `GET /api/v1/claims/` | List active claims | `/people` (`ClaimCard.tsx`) | FULL | Receivables & payables tracking | P0 |
| **Claims** | `GET /api/v1/claims/{id}/` | Claim detail | `/people/[id]` claim cards | FULL | Original amount, remaining, contact | P1 |
| **Claims** | `GET /api/v1/claims/{id}/history/` | Claim settlements | `/people/[id]` (`ContactActivityTimeline.tsx`) | FULL | Partial repayments audit trail | P1 |
| **Settlements**| `GET /api/v1/settlements/` | List settlements | `/people`, `/transactions` | FULL | Repayments in & out | P0 |
| **Settlements**| `POST /api/v1/settlements/` | Record repayment | `RepaymentModal.tsx` | FULL | Header: `Idempotency-Key`, claim reduction | P0 |
| **Settlements**| `GET /api/v1/settlements/{id}/` | Settlement detail | `/transactions/[id]` | FULL | Double-entry cash vs claim leg | P1 |
| **Settlements**| `POST /api/v1/settlements/{id}/correct/` | Correct settlement | `TransactionActionModal.tsx` | FULL | Audit trail update | P2 |
| **Settlements**| `POST /api/v1/settlements/{id}/reverse/` | Reverse settlement | `TransactionActionModal.tsx` | FULL | Reopens settled claim amount | P1 |
| **Shared Bills**| `GET /api/v1/shared-bills/` | List shared bills | `/shared-expenses` (`SharedBillList.tsx`) | FULL | Split overview and status | P0 |
| **Shared Bills**| `POST /api/v1/shared-bills/` | Record split bill | `CreateSharedBillModal.tsx` | FULL | Header: `Idempotency-Key`, custom/equal shares | P0 |
| **Shared Bills**| `GET /api/v1/shared-bills/{id}/` | Bill detail view | `/shared-expenses/[id]` (`SharedBillDetailView.tsx`) | FULL | Breakdown of user share vs roommate claims | P0 |
| **Shared Bills**| `POST /api/v1/shared-bills/{id}/correct/` | Correct shared bill | `TransactionActionModal.tsx` | FULL | Audit trail update | P2 |
| **Shared Bills**| `POST /api/v1/shared-bills/{id}/reverse/` | Reverse shared bill | `TransactionActionModal.tsx` | FULL | Nullifies shared expense & claims | P1 |
| **Rent** | `GET /api/v1/rent/plans/` | List rent plans | `/rent` (`RentOverviewCard.tsx`) | FULL | Payee, due day, monthly amount | P0 |
| **Rent** | `POST /api/v1/rent/plans/` | Create rent plan | `/rent` (`RentPlanConfigModal.tsx`) | FULL | Header: `Idempotency-Key`, roommate shares | P0 |
| **Rent** | `GET /api/v1/rent/plans/{id}/` | Rent plan detail | `/rent` (`RentOverviewCard.tsx`) | FULL | Plan configurations | P1 |
| **Rent** | `PATCH /api/v1/rent/plans/{id}/` | Activate/deactivate plan | `/rent` (`RentPlanConfigModal.tsx`) | FULL | Toggles active status | P1 |
| **Rent** | `POST /api/v1/rent/plans/{id}/generate/`| Generate obligations | `/rent` (`RentGenerateModal.tsx`) | FULL | Implemented in Phase 7 (`through` date) | P0 |
| **Rent** | `GET /api/v1/rent/plans/{id}/obligations/`| List plan obligations | `/rent` (`RentObligationList.tsx`) | FULL | Filtered by plan | P1 |
| **Rent** | `GET /api/v1/rent/obligations/` | List obligations | `/rent` (`RentObligationList.tsx`) | FULL | Status: pending, paid, skipped, overdue | P0 |
| **Rent** | `GET /api/v1/rent/obligations/{id}/` | Obligation detail | `/rent` obligation card | FULL | Amount, due date, status | P1 |
| **Rent** | `POST /api/v1/rent/obligations/{id}/change-status/`| Skip or reopen obligation | `/rent` (`ObligationActionModal.tsx`) | FULL | Header: `Idempotency-Key`, reason | P1 |
| **Rent** | `GET /api/v1/rent/obligations/{id}/history/` | Status change audit | `/rent` obligation details | FULL | Tracks skips & reopen history | P2 |
| **Rent** | `GET /api/v1/rent/obligations/{id}/payments/`| Payments for obligation | `/rent` obligation card | FULL | History of recorded payments | P1 |
| **Rent** | `POST /api/v1/rent/obligations/{id}/payments/`| Pay rent obligation | `/rent` (`RentPaymentModal.tsx`) | FULL | Header: `Idempotency-Key`, payer selection | P0 |
| **Rent** | `GET /api/v1/rent/payments/` | List rent payments | `/rent`, `/transactions` | FULL | Cash outflow for rent | P1 |
| **Rent** | `GET /api/v1/rent/payments/{id}/` | Rent payment detail | `/transactions/[id]` | FULL | Linked obligation and ledger event | P1 |
| **Rent** | `POST /api/v1/rent/payments/{id}/correct/` | Correct rent payment | `TransactionActionModal.tsx` | FULL | Corrects rent posting memo | P2 |
| **Rent** | `POST /api/v1/rent/payments/{id}/reverse/` | Reverse rent payment | `TransactionActionModal.tsx` | FULL | Reopens rent obligation | P1 |
| **Rent** | `GET /api/v1/rent/reserves/` | List rent reserves | `/rent` (`RentReserveCard.tsx`) | FULL | Reserved amount set aside from safe-to-spend | P0 |
| **Rent** | `POST /api/v1/rent/reserves/` | Create reserve | `/rent` (`RentReserveModal.tsx`) | FULL | Header: `Idempotency-Key`, target amount | P0 |
| **Rent** | `GET /api/v1/rent/reserves/{id}/` | Reserve detail | `/rent` (`RentReserveCard.tsx`) | FULL | Balance, notes, allocation | P1 |
| **Rent** | `POST /api/v1/rent/reserves/{id}/adjust/`| Adjust reserve balance | `/rent` (`RentReserveModal.tsx`) | FULL | Header: `Idempotency-Key`, add/subtract | P0 |
| **Rent** | `GET /api/v1/rent/reserves/{id}/history/`| Reserve audit changes | `/rent` reserve details | FULL | Timeline of reserve allocations | P2 |
| **Rent** | `GET /api/v1/rent/spending-capacity/` | Safe-to-spend calculation | `/dashboard`, `/rent` (`SafeToSpendCard.tsx`) | FULL | Total liquid minus reserves & liabilities | P0 |
| **Budgets** | `GET /api/v1/budgets/` | List active budgets | `/budgets` (`BudgetList.tsx`) | FULL | Category spending ceilings | P0 |
| **Budgets** | `POST /api/v1/budgets/` | Create budget | `/budgets` (`BudgetModal.tsx`) | FULL | Header: `Idempotency-Key`, category/overall | P0 |
| **Budgets** | `GET /api/v1/budgets/{id}/` | Budget progress detail | `/budgets` (`BudgetCard.tsx`) | FULL | Utilization %, remaining allowance | P1 |
| **Budgets** | `PATCH /api/v1/budgets/{id}/` | Update budget limit | `/budgets` (`BudgetModal.tsx`) | FULL | Header: `Idempotency-Key`, limit adjustment | P1 |
| **Reports** | `GET /api/v1/dashboard/` | Dashboard metrics | `/dashboard` (`FinancialSummaryGrid.tsx`) | FULL | 8 primary KPI metrics | P0 |
| **Reports** | `GET /api/v1/reports/summary/` | Summary report | `/reports` (`AnalyticsSummaryCard.tsx`) | FULL | Net cash flow, expenses, eligible inflows | P0 |
| **Reports** | `GET /api/v1/reports/trends/` | Trend velocity chart | `/reports` (`SpendingTrendChart.tsx`) | FULL | Daily, weekly, monthly interval series | P1 |
| **Reports** | `GET /api/v1/reports/breakdown/` | Multidimensional breakdown | `/reports` (`ReportDetailPanel.tsx`) | FULL | Group by category, merchant, contact | P1 |
| **Reports** | `GET /api/v1/reports/export/` | CSV report stream | `/reports` (`CSVExportDialog.tsx`) | FULL | Streams RFC 4180 CSV with custom headers | P1 |
| **Reports** | `GET /api/v1/reports/funds/` | Funding source report | `/money/sources`, `/reports` | FULL | Source attribution summaries | P2 |

---

## 3. Findings & Categorization

### A. Missing Frontend Features (Identified and Resolved in Phase 7)
1. **Category Management UI (`/settings/categories`)**:
   - Backend had `CategoryViewSet` and `defaults` action.
   - Frontend previously had no dedicated category management route or default category seeder.
   - **Resolution:** Created `CategoryList.tsx`, `CategoryModal.tsx`, `CategorySeedBanner.tsx`, and route `/settings/categories`. Added navigation entry in `AppNav.tsx`.
2. **Transaction Action Modal (`TransactionActionModal`)**:
   - Backend had dedicated endpoints for transaction reversal (`/reverse/`), voiding (`/void/`), and corrections (`/correct/`).
   - Frontend previously only displayed a static toast/banner.
   - **Resolution:** Implemented interactive `TransactionActionModal` supporting reason validation, action-type selection, double-entry accounting explanations, and seamless integration into `TransactionDetailCard.tsx`.
3. **Rent Obligation Generation Trigger (`RentGenerateModal`)**:
   - Backend had `POST /api/v1/rent/plans/{id}/generate/` requiring a `through` date.
   - Frontend lacked a modal to trigger obligation generation.
   - **Resolution:** Implemented `RentGenerateModal.tsx` and connected it to `RentOverviewCard.tsx`.

### B. Incomplete Frontend Workflows (Verified)
- All modals, drawers, tabs, and filters now have corresponding client schemas (`zod`), proper empty/loading/error states, and standard `IntegrationPendingBadge` alerts.
- Part 1 corrects the previously observed onboarding float conversion, ten-character registration minimum and nested Django error handling. API money remains exact decimal INR strings; integer paise is an internal representation. Other modules' preview schemas still require their separately authorized integrations.

### C. Verified Contract Limits

- Resolver/schema inventory agrees on 68 paths / 84 operations. Real development-target auth/onboarding behavior is verified in the linked Part 1 report; other module integrations remain deferred.
- Profile/preference updates and an onboarding-completion field are absent.
- Account updates support name/archive only. Category input supports name/parent/archive, not the preview color field.
- Account creation accepts `name`, `kind`, `opened_on` and optional `opening_balance` as an exact two-place INR string. An identical idempotent replay returns HTTP 200 plus the account object, without a `replayed` property.
- Direct cross-origin browser requests are unsupported by the current backend CORS configuration. Same-origin ingress/proxy must preserve Django's CSRF and session enforcement.

### D. Unsupported UI Features (None Fabricated)
- The frontend does NOT claim live financial mutation, persistent background polling, or bank synchronization. All mutation buttons display transparent integration notices.

---

## 4. Integration Requirements for Next Phase

When authorized to begin backend API integration, the following requirements must be implemented:
1. **Safety Gate**: Confirm the intended backend/database target and approved test-record scope. The owner-approved existing development database satisfies this task; separate staging is not required.
2. **CSRF Bootstrap**: Obtain the cookie before anonymous registration/login too; send the current `X-CSRFToken` on writes and use the rotated token after login. CSRF bootstrap does not itself establish an authenticated session.
3. **Idempotency**: Follow each endpoint's actual requirements. Account creation needs a durable original key/body; reconcile ambiguous outcomes before deliberate recovery and never automatically retry the POST.
4. **Currency Boundary**: Send exact decimal INR strings such as `"150.50"`, not monetary JSON numbers or paise integers. Use no floating-point amount arithmetic.
5. **Error Envelope**: Unpack `{ "error": { "status_code": 400, "type": "validation_error", "details": { ... } } }`; server errors may instead provide `error.message`. Map verified fields into React Hook Form.

---

## 5. Conclusion & Status

**Route inventory: VERIFIED (68 paths / 84 operations). Part 1: IMPLEMENTED.**
The linked Part 1 report distinguishes real Django/browser evidence from mocked unit/component tests and records final gates. Only the approved development target and Part 1 scope are authorized; other financial integrations remain deferred.
