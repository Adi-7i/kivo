# Bug 02 — UI, responsiveness and performance audit

Date: 2026-10-26. **UI changes IMPLEMENTED / VERIFIED for the recorded cases. Backend latency remains an unresolved limitation.**

## Workspace and scope

Physical workspace/Git root: `/home/lucifer/Desktop/kivo`; branch: `UTA-TESTING`; source baseline before Bug 02 edits: `7726ef4` (Bug 01). Existing Bug 01 work was preserved. All source, reusable diagnostics, configurations and this report are in the original repository. No worktree/project copy, automatic commit, dependency upgrade, accounting change, migration or schema change was used.

Root/frontend AGENTS instructions, installed Next.js Proxy/loading/Link documentation, prior entry-flow and integration reports, all page routes and their shared financial components were reviewed. Financial calculations, permissions, CSRF/session transport and write/idempotency mechanisms remain authoritative in Django.

## Findings and changes

| Finding | Correction |
| --- | --- |
| Repeated page-level header/navigation; overcrowded horizontal module row, missing navigation on some detail pages | Persistent authenticated application shell, grouped left sidebar, explicit active links, desktop collapse and a mobile/tablet drawer. All eleven module links remain available. |
| No immediate navigation acknowledgement while server session verification runs | Next Link pending state gives immediate visual/screen-reader feedback. Existing per-request server authentication remains intact; automatic prefetching of the whole private menu remains disabled. |
| Equivalent first account page fetched by setup and financial forms/pages through separate query paths | Reuse the user-scoped verified first page through TanStack Query, then follow actual remaining pages. Concurrent readers share that query; cancellation/user changes and mutation invalidation remain supported. No process-wide private response cache. |
| Ten-second client identity/setup freshness and remounted header observers | Thirty-second client freshness, unchanged sixty-second session polling and focus/session-change restoration, plus a persistent header. Logout still clears private caches and replaces the document. Server/API checks are not cached or bypassed. |
| Developer copy throughout normal screens | Manual route/component review and literal JSX audit: **77 initial findings, zero final findings**. Removed phase badges, Django/API/precision/architecture banners and raw request dumps. Preserved meaningful financial explanations, actual validation/errors and unsupported-profile-operation notices. |
| Raw pending-write details mixed protocol information with user input | Readable saved-request summary retains amounts, descriptions, dates and reasons for review. Unconfirmed operations stay clearly unconfirmed; checking status and deliberately retrying the same saved operation remain mandatory. No blind write retry or optimistic financial success. |
| Login/Register branding used a crowded, oversized split panel | Responsive bounded grid, simpler Forest Green branding, readable form width and spacing; persistent password-rule rows and meaningful guidance retained. |
| Unreserved loading regions and chart motion | Dashboard/route skeletons, stable summary-card geometry, reserved rent/funding/report regions, suitable grid density, fixed chart space, disabled dashboard bar animation and reduced-motion CSS. |
| Transaction History overflow at 1024px | Measured document width **1449px against a 1024px viewport**. The absolute screen-reader-only Actions label escaped its unpositioned table scroll container. Positioning that container keeps the accessible label inside the local scroll area. Page overflow was not hidden. |
| Narrow dialogs and mobile keyboard access | Viewport-bounded dialogs, no conflicting slide transforms, readable titles, Radix focus trapping, Escape dismissal and explicit drawer focus restoration. |

Preserved typography, Forest Green/financial colors, shadcn/Radix components, existing forms and all financial routes. The dashboard continues rendering actual API metrics; no fake records, replacement accounting engine or unsupported backend operation was added.

Existing development record titles containing “Integration” were deliberately retained as data, rather than renamed or hidden for cosmetic reasons.

## Routes and interactions audited

- Root, Login, Register and all four first-time wizard steps.
- Dashboard; accounts/list/detail; transactions/history/detail; funding sources/detail/journey.
- People/contact details; shared bills/details; rent/reserves; budgets; reports; categories; profile.
- Not-found/error presentation, filters, date selectors, charts, loading/empty/error states.
- Quick Add, account, contact, lending, shared-bill, rent-plan, reserve, budget, CSV-export and category dialogs.

Widths: **360, 375, 768, 1024, 1280 and 1440px**. Desktop navigation is a vertically scrollable sidebar; smaller viewports use an accessible drawer. Collapse state survives client route transitions. The shell adds a skip link, labelled controls and `aria-current` indicators. Money Sources detail routes do not incorrectly select Money Accounts.

## Production performance evidence

Both timing runs used the optimized Next production server on localhost:3001 and the actual approved development Django/Supabase database via an isolated listener on 127.0.0.1:8001. The existing port-8000 process was preserved. Seven destinations were measured twice from Dashboard: Accounts, Transactions, Sources, People, Rent, Budgets and Reports.

| Observed metric | Before | After |
| --- | ---: | ---: |
| Navigation samples | 14 | 14 |
| Median visible navigation feedback | **592.85ms** | **22.30ms** |
| Median destination-heading appearance | **600.5ms** | **843ms** |
| First observed Quick Add opening | **156ms** | **76ms** |
| Equivalent extra account `?page=1` responses | **8** | **0** |
| Initial account-page responses | 15 | 15 |
| Browser API responses recorded | 126 | 116 |
| Maximum observed layout-shift sum | 0.25937 | 0.02658 |
| Unexpected HTTP 5xx in these successful runs | 0 | 0 |
| Header DOM preserved across final transitions | Not instrumented | **14/14** |

**Interpretation:** immediate feedback and account-read reuse improved. Overall heading arrival did **not** improve and is not reported as faster. The first-open dialog measurements are single observations, not a latency guarantee. These are bounded samples, not field Core Web Vitals or a controlled load benchmark. The first successful baseline used status settling; the final run additionally waited for network idle to include sequential widgets. Backend process restarts/network variation also limit causal comparisons of total response counts and layout-shift sums. No global speedup percentage is claimed.

Correlated Django logs further distinguish the service contribution: session GET median **580 → 673ms**, dashboard median **4560 → 5509ms**, dashboard maximum **4870 → 7946ms** in the respective successful windows. Client dashboard response maxima were **4885 → 7959ms**. Server identity verification continues on protected requests.

Private timing artifacts: `bug02-before-metrics.json`, `bug02-after-metrics.json`, successful `bug02-before-corrected.json` and `bug02-after-final.json` under ignored `.playwright-auth/`. No credentials/financial bodies were printed for timing analysis.

## Backend bottlenecks and limits

Separate longer attempts reproduced genuine failures; these have not been hidden:

| Endpoint/observation | Evidence |
| --- | --- |
| `GET /api/v1/reports/breakdown/` | Django 200 after **11997ms**, SQL elapsed 8429ms/max query 4309ms; frontend recorded 503 at the deadline. |
| `GET /api/v1/auth/me/` | Django 200 after **13886ms**; another session check returned a real **503 after 5018ms**, with **PoolTimeout / pool_acquisition and zero SQL elapsed**. |
| `GET /api/v1/dashboard/` | Django 200 after **25302ms**, SQL elapsed 24438ms/max query 6084ms; UI verification could not receive usable dashboard data within application deadlines. |
| `GET /api/v1/accounts/` | A later read took **15919ms**, SQL elapsed 14897ms/max query 10093ms. |

SQL elapsed includes transport and lock waits as well as execution; these figures do not identify the faulty network hop or prove database CPU saturation. The approved database remains Direct IPv6/TLS. A bounded read-only three-sample probe passed at **204.445–228.562ms**, with zero blocked sessions and no retransmission increase during that short probe. That does not establish sustained reliability.

Only the task-owned verification process was restarted after the acquisition failure; original application processes and persistent database settings were untouched. No timeout/connection limit was raised, no permissions weakened and no financial POST retry added. The previous Part 6 connectivity issue remains unresolved and its report has not been promoted to VERIFIED.

## Verification evidence

### Frontend and backend checks

- Baseline `pnpm typecheck && pnpm lint && pnpm test`: exit 0, **418 tests / 61 files**, 44.41s.
- Final `pnpm typecheck && pnpm lint && pnpm test`: exit 0, **431 tests / 64 files**, 44.67s. Isolated unit/component/mocked-HTTP evidence, including query ownership, cancellation/reuse/pagination, financial mutation recovery, saved-request review and copy auditing.
- Final `node node_modules/next/dist/bin/next build`: **exit 0**, compiled successfully, TypeScript passed, all **23 page entries** generated. Scoped worker-process permission was used; no project permissions were broadened.
- `backend/.venv/bin/python backend/manage.py check`: exit 0, no issues.
- `node scripts/diagnostics/audit_ui_copy.mjs`: zero findings; its in-process unit import avoids restricted subprocess requirements.
- Final `git diff --check`: exit 0. Prettier check of every changed/new frontend TypeScript, TSX, MJS and CSS file: exit 0. All **121 tracked/untracked changed paths** were checked against the report inventory and verified physically inside the original Git workspace. Backend, manifests/lockfile and root instructions remain unchanged (`git diff --exit-code`: exit 0).

### Browser results — evidence types kept separate

| Suite | Result | Evidence type |
| --- | --- | --- |
| Final navigation profiling | **1 passed**, 216.520s, exit 0; 14 real navigation samples | Actual Django/development PostgreSQL reads, zero 5xx in this final run. |
| Entry regression | **15 passed**, 122.198s, exit 0; zero skipped/flaky | One complete real Django registration/login/initial account/dashboard/session/logout journey, six real anonymous screen cases, and eight explicitly mocked session/denial cases. One injected account GET 503 within the live journey checks honest recovery. |
| First-time wizard | **1 passed**, 24.836s, exit 0 | Real Django registration/login; all four wizard steps at all six widths; readonly registered identity, exact ₹12.34 form preview, **zero account POSTs**, confirmed logout. |
| Responsive/layout/accessibility | **29 passed**, 86.438s, exit 0; zero skipped/flaky | Explicitly isolated replay of **32 actual owned Django GET responses**, with fixed 150ms GET delay. Not live financial integration evidence. |

The layout suite covers **168 viewport checks** (16 pages/details × 6, ten dialogs × 6, two public forms × 6), plus sidebar collapse/active links/focus trapping/reduced motion. The real wizard adds 24 step/viewport states. Runtime-page errors, real recovery controls, page overflow, dialog bounds, escaped focus and unexpected writes are asserted. Recharts' empty accessibility alert is not misclassified as a service failure.

The replay exists because remote failures blocked deterministic geometry QA. Captures use the existing authenticated test session and supported Django GETs, preserve response bodies privately, verify ownership on continuation and stop on failure. The opt-in loopback replay server requires the private fixture cookie, rejects **all writes**, returns failure for uncaptured reads, and is never a production route, app authentication provider or default runtime. No API bodies or financial amounts are generated to manufacture passing cases.

The final real entry journey confirmed an identifiable account/opening balance of **₹5.25**, matching Django dashboard liquid/safe-to-spend values, with **zero expense and eligible income**. Opening balance was not treated as income. Refresh, returning-user routing, logout, invalid-cookie entry and browser Back protection passed. New first-page cache tests verify that a changed user cannot reuse the prior user's data. Financial posting, idempotency keys, CSRF and session transport are unchanged.

Three identifiable development identities were created across the entry and wizard attempts; only the entry workflow created an initial money account. Test records were retained, not deleted as cleanup.

### Commands

From `kivo-frontend/`, with outputs retained privately and traces disabled:

```sh
pnpm typecheck && pnpm lint && pnpm test
node node_modules/next/dist/bin/next build

DJANGO_API_ORIGIN=http://127.0.0.1:8001 KIVO_UI_STAGE=after \
pnpm exec playwright test --config=playwright.ui.config.ts e2e/ui-performance.spec.ts --workers=1

pnpm exec playwright test --config=playwright.ui-replay.config.ts --workers=1

DJANGO_API_ORIGIN=http://127.0.0.1:8001 KIVO_ALLOW_DEV_TEST_RECORDS=1 \
pnpm exec playwright test --config=playwright.entry.config.ts --workers=1

DJANGO_API_ORIGIN=http://127.0.0.1:8001 KIVO_ALLOW_DEV_TEST_RECORDS=1 \
pnpm exec playwright test --config=playwright.ui.config.ts e2e/ui-onboarding.spec.ts --workers=1
```

The UI audits have dedicated configs/fixtures and are excluded from the unrelated default financial-fixture test collection. All listed cases were actually attempted and passed in their final runs; no assertion was disabled to manufacture success. The broad financial Playwright suite and backend database pytest suite were not rerun for this UI task. Their earlier evidence is not substituted for new execution.

### Earlier failed attempts retained

- An initial profiling selector expected the wrong budget heading; the actual heading was inspected and corrected. That failed result is retained.
- Longer baseline/live attempts failed on the genuine report/session/dashboard deadline and pool problems listed above. A retry after a service restart is not called a permanent reliability fix.
- The first responsive test mistook an empty Recharts `role=alert` node for an error. The replacement checks actual recovery controls, HTTP 5xx and page errors. A subsequent live setup failed on a genuine 503; its results remain separate from isolated layout evidence.
- Isolated responsive checks then found the real 1024px transaction overflow. A full run passed 27 cases and failed two ambiguous duplicate-CTA selectors; selectors now choose the first equivalent page action, preserving all geometry/focus/no-write assertions. The final run passed all 29.
- An initial wizard selector omitted required-field markers and timed out before account creation. Corrected label matching and bounded action timeouts produced the successful six-width run; the first test identity was retained.
- The copy-audit subprocess initially hit sandbox EPERM, passed a scoped retry, then was replaced by a reusable in-process module. Native URL handling was corrected for the test transformer. Final normal unit execution passes.
- A restricted CSS worker failure persisted in the generated Turbopack cache. Only that generated cache was preserved under ignored `.playwright-auth/`; the approved rebuild then succeeded. No source copy, broad cleanup or permission weakening was used.
- A missing DOM-reference property in the profiling helper's TypeScript type failed the final type/build gate. The declaration was corrected; final checks were rerun.

## Remaining limitations and handoff

**Frontend copy, navigation, tested responsiveness, keyboard behavior and immediate-feedback improvements: VERIFIED for the recorded cases.** Sustained backend availability and faster data delivery are **NOT VERIFIED / unresolved**. The final successful live window does not cancel earlier failures. Full financial regression/release readiness and manual screen-reader certification are outside this fix; no production hardening or later integration phase began.

Cleanup: task-owned Django, Next.js and replay listeners were stopped. Final socket inspection found only the existing application listener on port 8000; ports 8001, 3001 and 8002 were clear. A final read-only TLS database probe passed (one sample, 203.938ms), with **zero remaining connections among the 16 observed task-server connection IDs**. This short cleanup check is not a reliability guarantee. Source changes, test records and private evidence were preserved.

## Actual modified-file inventory

All paths below are relative to the original Git root. This includes copy-based expectation updates; their financial/security assertions remain intact. Private snapshots, credentials, screenshots, timing logs and generated caches are ignored runtime artifacts, not source deliverables.

- `kivo-frontend/e2e/financial-ui.ts`
- `kivo-frontend/e2e/part2-live.spec.ts`
- `kivo-frontend/e2e/part3-live.spec.ts`
- `kivo-frontend/e2e/part4-recovery.spec.ts`
- `kivo-frontend/e2e/part5-live.spec.ts`
- `kivo-frontend/e2e/part6-live.spec.ts`
- `kivo-frontend/e2e/phase2.spec.ts`
- `kivo-frontend/e2e/phase3.spec.ts`
- `kivo-frontend/e2e/phase4.spec.ts`
- `kivo-frontend/e2e/phase6.spec.ts`
- `kivo-frontend/playwright.config.ts`
- `kivo-frontend/src/app/(auth)/login/page.tsx`
- `kivo-frontend/src/app/budgets/page.tsx`
- `kivo-frontend/src/app/dashboard/page.tsx`
- `kivo-frontend/src/app/globals.css`
- `kivo-frontend/src/app/money/[id]/page.tsx`
- `kivo-frontend/src/app/money/page.tsx`
- `kivo-frontend/src/app/money/sources/[id]/page.tsx`
- `kivo-frontend/src/app/money/sources/page.tsx`
- `kivo-frontend/src/app/not-found.tsx`
- `kivo-frontend/src/app/onboarding/page.tsx`
- `kivo-frontend/src/app/people/[id]/page.tsx`
- `kivo-frontend/src/app/people/page.tsx`
- `kivo-frontend/src/app/providers.tsx`
- `kivo-frontend/src/app/rent/page.tsx`
- `kivo-frontend/src/app/reports/page.tsx`
- `kivo-frontend/src/app/settings/categories/page.tsx`
- `kivo-frontend/src/app/settings/profile/page.tsx`
- `kivo-frontend/src/app/shared-expenses/[id]/page.tsx`
- `kivo-frontend/src/app/shared-expenses/page.tsx`
- `kivo-frontend/src/app/transactions/[id]/page.tsx`
- `kivo-frontend/src/app/transactions/page.tsx`
- `kivo-frontend/src/components/layout/AppHeader.tsx`
- `kivo-frontend/src/components/layout/AppNav.tsx`
- `kivo-frontend/src/components/layout/PageContainer.tsx`
- `kivo-frontend/src/components/ui/card.tsx`
- `kivo-frontend/src/components/ui/dialog.tsx`
- `kivo-frontend/src/features/accounts/components/AccountFormModal.tsx`
- `kivo-frontend/src/features/auth/components/AuthPageLayout.tsx`
- `kivo-frontend/src/features/auth/components/RegisterForm.tsx`
- `kivo-frontend/src/features/auth/session.tsx`
- `kivo-frontend/src/features/budgets/components/LiveBudgets.tsx`
- `kivo-frontend/src/features/categories/components/CategoryModal.tsx`
- `kivo-frontend/src/features/categories/components/CategorySeedBanner.tsx`
- `kivo-frontend/src/features/dashboard/components/AccountsOverviewCard.tsx`
- `kivo-frontend/src/features/dashboard/components/DashboardHeader.tsx`
- `kivo-frontend/src/features/dashboard/components/FinancialSummaryGrid.tsx`
- `kivo-frontend/src/features/dashboard/components/RecentActivityCard.tsx`
- `kivo-frontend/src/features/dashboard/components/SpendingChartCard.tsx`
- `kivo-frontend/src/features/finance/QueryState.tsx`
- `kivo-frontend/src/features/finance/api.ts`
- `kivo-frontend/src/features/finance/queries.ts`
- `kivo-frontend/src/features/finance/useFinancialWrite.tsx`
- `kivo-frontend/src/features/funding/components/ExhaustionBanner.tsx`
- `kivo-frontend/src/features/funding/components/FundJourneyTimeline.tsx`
- `kivo-frontend/src/features/funding/components/FundOverviewCard.tsx`
- `kivo-frontend/src/features/funding/components/LiveFunding.tsx`
- `kivo-frontend/src/features/lending/components/ClaimCard.tsx`
- `kivo-frontend/src/features/onboarding/api.ts`
- `kivo-frontend/src/features/onboarding/components/FirstAccountStep.tsx`
- `kivo-frontend/src/features/onboarding/components/OnboardingShell.tsx`
- `kivo-frontend/src/features/onboarding/components/PersonalSetupStep.tsx`
- `kivo-frontend/src/features/onboarding/components/SetupSummaryStep.tsx`
- `kivo-frontend/src/features/onboarding/components/WelcomeStep.tsx`
- `kivo-frontend/src/features/people/components/ContactList.tsx`
- `kivo-frontend/src/features/profile/components/ProfileHeader.tsx`
- `kivo-frontend/src/features/profile/components/ProfileInfoSection.tsx`
- `kivo-frontend/src/features/profile/components/ProfilePage.tsx`
- `kivo-frontend/src/features/relationships/components/LivePeople.tsx`
- `kivo-frontend/src/features/relationships/components/LiveSharing.tsx`
- `kivo-frontend/src/features/relationships/components/RelationshipHistory.tsx`
- `kivo-frontend/src/features/rent/components/LiveRent.tsx`
- `kivo-frontend/src/features/rent/components/RentDetails.tsx`
- `kivo-frontend/src/features/rent/components/RentGenerateModal.tsx`
- `kivo-frontend/src/features/rent/components/RentOverviewCard.tsx`
- `kivo-frontend/src/features/rent/components/SafeToSpendCard.tsx`
- `kivo-frontend/src/features/reports/components/AnalyticsSkeleton.tsx`
- `kivo-frontend/src/features/reports/components/AnalyticsSummaryCard.tsx`
- `kivo-frontend/src/features/reports/components/CSVExportDialog.tsx`
- `kivo-frontend/src/features/reports/components/CategoryBreakdownChart.tsx`
- `kivo-frontend/src/features/reports/components/FinancialComparison.tsx`
- `kivo-frontend/src/features/reports/components/FundReportPanel.tsx`
- `kivo-frontend/src/features/reports/components/IncomeExpenseChart.tsx`
- `kivo-frontend/src/features/reports/components/LiveReports.tsx`
- `kivo-frontend/src/features/reports/components/ReportDetailPanel.tsx`
- `kivo-frontend/src/features/reports/components/SpendingDistributionChart.tsx`
- `kivo-frontend/src/features/reports/components/SpendingTrendChart.tsx`
- `kivo-frontend/src/features/shared-expenses/components/CreateSharedBillModal.tsx`
- `kivo-frontend/src/features/shared-expenses/components/SharedBillDetailHeader.tsx`
- `kivo-frontend/src/features/shared-expenses/components/SharedBillList.tsx`
- `kivo-frontend/src/features/shared-financial/FinancialSkeleton.tsx`
- `kivo-frontend/src/features/shared-financial/FinancialSummaryCard.tsx`
- `kivo-frontend/src/features/shared-financial/ServerMoney.tsx`
- `kivo-frontend/src/features/transactions/components/QuickAddModal.tsx`
- `kivo-frontend/src/features/transactions/components/TransactionActionModal.tsx`
- `kivo-frontend/src/features/transactions/components/TransactionDetailCard.tsx`
- `kivo-frontend/src/features/transactions/components/TransactionTable.tsx`
- `kivo-frontend/src/test/features/auth/entry-flow.test.tsx`
- `kivo-frontend/src/test/features/finance/action-recovery.test.tsx`
- `kivo-frontend/src/test/features/finance/financial-write.test.tsx`
- `kivo-frontend/src/test/features/finance/report-state.test.tsx`
- `kivo-frontend/src/test/features/profile/ProfilePage.test.tsx`
- `kivo-frontend/src/test/features/reports/AnalyticsSummaryCard.test.tsx`
- `docs/fixes/bug-02-ui-performance-responsive-audit.md` — new
- `kivo-frontend/e2e/capture-ui-reads.mjs` — new
- `kivo-frontend/e2e/ui-onboarding.spec.ts` — new
- `kivo-frontend/e2e/ui-performance.spec.ts` — new
- `kivo-frontend/e2e/ui-responsive.spec.ts` — new
- `kivo-frontend/e2e/ui-snapshot-server.mjs` — new
- `kivo-frontend/playwright.ui-replay.config.ts` — new
- `kivo-frontend/playwright.ui.config.ts` — new
- `kivo-frontend/src/app/loading.tsx` — new
- `kivo-frontend/src/components/layout/ApplicationShell.tsx` — new
- `kivo-frontend/src/components/layout/NavigationContext.tsx` — new
- `kivo-frontend/src/components/layout/PageLoading.tsx` — new
- `kivo-frontend/src/features/dashboard/components/DashboardSkeleton.tsx` — new
- `kivo-frontend/src/test/components/navigation.test.tsx` — new
- `kivo-frontend/src/test/components/ui-copy.test.ts` — new
- `kivo-frontend/src/test/features/finance/account-cache.test.tsx` — new
- `scripts/diagnostics/audit_ui_copy.d.mts` — new
- `scripts/diagnostics/audit_ui_copy.mjs` — new

Inventory: **103 modified tracked files / 18 new files**. No files were staged, reset or automatically committed.
