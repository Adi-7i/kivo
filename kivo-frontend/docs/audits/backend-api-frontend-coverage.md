# Backend API ↔ Frontend UI Feature Coverage Audit

## 2026-10-26 workspace and connectivity follow-up — current status

**Workspace correction VERIFIED; complete Part 6 recovery PARTIALLY COMPLETE / BLOCKED — NO-GO.** Root AGENTS now enforces repository-only implementation; both reviewed probes are preserved and actually executed under `scripts/diagnostics/`. No required source exists only in a temporary directory. The original branch/owner checkpoint `INTIGRATION@975d504` and existing work are preserved.

Fresh checks pass: **393 frontend tests, 62 selected backend unit tests, TypeScript, lint, production build, all 38 Part 6 screen cases and all three complete real Part 6 financial/CSV/isolation journeys**. The full 189-case regression was stopped after renewed availability failure: **6 passed / 1 interrupted / 182 not run**, exit 130. These results supersede older statements that the amended financial/CSV ownership tails have never passed; they do not establish a complete regression.

A real shared-bill browser POST received **503** while Django committed **201 after 31.014s**, with 30.531s SQL elapsed and TCP retransmissions increasing during the request. Deliberate original-key/body recovery returned 200; no timeout or accounting rule was changed. Across 1,525 captured Django requests there were zero Django 5xx, which explicitly excludes the recorded proxy 503. Financial tests stopped; server shutdown released all 22 observed backend PIDs.

The active connection remains the approved direct IPv6/TLS development route. The faulty hop is unverified, and official Dashboard Session Pooler parameters have not been supplied, so that required comparison and durable recovery remain blocked. No production hardening has begun. See the [Part 6 follow-up report](../../../docs/integration/part-06-budgets-reports-export-verification.md) for exact commands, preserved failures, canonical source inventory and required next input. Older sections below are historical.

## 2026-10-25 Part 6 recovery update — current status

**IMPLEMENTED / PARTIALLY COMPLETE; complete live verification BLOCKED / NO-GO.** The recovery fixed the CSV bridge's upstream content negotiation (exclusive `text/csv` caused DRF 406); actual Django CSV bytes, authenticated desktop/mobile downloads, UTF-8/BOM, selected filters, filename and formula escaping now have real passing evidence. A complete budget/expense/correction/reversal browser journey passed. Cross-user export and amended full financial tails remain NOT VERIFIED.

Fresh checks: **393 frontend tests, 62 selected backend unit tests, TypeScript, lint, production build and Django checks pass**. All **38 Part 6 desktop/mobile screen cases passed**, zero failures/skips/flaky cases (259.18s). The native authentication/read gate passed 68 real requests. These do not substitute for the unexecuted full Parts 1–6 regression. Failed runs remain preserved.

TCP diagnostics reproduced retransmissions and multi-second database queries; a four-query report took **21.722s**, exceeding the unchanged 12s proxy deadline and producing a real proxy 503. Across instrumented recovery logs, 804 completed Django requests had zero Django 5xx; this excludes proxy failures and does not erase earlier genuine Django 503s. The faulty hop remains unverified. Further financial writes stopped; a verified stable route/session-pooler address for the **same approved development database** is needed before completing the financial/security gate. No target/schema/accounting change or blind POST retry was made.

All recovery edits are in the original repository, branch `INTIGRATION`, after the owner's preserved `3d67e6f` commit. Backend changes are bounded, redacted observability only. See the [Part 6 recovery evidence](../../../docs/integration/part-06-budgets-reports-export-verification.md) for exact commands, statuses, changed files, retained failures and next gates. Production-release hardening has not begun. Earlier status sections below are historical and superseded by this update.

## 2026-10-25 Part 6 integration update

**Part 6 IMPLEMENTED / PARTIALLY COMPLETE — full live verification BLOCKED / NO-GO.** The owner authorized budgets, reports and authenticated CSV after Parts 4–5. A fresh real Part 4 recovery/Part 5 rent gate passed 2/2 before source edits. Existing clean checkpoint is `INTIGRATION@611c9dc`; the previous work was committed, contrary to the historical uncommitted assumption.

Actual coverage: owned budget list/detail/create/PATCH/archive with server progress and warning thresholds; summary/trends/six expense dimensions; pinned funding reports; URL filters and transaction drill-downs; authenticated UTF-8/BOM CSV with actual metadata, filter propagation and formula protection. CSV column headers/encoding are fixed by Django; no audit checksum, deletion, budget audit-history API, breakdown percentages, direct net cash-flow field or historical income series is invented. Earlier preview-only and “Part 6 has not begun” statements below are historical.

See the [Part 6 verification report](../../../docs/integration/part-06-budgets-reports-export-verification.md) for executed checks, retained failures and limitations. Final checks: 393 frontend tests, 57 selected backend unit tests, TypeScript, lint and production build pass. Live financial verification failed on actual Django/database 503s (including registration and current-user); read-only browser selection was 6 passed / 4 failed / 28 unexecuted. Further mutations stopped. CSV code exists but real downloads/ownership and the complete Part 6 journeys are not verified. Production-release hardening has not begun.

## 2026-10-25 recovery and rent integration update

**Parts 4 and 5 VERIFIED for the approved development scope.** [Part 4 recovery](../../../docs/integration/part-04-people-sharing-verification.md) records the complete uninterrupted financial/security journey, measured connection churn/deadline mismatch and bounded opt-in development pool. [Part 5 rent verification](../../../docs/integration/part-05-rent-reserves-verification.md) records exact contracts, all four real rent journeys and the approved friend-paid rent/reserve policy. Final checks: 335 unit tests, all 180 unique browser cases with passing evidence across full/focused runs (12 real Django-backed journeys), TypeScript, lint, cold/incremental build, Django checks and 24 selected backend unit tests. Failed attempts remain documented; no production certification is claimed.

Actual rent coverage now includes plans with immutable terms/active-only PATCH, inclusive due-date generation, owned obligations, owner/friend-paid partial payments, auditable corrections/reversals, skip/reopen, reserves and history, and authoritative spending capacity. Existing claim settlements refresh rent/reserve/dashboard/funding queries. No client ledger, FIFO or safe-to-spend calculation was added. Unsupported fields/statuses/operations remain unavailable; schema remains 68 paths / 84 operations.

The owner explicitly authorized Part 5 after the recovered Part 4 gate. Older statements below about Part 4 being blocked or Part 5 being unauthorized/previews are preserved historical checkpoints. **Part 6 budgets/general reports/CSV integration has not begun.** Existing deferred UI regression does not establish real Part 6 integration.

## 2026-10-24 verified contract update — Parts 3 and 4

**Part 3 VERIFIED for development; Part 4 IMPLEMENTED, final live verification PARTIALLY COMPLETE.** Actual schema validation still reports **68 paths / 84 operations**. [Part 3 evidence](../../../docs/integration/part-03-dashboard-funding-verification.md) and [Part 4 evidence](../../../docs/integration/part-04-people-sharing-verification.md) supersede the historical module-preview/integration-status claims below.

Live coverage now includes dashboard/trends/category breakdown; funding summary, pinned batches, journey and breakdown; contact CRUD supported as GET/POST/PATCH (no DELETE), archival and history; read-only claims/history; loans and explicit settlements with audited correction/reversal; owner/friend-paid equal/custom shared bills and their corrections/reversals. Bill operations use the bill UUID; settlement claim references come from actual posting effects. Exact INR strings and owned UUIDs are required. Missing sharing-only totals and batch merchant aggregation are documented gaps, not frontend accounting. All new financial writes retain session/CSRF protection and original-key/manual-reconciliation behavior.

Rent/reserve mutations, budgets and general analytics/export remain outside this task. The historical audit follows unchanged for provenance; current module status and test counts are governed by the two linked verification reports.

**Document Reference:** `docs/audits/backend-api-frontend-coverage.md`  
**Phase:** Kivo Frontend Phase 7 (Audit, UI Completion & Backend Coverage Review)  
**Status:** ROUTE INVENTORY VERIFIED; PARTS 1–2 VERIFIED FOR DEVELOPMENT (2026-10-24)
**Auditor:** Principal Next.js Architect & Django API Contract Auditor  
**Date:** October 2026  
**Backend Mode:** Source unchanged; identifiable workflow mutations authorized in the existing development database only.

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

Route existence is verified; historical FULL labels describe UI coverage, not live integration. The original staging/build NO-GO is superseded by owner approval of the existing development database and successful scoped Node execution. Part 1 integrates only auth, current-user profile and initial-account onboarding; the [current verification report](../../../docs/integration/part-01-auth-onboarding-verification.md) records actual tests and remaining limits. Backend source remains unchanged.

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
| **Accounts** | `GET /api/v1/accounts/` | List owned accounts | `/money` | IMPLEMENTED | All pages; authoritative balance strings converted exactly for display | P0 |
| **Accounts** | `POST /api/v1/accounts/` | Create account + opening equity | `/onboarding`, `/money` | IMPLEMENTED | Exact INR; persistent original key/body; no automatic retry | P0 |
| **Accounts** | `GET /api/v1/accounts/{id}/` | Account detail | `/money/[id]` | IMPLEMENTED | Owned balance, opening funds, archive state and linked history | P1 |
| **Accounts** | `PATCH /api/v1/accounts/{id}/` | Account metadata | `AccountFormModal` | IMPLEMENTED | Name/archive only; nonzero archive rejected by Django | P1 |
| **Accounts** | `GET /api/v1/accounts/summary/` | Liquid funds, personal expense, external receipts | Future Part 3 | PENDING | Not exposed through BFF; direct read-only test oracle only | P0 |
| **Categories** | `GET /api/v1/categories/` | List owned categories | Settings, Quick Add, history | IMPLEMENTED | All pages; UUID selection; archived options excluded from new writes | P1 |
| **Categories** | `GET /api/v1/categories/{id}/` | Category detail | BFF transport and verification | IMPLEMENTED (TRANSPORT) | UI edits from list data; no separate category detail page | P1 |
| **Categories** | `POST /api/v1/categories/` | Create category | `CategoryModal` | IMPLEMENTED | Name/parent/archive; no invented color or income classification | P1 |
| **Categories** | `PATCH /api/v1/categories/{id}/` | Edit/archive category | `CategoryModal` | IMPLEMENTED | Django enforces duplicate, hierarchy and active-child rules | P1 |
| **Categories** | `POST /api/v1/categories/defaults/` | Initialize missing defaults | `CategorySeedBanner` | IMPLEMENTED | Explicit action; server get-or-create prevents duplicate initialization | P1 |
| **Transactions** | `GET /api/v1/transactions/` | Server-filtered history | `/transactions` | IMPLEMENTED | Real 20-row pagination, search, kinds, owned accounts/categories, Kolkata presets/custom dates, sorting | P0 |
| **Transactions** | `POST /api/v1/transactions/` | Record receipt/expense/transfer | `QuickAddModal` | IMPLEMENTED | Exact INR strings, actual UUIDs, external funding source, durable original-key recovery | P0 |
| **Transactions** | `GET /api/v1/transactions/{id}/` | Immutable event detail | `/transactions/[id]` | IMPLEMENTED | Actual signed financial_effects and audit links; no fabricated legs | P0 |
| **Transactions** | `POST /api/v1/transactions/{id}/reverse/` | Audited mirror reversal | `TransactionActionModal` | IMPLEMENTED | Required reason/key; original history retained | P0 |
| **Transactions** | `POST /api/v1/transactions/{id}/void/` | Audited void via reversal | `TransactionActionModal` | IMPLEMENTED | Posted originals become voided; not deletion or an unposted-only operation | P1 |
| **Transactions** | `POST /api/v1/transactions/{id}/correct/` | Atomic reversal and replacement | `TransactionActionModal` | IMPLEMENTED | Full verified payload; UI edits amount/date/title/merchant/notes, preserving kind/accounts/category/references | P1 |
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

- Resolver/schema inventory agrees on 68 paths / 84 operations. Part 1 auth/onboarding is verified; Part 2 accounts/categories/core transactions are implemented with current evidence in the Part 2 report. Later modules remain deferred.
- Profile/preference updates and an onboarding-completion field are absent.
- Account updates support name/archive only. Category input supports name/parent/archive, not the preview color field.
- Account creation accepts `name`, `kind`, `opened_on` and optional `opening_balance` as an exact two-place INR string. An identical idempotent replay returns HTTP 200 plus the account object, without a `replayed` property.
- Direct cross-origin browser requests are unsupported by the current backend CORS configuration. Same-origin ingress/proxy must preserve Django's CSRF and session enforcement.

### D. Unsupported UI Features (None Fabricated)
- Part 2 enables actual scoped account/category/core-transaction mutations. Persistent background polling and bank synchronization remain unsupported. Later-domain workflows retain transparent integration notices; historical FULL labels describe UI only.

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

**Route inventory: VERIFIED (68 paths / 84 operations). Part 1: VERIFIED. Part 2: IMPLEMENTED.** See the [Part 2 evidence and limits](../../../docs/integration/part-02-core-transactions-verification.md) for current live verification. Accounts, categories and core transactions are no longer preview-only; historical FULL labels for later modules do not establish live API integration. Dashboard metrics and Fund Journey remain pending; Part 3 has not begun.
The linked reports distinguish real Django/browser evidence from mocked unit/component tests and record verification gates. Only the approved development target and Parts 1–2 are authorized; Dashboard/Fund Journey and other later financial integrations remain deferred.
