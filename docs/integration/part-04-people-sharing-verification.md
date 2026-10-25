# Part 4 — people, loans, repayments and shared expenses

## Recovery audit — 2026-10-25 — VERIFIED

The new owner instruction authorizes minimal, justified reliability/configuration changes and conditionally authorizes Part 5 after the complete Part 4 gate. Earlier results below remain historical; the cumulative journey is not marked passing until re-executed.

Original repository/branch remain `/home/lucifer/Desktop/kivo`, `INTIGRATION@b67f020`; all prior uncommitted work and the user's README/STARTUP edits are retained. Fresh baseline: TypeScript/lint/build pass, one existing BudgetModal warning, **296 tests / 54 files pass (49.92s)**. The original read-only database diagnostic connected with TLS to approved `postgres` on PostgreSQL 17.11: initialization 1547.145ms, SELECT 180.896/228.522/172.414ms, four idle clients and no observed lock wait. No credentials or host were printed.

### Evidence and narrowly scoped recovery

- **Verified latency/deadline mismatch:** retained Django evidence records a successful 42-query correction at 13,412ms (11,464ms SQL time), and default initialization at 12,054ms. Both exceed the prior 12-second bridge deadline despite successful backend results. TLS connection initialization also measured 1432–2356ms across twelve fresh bounded read-only probes; all twelve passed today. This does not establish the exact provider-side cause of earlier OperationalErrors.
- **Verified connection churn:** sixteen original-runner health requests used sixteen database connections and took 1629–1750ms each, all HTTP 200. The runner deliberately closes its request-local connection; without a pool that also discarded every healthy TLS socket.
- **Opt-in bounded development pool:** existing installed Django/psycopg integration now supports `KIVO_DEV_DB_POOL=1` in development settings. It retains the identical database target, TLS and socket failure detection. `CONN_MAX_AGE=0` releases each request's lease; the process pool has min 1/max 4 sockets, max 4 waiters, a 5-second acquisition bound, 60-second idle and 600-second lifetime. Health checks run before leases. The four-worker runner releases every request and closes the pool on shutdown. Production/default parsing remains unchanged; no business service, schema, role, credential or environment file was modified. Reconnection before acquiring a healthy lease never replays a financial HTTP request.
- **Measured pooled result:** identical sixteen health probes all returned 200. Cold requests took 1939–2344ms; subsequent requests took 409–820ms and reused three database sockets, rather than opening sixteen. Pool lifetime replacement may change cumulative backend PIDs; the active pool remains capped at four.
- **Measured write budget:** allowlisted financial/audited metadata POST/PATCH requests now have a bounded 30-second upstream / 35-second browser budget. Reads and auth retain 12/15 seconds, explicit caller deadlines still apply, and genuine 503 payloads remain unchanged. No financial retry was added. The change responds to measured healthy request durations, rather than treating every timeout as infrastructure failure.

Pre-gate recovery checkpoint: **13 backend unit tests pass / one database test outside the unit selection**, Ruff passes, Django checks pass, **305 frontend tests / 55 files pass (53.09s)**, TypeScript/lint/build pass. New unit evidence distinguishes real upstream 503 from proxy deadlines and confirms that errors are neither rewritten to success nor retried. Connection probes are real PostgreSQL/HTTP evidence; isolated transport tests remain mocks. At that checkpoint the full gate was running and Part 5 had not begun; the subsequent passing gate is recorded below.

### Recovery decision

**Final recovery evidence:** all **180 unique browser cases** have passing evidence across the complete 42.1m run and focused rechecks, including **12 real Django-backed authentication/financial journeys**. The full run itself was 175 passed / 5 failed, with the five failures retained and corrected; subsequent screen rechecks passed 38/38 and the final complete rent journey passed. Final frontend checks: **335 unit tests / 57 files (48.89s)**, standalone TypeScript/lint exit 0 (one existing warning), cold and incremental production builds exit 0. Django checks, OpenAPI validation and 24 selected backend unit tests pass. Exact per-run counts, corrected validation/selector defects and the build-cache recovery are recorded in Part 5.

The pooled service recorded **4,149 HTTP requests, zero backend 5xx**, through recovery and regression. Maximum observed request duration was 15,046ms; confirmed-write p95 was 11,022ms. These are bounded development observations, not a production uptime/load guarantee. Earlier provider-side OperationalError details remain uncertain. The documented pool-enabled runtime has no remaining critical 503 blocker in the verified scope; backend accounting and the configured database target remain unchanged.

The subsequent complete cross-module regression repeated Parts 1–4 successfully: Part 1 45.9s; Part 2 4.7m; Part 3 2.3m; the three isolated Part 4 cases 1.2m/1.2m/1.7m; the **entire cumulative Part 4 journey passed again (8.9m)**; committed-loan response loss/reload/original-key recovery passed (32.5s). These are actual Django/PostgreSQL results after the rent cache/bridge changes. Remaining rent/UI regression results are tracked in Part 5; these passing cases do not assert that the entire suite has finished.

Recovery-specific source changes are `backend/common/db.py`, `backend/config/settings/development.py`, `kivo-frontend/e2e/django_server.py`, `tests/test_development_pool.py`, `kivo-frontend/src/lib/api/timeouts.ts`, its consumers `src/lib/api/client.ts` and `src/lib/server/api-bridge.ts`, `src/test/api/request-budgets.test.ts`, and real journey assertions in `kivo-frontend/e2e/part4-live.spec.ts`. Operations/readiness/coverage documentation records the opt-in runtime. Existing financial services, serializers, models, migrations and dependencies are unchanged. After Part 5 implementation, checks pass: 332 frontend tests / 56 files (43.23s), typecheck, lint with the one retained warning, production build, Django checks and 24 selected backend unit tests. The complete browser regression is recorded separately in the [Part 5 report](part-05-rent-reserves-verification.md).

**VERIFIED — Part 4 gate GO for the conditionally authorized Part 5.** The complete uninterrupted real Django/PostgreSQL journey passed: **1 passed, 8.3m test / 8.9m overall, exit 0**, zero browser-observed 5xx. It includes contact create/edit/history; lending and borrowing; partial/full repayments; owner-paid equal and friend-paid custom bills; participant settlements; all three correction/reversal families; exact authoritative balances; missing-CSRF 403; foreign reads/writes including shared bills 404; invalid custom split 400; original UI-key replay 200/same UUID and changed-body 409; final dashboard/source UI; funding remaining capacity ₹9.41, unfunded ₹0.00; and refresh/session identity. This is the actual long journey, not a substitution of isolated cases. Historical failures below remain failures.

The controlled recovered service recorded no backend 5xx through both recovery attempts and the successful gate. Current repeated health probes and full financial/security evidence show no remaining critical reliability, authentication or accounting defect for this development gate. Historical OperationalError trigger details remain uncertain; no provider-wide or production availability guarantee is claimed. Default/production configuration remains separately unverified. Part 5 may now begin under the user's explicit conditional authorization; Part 6 remains excluded.

The first recovered full attempt reached the final idempotency/permissions step without backend 5xx, then failed after **8.4m**: its last loan was created through an external API fixture, which did not notify the already mounted browser query cache. The harness attempted to reverse that absent row. The last original operation now uses the actual loan UI and captures its exact outgoing key/body for the same replay/conflict assertions; this also verifies real UI invalidation. No financial/security assertion was removed. The rerun additionally checks actual source-page ₹9.41, Django funding capacity ₹9.41/unfunded ₹0.00, contact history and zero browser-observed 5xx responses throughout the whole journey.

Configuration provenance was independently corrected and verified: the actual loader reads repository-root `.env`, not `backend/.env`. A first provenance command targeting the nonexistent latter path failed without reading secrets or modifying state. Comparing effective engine/name/host/port/user/password with the root file returned **true**, with development settings, TLS and the four-socket pool. A fresh browser scan used nonempty real private material from that root file and found no matches in 49 JS bundles, nor any private `NEXT_PUBLIC_*` variable. Root `.env` is Git-ignored. Historical scans that omitted the root file are not treated as equivalent evidence.

---

Date: 2026-10-24. Implementation: **IMPLEMENTED**. Isolated real financial workflows: **VERIFIED**. Overall Part 4 completion: **PARTIALLY COMPLETE** because the longer cumulative journey remains **BLOCKED** by actual backend/database availability failures. Part 5 is excluded.

## Sequential gate and original workspace

Part 3 was implemented, tested and documented before these changes. Its [verification report](part-03-dashboard-funding-verification.md) records the Part 2 authentication/financial gate, actual database verification, 280 passing isolated tests, a passing production build, a real financial lifecycle and 24 desktop/mobile source screens. Its Part 4 decision was **GO** with no critical unresolved integration, security or financial-integrity defect.

All implementation edits are directly in `/home/lucifer/Desktop/kivo/kivo-frontend`, on the existing `INTIGRATION` branch against `b67f020`. Concurrent root `README.md` and untracked `STARTUP.md` are user-owned and untouched. No backend source, financial service, database schema, migration, dependency/lock file, rent workflow or design token is changed. No repository copy, worktree, destructive reset, cleanup deletion or production access was used.

## Verified contracts integrated

The current actual Django URLs, serializers, permissions, selectors, financial services, ledger models, sharing tests and OpenAPI remain **68 paths / 84 operations**. Generated TypeScript schemas are reused; no speculative response types were generated.

| Method/path | Supported behavior |
| --- | --- |
| `GET/POST /api/v1/contacts/` | Owned paginated contacts; create `display_name`, `notes`, `is_roommate`, `archived`. Personal records do not require Kivo accounts. |
| `GET/PATCH /api/v1/contacts/{uuid}/` | Actual per-contact receivable/payable, metadata editing and archival. PATCH is idempotent: 201 for a new metadata change, 200 for replay. No DELETE endpoint is invented. |
| `GET /api/v1/contacts/{uuid}/history/` | Actual immutable related events. |
| `GET /api/v1/claims/`, `GET /api/v1/claims/{uuid}/`, `GET /api/v1/claims/{uuid}/history/` | Actual principal, outstanding, direction, source event, open/partial/settled/cancelled state, and on-demand history. No claim mutation API. |
| `GET/POST /api/v1/loans/`, `GET /api/v1/loans/{uuid}/` | Actual `lend`/`borrow` using owned account/contact UUIDs, exact INR strings, effective date, title, optional notes/payment method. Returns Event. |
| `POST /api/v1/loans/{uuid}/correct/`, `/reverse/` | Full verified correction request plus audit reason; append-only reversal/replacement. |
| `GET/POST /api/v1/settlements/`, `GET /api/v1/settlements/{uuid}/` | Explicit claim/account, amount/date/title/notes/payment method. Django derives `repay_in`/`repay_out` and validates outstanding amounts. |
| `POST /api/v1/settlements/{uuid}/correct/`, `/reverse/` | Full correction plus audit reason, or reason-only reversal. The original claim is read from actual financial effects; Event.claims lists source claims and is empty for settlements. |
| `GET/POST /api/v1/shared-bills/`, `GET /api/v1/shared-bills/{uuid}/` | Bill wrapper with distinct bill UUID and nested Event UUID, payer, split method and server-recognized participant shares/claim UUIDs. |
| `POST /api/v1/shared-bills/{bill_uuid}/correct/`, `/reverse/` | Uses the **bill UUID**, never substitutes the nested event ID. Full request plus reason for correction; reason-only reversal. |
| Existing `GET /api/v1/dashboard/`, `/accounts/`, `/categories/` | Authoritative cross-module relationship summaries and owned form choices. |

Relationship/history lists expose page-number pagination, not invented search/sort query filters. All pages are downloaded with local page numbers; UI search/filter/sorting applies to the downloaded owned metadata. Unsupported/repeated query parameters and methods are rejected by the narrow bridge.

## Financial integrity, authentication and recovery

Existing same-origin Fetch bridge, opaque Django session, CSRF bootstrap/current token, strict origin checks, host-only cookies and private/no-store responses are retained. Django remains the authorization and accounting authority. No browser Supabase access, auth localStorage, fake API success or optimistic accounting update is introduced. Per-user query keys prevent previous-user placeholders; confirmed logout continues clearing private state.

All money is sent as validated decimal INR strings; integer-paise conversion is presentation only. Real date validation and Asia/Kolkata input defaults are reused. The shared form includes the owner exactly once, validates unique selected UUIDs, requires the friend payer to participate and sends `account: null` for friend-paid bills. Equal splits omit amounts so Django owns remainder allocation. Custom amounts are checked using exact BigInt solely for input conservation; Django determines recognized shares, claims and expense. No frontend balance, FIFO, repayment or shared-bill accounting engine exists.

Lending/recovery are not personal spending/fresh income. Borrowing creates a payable, repayment reduces it. A gross shared bill is displayed separately from the **server's original owner share** and current claim outstanding. No gross-minus-owner claim sum, claim-recovery progress calculation or invented sharing-only aggregate is displayed. Global summary cards explicitly say **all modules**. Unknown claim data is “Checking claims”, not “Settled”. Corrections preserve original history and can require reversing dependent settlements first; backend rejection is shown honestly.

Each financial/metadata intent is persisted in a user-scoped tab journal before POST/PATCH, with a stable idempotency key/body. Concurrent clicks are locked; the new modal single-use guard also prevents a second operation after an unusually fast confirmed response while its close callback completes. No automatic financial mutation retry is enabled. Ambiguous responses leave the form locked, expose a safe GET refresh, and require an explicit original-key/unchanged-body replay. Pending correction/reversal remains accessible if the original is already reversed. Confirmed responses require a UUID and invalidate accounts, transactions, funds/funding, reports, summary, dashboard, contacts, claims, loans, settlements and shared-bills caches. Failed background refresh never converts a confirmed posting into a retryable operation.

Journal limitations inherited from Part 2 remain: tab storage is required; tab closure loses that local intent, and there is no independent server idempotency-receipt lookup. Matching amounts/titles are never treated as proof of posting. Production HTTPS and production/load behavior remain **NOT VERIFIED**.

## Development database and executed verification

Owner-approved development Supabase PostgreSQL `postgres` is retained. The bounded loopback Django verification adapter serves the unchanged application, four workers, with per-request connection cleanup. It checks development settings/engine/database before serving. Test users/records are identifiable and retained; no SQL financial writes, schema operations or destructive cleanup are used. Automated backend pytest fixtures were not run against the live application database.

Fresh read-only diagnostic after an actual service failure: exit 0, database `postgres`, TLS true, PostgreSQL 17.11, connection initialization 1451.528ms, SELECT 204.695ms; six idle clients, one diagnostic active, no lock wait reported. No DSN, host, role, secret or cookie was printed.

| Check | Observed result |
| --- | --- |
| TypeScript | **VERIFIED**, exit 0 after test-type corrections. |
| ESLint | **VERIFIED**, exit 0, one retained BudgetModal RHF compiler warning; no error. |
| Vitest, isolated/mocked HTTP | **VERIFIED**, 296 passed / 54 files, 38.25s, exit 0. Includes exact split validation, endpoint/method restrictions, cache invalidation, fast duplicate click, each relationship domain's persisted original-key recovery, a one-contact equal split without frontend share amounts, and friend-paid custom correction using distinct bill/event UUIDs. These are not real Django integration tests. |
| Production build | **VERIFIED**, exit 0, 23 static prerender entries plus actual dynamic account/fund/contact/bill/event UUID routes, bridge and Proxy. Final application build compilation 1.1s, TypeScript 4.6s. Later changes are isolated E2E test code/configuration, checked separately by TypeScript. |
| Real Part 1–2 gate | **VERIFIED**, 2/2 passed, 7.7m before Part 3; actual Django sessions, transaction integrity, CSRF, correction/replay and user isolation. |
| Real Part 3 gate | **VERIFIED**, real lifecycle plus 24 source screens, detailed in separate report. |
| Desktop/mobile regression and response-loss recovery | **VERIFIED**, 59 passed / 1 failed / 0 skipped / 0 flaky, 17.0m, overall exit 1 due to the separately retained long-lifecycle failure. All 24 funding screens, 20 People/Sharing screens, committed-loan recovery and 14 retained deferred-rent/responsive UI checks passed. This is a scoped selection, not the entire repository browser suite. |
| Final long Part 4 lifecycle | **BLOCKED** by real service availability: 1 failed, 7.5m, exit 1. Contacts, lending/borrowing, partial/full repayment, loan correction/reversal, owner-paid equal bill and partial/full recovery of its first claim passed before the next settlement/status read failed. A 503 during safe status refresh prevented confirmation. No later financial step is claimed passed by this execution. |
| Three isolated remaining-flow cases | **VERIFIED**, 3 passed / 0 failed / 0 skipped, 7.4m overall, exit 0. Friend-paid custom bill/partial/full settlement 1.7m; bill correction/reversal 2.1m; settlement correction/reversal, replay/conflict, CSRF and foreign-user write rejection 2.8m. These passing cases do not relabel the failed cumulative journey as passed. |

Actual commands (frontend directory unless indicated):

```sh
pnpm typecheck
pnpm lint
pnpm test
node node_modules/next/dist/bin/next build
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/parts34-final-recheck.json pnpm exec playwright test e2e/part4-live.spec.ts e2e/part4-recovery.spec.ts e2e/phase4.spec.ts e2e/phase5.spec.ts --workers=1 --max-failures=2 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part4-lifecycle-final.json pnpm exec playwright test e2e/part4-live.spec.ts --project=chromium --workers=1 --max-failures=1 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part4-isolated.json pnpm exec playwright test e2e/part4-isolated.spec.ts --project=chromium --workers=1 --max-failures=3 --reporter=list,json
```

From `backend`: `.venv/bin/python manage.py check`, `.venv/bin/python manage.py spectacular --file /tmp/kivo-parts34-final-openapi.yaml --validate`, and the explicitly read-only `.venv/bin/python manage.py diagnose_database --samples 1`.

## Retained failures and runtime limits

Initial schema/component test failures were obsolete preview UUIDs, synthesized recovered amounts/progress and fake success text; assertions were aligned to the inspected backend behavior without skipping tests. Test development also caught BigInt literal incompatibility with the existing compilation target, an error-message type and synchronous effect-state lint errors; these were corrected without relaxing TypeScript/lint settings. The loan duplicate-click test first had the wrong button label; after fixing it, it exposed and drove the confirmed-response duplicate-submit guard.

The first live attempt stopped on an incorrect case-sensitive empty-state label (41.1s); the heading was corrected to actual “No contacts found”. A subsequent attempt created/edited contacts, then failed at the first loan when both the original request and deliberate same-key replay returned actual **503** (1.7m). Django logged OperationalError/connection initialization failures and slow queries; even `auth/me` temporarily returned 503. The frontend preserved the unresolved intent and did not fabricate success or repeat it automatically. The separate read-only diagnostic subsequently passed. These are retained failures, not passing live verification or evidence of duplicate accounting. Current application deadlines/security are unchanged.

Further retained attempts stopped on a real dashboard 503 after confirmed partial/full lending repayment (2.4m; 59 other selected cases unexecuted), and on a navigation observation window that expired while the owned contact query was loading (55.3s; 59 unexecuted). The accounting oracle now reads the same owned Django API directly with a test-only 60-second timeout; browser requests retain their original deadlines. Redundant same-page full navigations were removed from the lifecycle helper. Test navigation observation allows 40 seconds for session verification followed by the bounded resource request; it still requires actual HTTP 200.

The longer lifecycle subsequently passed lending, borrowing, partial/full repayment, loan correction/reversal, equal-split bill creation and partial claim recovery, then its 15-second response observer expired during a full shared settlement (5.9m). That observer began before Playwright's click auto-wait and could expire before the bounded HTTP operation finished. It now allows 40 seconds; financial responses still must be 200/201, and the actual application/client timeouts are unchanged. The distinct committed-loan response-loss test passed (1.5m), including refresh, same-key/body HTTP 200 replay, exactly one record and audited reversal. A real reversal 503 was also deliberately reconciled and replayed to HTTP 200. No financial assertion or backend security check was skipped to hide these failures.

Fresh final Django checks and spectacular validation both exited 0 (68 paths/84 operations). A value-only secret scan of 49 emitted browser JavaScript files found none of the configured private values and no private `NEXT_PUBLIC_*` variable. Backend/frontend environment files and private browser-session artifacts are Git-ignored. Targeted Prettier checks and `git diff --check` pass. The additional shared-bill unit cases briefly exposed misuse of a Playwright-only selector option in Testing Library; it was removed, and TypeScript/lint/all 296 tests pass.

## Source inventory, final decision and Part 5 boundary

Part 5 monthly-rent/reserve integration remains unauthorized and unimplemented. The retained rent test section was compared with `HEAD` and is byte-identical; its passing UI cases do not establish rent API integration.

### Final financial and security findings

Real Django evidence verifies lending/borrowing outside ordinary expense/income, partial/full loan repayments, immutable loan corrections/reversals, owner-paid equal splitting with the server's remainder paise and claim recovery. The longer journey passed these assertions before a subsequent status read failed. Separate fresh-owner workflows then verified the remaining operations without changing the failed test or weakening application behavior:

- Friend-paid ₹0.10 bill, owner share ₹0.03: Django reported cash ₹10.00, payable/expense ₹0.03. Actual UI repayments ₹0.01 and ₹0.02 produced cash ₹9.97, no payable, expense still ₹0.03, external income ₹0.00, and the live bill displayed All Settled Up.
- Friend-paid ₹0.03 bill corrected to ₹0.04 with owner share ₹0.02: the original event became reversed, replacement superseded its event UUID, payable/expense became ₹0.02 without cash movement. Audited reversal restored cash ₹10.00 and zero payable/expense.
- ₹0.03 lending fixture, actual UI repayment ₹0.01 corrected to ₹0.02: Django reported cash ₹9.99 and outstanding receivable ₹0.01. Reversing that settlement and then the originating loan restored cash ₹10.00 and zero claims/expense/income. Exact same-key fixture replay returned 200 with the same event; changed amount returned 409. Missing CSRF returned 403. Foreign contact/loan/claim/settlement reads and contact/loan/settlement write attempts returned 404; the owned final financial summary remained unchanged.

The response-loss case separately verified one committed loan after a dropped browser response, refresh and original-key/body HTTP 200 replay, followed by audited reversal. Actual 503 recovery also returned the original confirmed resource through deliberate unchanged-key replay. No posting success is inferred from matching amounts, optimistic balances or mock responses. Private cache invalidation is covered by the isolated tests, real screens and existing real Parts 1–2 identity-switch gate; the entire repository browser suite was not rerun.

There are **62 passing selected browser cases** across the retained 59-case regression/recovery evidence and the three fresh-owner cases, with **one distinct cumulative lifecycle still failing**. This is deliberately not reported as a clean 63-case passing run. The earlier real Part 3 financial lifecycle and Part 1–2 gate have separate passing evidence. Unit/component/mocked-HTTP verification is **296/296**, TypeScript/lint/build/Django checks/schema validation pass, and configured secret scans pass. Lint retains one unrelated BudgetModal warning. The isolated E2E helper initially needed an explicit string annotation for an idempotency key; its final TypeScript/lint/format checks pass.

The unexecuted tail of the cumulative case remains **NOT VERIFIED** as one continuous browser journey: final cross-page cache/source/dashboard reconciliation after all combined writes, foreign shared-bill HTTP checks, the real invalid-custom-split 400 assertion and final refresh checks. Separate tests verify other foreign-resource reads/writes, same-key conflict, CSRF, refresh recovery and exact split input, but they do not substitute for these missing assertions. Server-side shared-bill ownership/participant validation was inspected; this is source evidence, not a claimed passing HTTP isolation test for that tail.

### Final GO / NO-GO and exact remaining prerequisite

**Part 3: VERIFIED. Part 4 code: IMPLEMENTED. Controlled isolated Part 4 workflows: VERIFIED. Overall Part 4: PARTIALLY COMPLETE. Final complete-verification gate: NO-GO / BLOCKED by service availability.** No confirmed unresolved authorization, duplicate-posting or accounting-integrity defect was found, and no backend business logic was changed. Repeated database connection initialization failures/slow requests still produce real 503s, including during read-only status reconciliation. A passing diagnostic between failures does not establish stable availability.

Stabilize the existing development PostgreSQL connection path and Django response latency sufficiently for the established bounded browser requests, then rerun the exact `part4-live.spec.ts` command above to completion. Backend/infrastructure changes require their own reviewed authorization; this task does not change Django services, increase application deadlines or create another database. Until that case passes, do not claim full Part 4 verification or production readiness. Part 5 requires separate authorization and review of this remaining gate. Test records remain identifiable and retained; none were deleted as cleanup.

### Final original-repository review

`git rev-parse --show-toplevel` verified `/home/lucifer/Desktop/kivo`, branch `INTIGRATION`, baseline `b67f020`. Original-workspace `git status`, `git diff --stat` and `git diff --check` verify the source changes; the complete inventory follows. Backend, schema, package/lock files, rent source, global CSS and root layout diffs are empty. User-owned root README/STARTUP changes remain preserved. No commit, push or deployment was performed.

Final Git inventory: **49 tracked paths modified plus 20 new paths**, excluding the user's README/STARTUP, all 69 inside the original repository. JSON evidence identity comparison confirms 62 unique passing cases, one unique failing case and no overlap. The temporary bounded Django verification process was stopped gracefully with exit 0 after testing; Playwright closed its own Next.js server. Test records and ignored evidence artifacts remain retained.

The following combined Parts 3–4 inventory records all 69 implementation/report paths currently modified or newly created against the original Git baseline. Part 3's earlier separate gate inventory remains in its report. Shared bridge, recovery, query and fixture changes necessarily serve both modules. User-owned root README/STARTUP changes are excluded.

```text
docs/audits/backend-api-frontend-coverage.md
docs/integration/integration-readiness.md
docs/integration/part-03-dashboard-funding-verification.md
docs/integration/part-04-people-sharing-verification.md
kivo-frontend/docs/audits/backend-api-frontend-coverage.md
kivo-frontend/docs/integration/integration-readiness.md
kivo-frontend/e2e/financial-ui.ts
kivo-frontend/e2e/global-setup.ts
kivo-frontend/e2e/live-api.ts
kivo-frontend/e2e/part3-live.spec.ts
kivo-frontend/e2e/part4-isolated.spec.ts
kivo-frontend/e2e/part4-live.spec.ts
kivo-frontend/e2e/part4-recovery.spec.ts
kivo-frontend/e2e/phase4.spec.ts
kivo-frontend/e2e/phase5.spec.ts
kivo-frontend/playwright.config.ts
kivo-frontend/src/app/dashboard/page.tsx
kivo-frontend/src/app/money/sources/[id]/page.tsx
kivo-frontend/src/app/money/sources/page.tsx
kivo-frontend/src/app/people/[id]/page.tsx
kivo-frontend/src/app/people/page.tsx
kivo-frontend/src/app/shared-expenses/[id]/page.tsx
kivo-frontend/src/app/shared-expenses/page.tsx
kivo-frontend/src/features/dashboard/api.ts
kivo-frontend/src/features/dashboard/components/CategoryBreakdownCard.tsx
kivo-frontend/src/features/dashboard/components/FinancialSummaryGrid.tsx
kivo-frontend/src/features/dashboard/components/RecentActivityCard.tsx
kivo-frontend/src/features/dashboard/components/SpendingChartCard.tsx
kivo-frontend/src/features/dashboard/types.ts
kivo-frontend/src/features/finance/QueryState.tsx
kivo-frontend/src/features/finance/api.ts
kivo-frontend/src/features/finance/queries.ts
kivo-frontend/src/features/finance/useFinancialWrite.tsx
kivo-frontend/src/features/finance/useOwnedQuery.ts
kivo-frontend/src/features/funding/api.ts
kivo-frontend/src/features/funding/components/LiveFunding.tsx
kivo-frontend/src/features/lending/components/ClaimCard.tsx
kivo-frontend/src/features/lending/components/LendBorrowModal.tsx
kivo-frontend/src/features/lending/components/RepaymentModal.tsx
kivo-frontend/src/features/lending/schemas/loan.schema.ts
kivo-frontend/src/features/lending/schemas/settlement.schema.ts
kivo-frontend/src/features/lending/types/index.ts
kivo-frontend/src/features/people/components/ContactCard.tsx
kivo-frontend/src/features/people/components/ContactDetailHeader.tsx
kivo-frontend/src/features/people/components/ContactList.tsx
kivo-frontend/src/features/people/components/ContactModal.tsx
kivo-frontend/src/features/relationships/api.ts
kivo-frontend/src/features/relationships/components/LivePeople.tsx
kivo-frontend/src/features/relationships/components/LiveSharing.tsx
kivo-frontend/src/features/relationships/components/RelationshipHistory.tsx
kivo-frontend/src/features/relationships/queries.ts
kivo-frontend/src/features/relationships/useToday.ts
kivo-frontend/src/features/shared-expenses/components/CreateSharedBillModal.tsx
kivo-frontend/src/features/shared-expenses/components/SharedBillCard.tsx
kivo-frontend/src/features/shared-expenses/components/SharedBillDetailHeader.tsx
kivo-frontend/src/features/shared-expenses/components/SharedBillList.tsx
kivo-frontend/src/features/shared-expenses/schemas/shared-bill.schema.ts
kivo-frontend/src/features/shared-expenses/types/index.ts
kivo-frontend/src/features/transactions/components/TransactionPagination.tsx
kivo-frontend/src/lib/server/api-bridge.ts
kivo-frontend/src/test/api/server-auth.test.ts
kivo-frontend/src/test/features/finance/dashboard-funding.test.ts
kivo-frontend/src/test/features/finance/financial-write.test.tsx
kivo-frontend/src/test/features/finance/relationships.test.tsx
kivo-frontend/src/test/features/finance/report-state.test.tsx
kivo-frontend/src/test/features/lending/ClaimCard.test.tsx
kivo-frontend/src/test/features/lending/loan.schema.test.ts
kivo-frontend/src/test/features/shared-expenses/SharedBillCard.test.tsx
kivo-frontend/src/test/features/shared-expenses/shared-bill.schema.test.ts
```
