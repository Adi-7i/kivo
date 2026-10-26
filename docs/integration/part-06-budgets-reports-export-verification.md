# Part 6 — budgets, reports and CSV export

Date: 2026-10-25. Final status: **IMPLEMENTED / PARTIALLY COMPLETE. Full live verification BLOCKED — NO-GO.** No production release audit has begun. This report is updated from actual command/test evidence; passing isolated tests are not treated as real Django verification.

**Recovery update, 2026-10-25:** the addendum below supersedes earlier current-status claims about unverified downloads, browser coverage and the Git checkpoint. Live CSV and all 38 Part 6 screen cases now have passing evidence. The budget/correction journey passed. Intermittent database transport latency still exceeded the unchanged proxy deadline, so complete financial/security regression remains **BLOCKED**. Earlier failures are retained below.

**2026-10-26 follow-up:** **workspace correction VERIFIED; Part 6 PARTIALLY COMPLETE / BLOCKED.** The three complete Part 6 financial/CSV/isolation cases and all 38 Part 6 screen cases passed. The full 189-case regression was stopped after a renewed real proxy 503: six passed, one interrupted, 182 not run. Reusable diagnostics now exist and execute under the original repository's `scripts/diagnostics/`; the earlier external-script location was corrected. The final section records actual measurements, retained failures and required next input. No configuration/accounting/schema change or production hardening occurred.

## Original workspace and mandatory gate

Verified Git root and current directory: `/home/lucifer/Desktop/kivo`; frontend `kivo-frontend`, Django `backend`. Existing branch `INTIGRATION`, starting HEAD `611c9dcdbdd31b043cb892bfc511c7e82098e281`. Contrary to the historical prompt's uncommitted baseline, current status was clean: the owner had committed the previous integrations. That commit is the safe checkpoint. No branch replacement, stash, reset, temporary implementation copy, automatic commit or unrelated overwrite was used.

Read root/frontend AGENTS, Parts 0–5 reports, ADR-006, actual report/ledger/rent URLs, serializers, selectors, permissions, services, existing reporting tests, generated contracts and installed Next.js 16 route-handler/search-param documentation.

Fresh baseline: TypeScript exit 0; ESLint exit 0 with one existing BudgetModal RHF warning; Vitest **335/335 in 57 files, 57.12s**, exit 0; production build exit 0 (compile 3.3s, TypeScript 9.0s, 23 prerender entries and actual dynamic routes). Django checks and spectacular validation exit 0. Existing generated budget/report types match source. Schema remains **68 paths / 84 operations**.

Before Part 6 source edits, the real unchanged Part 4 committed-loan response-loss case and full approved Part 5 friend-paid rent/reserve journey passed **2/2, 3.8m overall, exit 0** (36.5s and 2.4m). Evidence: ignored private `part6-baseline-gate.json`. This gate was GO; full Parts 1–5 regression is separately recorded below.

## Development database and safe execution

The existing owner-approved dedicated development Supabase PostgreSQL `postgres` remains configured. A sandbox DNS failure was rerun with scoped network permission; the real read-only diagnostic then exited 0: PostgreSQL 17.11, TLS true, initialization 1531.72ms, SELECT 159.215ms. Credentials, host, role and connection string were not printed.

Real HTTP tests use the already documented bounded four-worker loopback runner and opt-in development pool (`KIVO_DEV_DB_POOL=1`), same database target, CSRF trusted loopback origins, min 1/max 4 sockets and per-request lease release. No backend source, business service, migration, schema, dependency, environment file or database cleanup is changed. Identifiable `p6-*` identities and small records are created via supported workflows and retained. Automated pytest DB fixtures are not pointed at the live application database.

Backend unit selection: `backend/.venv/bin/python -m pytest tests/test_reporting.py tests/test_reporting_contract.py tests/test_rent_calendar.py tests/test_development_pool.py tests/test_database_diagnostics.py -m unit`: **57 passed, 15 database cases outside the explicit unit selection, 0.25s, exit 0**. These tests cover calendars, strict query validation, formula escaping, pool configuration and diagnostic contracts; they are not financial database integration tests.

## Verified API contracts integrated

All paths begin `/api/v1/`.

| Method/path | Actual contract and frontend use |
| --- | --- |
| GET/POST `budgets/` | Owned page-number lists, only `archived` and `page` filters. Create name, nullable category, monthly/custom period, inclusive period_start/end, exact INR-string limit, integer warning_percent 1–100 and archived. |
| GET/PATCH `budgets/{uuid}/` | Detail/progress and supported configuration updates. No DELETE endpoint. Idempotency-Key required; new write 201, identical replay 200, changed payload 409. |
| GET `reports/summary/` | Coherent owner-scoped period, expense, external income, received/paid cash, lending/borrowing/repayment/transfer/shared/refund classifications, count, average, peak dates and prior-period comparison. |
| GET `reports/trends/` | Shared filters plus `interval=day|week|month`; actual sparse effective-date signed expense buckets. |
| GET `reports/breakdown/` | Shared filters plus `dimension=category|account|merchant|payment_method|contact|kind`; key/label, signed expense amount and transaction count. No percentage field. |
| GET `reports/funds/` | Actual paginated funding attribution and movement fields. Only run/page supported, explicitly separate from transaction-date report filters; pins the existing FIFO snapshot. |
| GET `reports/export/` | Authenticated UTF-8/BOM CSV stream with attachment filename, private/no-store, nosniff, timezone/generated-at/filter/date-bound metadata. The frontend downloads Django bytes. |

Budget fields `spent`, `remaining`, `overspending`, `utilization_percent` (nullable) and `warning_state=ok|warning|at_limit|exceeded` are read directly. Zero limits are supported; negative remaining/refund spending is not clamped. Monthly input uses real month boundaries; custom dates are inclusive. Overall/category budgets can overlap and must not be added. Active duplicates within the same scope are rejected by Django. Archive and period selection expose retained configuration; immutable configuration audit rows exist in Django but **no public budget audit-history endpoint is exposed**.

Summary/trend/breakdown/CSV share the actual ledger filters: period, date, date_from/date_to, amount_min/max, account, destination, category, kind, contact, payment_method, merchant, search and sort (backend also supports validated ordering). UI presets use exact `today/yesterday/week/last_seven_days/month/previous_month/year/all`; week means Monday–Sunday, distinct from rolling seven days. Inclusive bounds, currency, timezone, local as-of date and incomplete-period flag come from Django. Unsupported/repeated/invalid query parameters are rejected. Budget period/status/search filtering applies locally to all retrieved owned pages because its API has no date/category/search filters.

## Implementation, accounting and cache boundaries

Existing pages, App Router, Forest Green tokens, font, shadcn primitives and Recharts remain. Preview data/view switches are removed from integrated pages. Forms use RHF/Zod, actual category/account/contact UUIDs, exact money strings and real calendar validation. Unsupported notes, configurable CSV encoding/header removal and speculative export checksums are not submitted.

Reports use only server financial figures. Cash received/paid are displayed independently; **net cash flow is unavailable as a direct field**. Category/channel percentages and a historical income series are also unavailable. The selected period's actual external income/expense can be charted, but historical income buckets, net savings, new percentages or inferred totals are not fabricated. Refund signs and unassigned dimensions remain visible. Signed category data uses a bar instead of an invalid negative pie slice.

URL filters apply/clear explicitly, survive refresh, and carry into CSV and supported transaction drill-downs. Transaction history initializes category/kind/contact/merchant/payment/date/amount filters rather than broadening a selected report. Expense-group tables use local 20-row pagination on unpaginated server datasets. Fund reports retain actual server pagination. Charts cap category/channel geometry at 20 groups and trend geometry at 366 buckets; accessible data tables retain server values and pagination, with explicit chart limits.

All new query keys include the authenticated user and complete filters/interval/dimension. Existing logout clears private state. Existing `invalidateFinance` already covers budgets/reports/dashboard/accounts/transactions/funds/relationships/rent/reserves; every confirmed budget or financial mutation uses it. Report reads hold Django's owner lock, so report panels are sequenced to avoid sockets waiting on the same owner's other reports. Failure of one report does not block attempts to load later panels.

Budget mutations reuse the existing persisted tab intent, original Idempotency-Key/body, synchronous duplicate lock, single-use modal confirmation, no mutation retries and deliberate GET-then-original-key recovery. Unknown confirmation is never success. Definitive validation errors release the intent. Cache refresh errors cannot turn a confirmed write into a second posting. Budget creation never moves money.

CSV uses the centralized Fetch client's download response mode and same-origin bridge. Non-CSV/4xx/5xx/truncated responses never become a file. Attachment filenames remove paths/control characters and enforce a CSV suffix. Object URLs are revoked on timer/unmount; requests abort on unmount/identity change. Duplicate clicks are locked. The byte stream is not parsed/regenerated as financial data in product code; a bounded prefix only identifies the genuine header-only empty-file state. Backend formula protection is retained. Read-only export does not require CSRF; writes still do.

## Executed verification and retained failures

- First expanded Vitest run: **383 passed / 1 failed, 58 files, 60.54s, exit 1**. The failing assertion found that the bridge dropped the CSV nosniff header. The bridge now sets it; focused contract rerun **35/35, 2.91s, exit 0**. The final full run passed 393/393 in 60 files (46.66s, exit 0).
- First real budget journey: **1 failed, 2.5m, exit 1** after actual budget create/utilization/over-budget/expense correction steps. Test helper incorrectly expected AppNav on the transaction-detail screen; fixed to use the actual Back to Transactions link. The helper also now observes PATCH for budget edits. No financial assertion was removed.
- A later real expense correction committed in Django after **37,408ms / 42 queries / 34,875ms SQL time**, exceeding the existing 30s bridge budget. The UI preserved its intent and explicit original-key replay returned 200. This is retained actual proxy-503 evidence, not a passing clean run or a reason to silently extend timeouts. Provider query spikes also affected auth/read requests. At the diagnostic checkpoint, **394 Django requests / zero Django 5xx**; proxy timeout and Django response status are distinguished. The subsequent controlled recheck failed on genuine Django 503s; reliability is BLOCKED as recorded below.

## Final verification gates and retained failures

**Full Part 6 verification: BLOCKED / NO-GO.** No financial writes were run after the repeated real Django failures. A read-only mode reuses the existing private test session, restricts collection to the screen specification and blocks browser API mutations; it never falls back to creating records. A recovered SELECT or health probe is not treated as a recovered financial/authentication gate.

| Executed check / private artifact | Actual result |
| --- | --- |
| Baseline Part 4 recovery + Part 5 exact policy gate, `part6-baseline-gate.json` | **2 passed / 0 failed / 0 skipped**, 230265.869ms overall, exit 0, before Part 6 source edits. |
| Initial budget journey, `part6-live-initial.json` | **0 passed / 1 failed**, 200120.626ms overall, exit 1; missing test navigation after a confirmed correction, corrected in the helper. |
| First complete Part 6 selection, `part6-live-recheck.json` | **0 passed / 1 failed / 1 interrupted / 1 unexecuted**, 480790.209ms, exit 130. Full budget operation prefix passed, then a genuine chart formatter crash occurred. The following financial case was interrupted to fix that confirmed defect; the JSON aggregate counts its interrupted/unexecuted tail as skipped, not application test PASS. |
| Rebuilt/sequenced Part 6 selection, `part6-live-sequenced.json` | **0 passed / 3 failed**, 211080.523ms, exit 1. The first transaction/reconciliation could not confirm through actual 503s; the next two tests failed at fresh-user registration with actual 503. These are not mocks or false green retries. |
| Read-only desktop/mobile screen selection, `part6-read-only-screens.json` | **6 passed / 4 failed / 28 unexecuted**, 118691.573ms, exit 1 after the four-failure stop limit. No new fixtures or financial records. The six passes cover owned budget figures, category/archive filters, month selection, actual form options/validation, edit configuration, and actual report summary/comparison/chart rendering. |
| Final Vitest | **393 passed / 60 files**, 46.66s, exit 0. Isolated component/HTTP tests only; includes CSV bytes/content types/statuses/stream errors, formula-safe backend unit evidence, filename handling, original-key recovery, duplicate downloads, nullable server progress, exact filters/drill-downs, fractional chart coordinates and a 1,000-group paginated table. |
| Final standalone TypeScript / ESLint | Both **exit 0**, no lint warning after replacing BudgetModal watch with useWatch. |
| Production build | Final cold build **exit 0**, compile 12.0s / TypeScript 5.2s, 23 prerender entries and actual dynamic routes. Source app code unchanged after this build; later edits are test selectors/configuration/docs and pass standalone TypeScript/lint. |
| Django checks / OpenAPI | **exit 0**; freshly counted **68 paths / 84 operations**. |
| Backend unit selection | **57 passed / 15 database cases outside explicit unit selection**, 0.25s, exit 0. No live-database pytest flush/migration. |
| Final source/security checks | `git diff --check` exit 0; 49 browser JS files scanned against 3 distinct configured private values/encoded or decoded credential parts: **zero matches**. No private NEXT_PUBLIC variable names. Environment/session/test artifacts are ignored. |

The read-only suite found Next's separate route-announcer alert in addition to the intended form/query alert; selectors now match the actual error text. Its multiple-read chart case has a 120s **test observation budget**, with original **12s upstream / 15s browser read deadlines unchanged**. These test-only corrections were type/lint checked but **not rerun live** after the safety stop. Their failures remain listed. The separate filter-persistence case displayed the genuine “Session verification is temporarily unavailable” screen; it was not an invalid-session redirect or a mock.

The later build first failed in the sandbox when a Turbopack CSS worker could not bind a port; an approved normal-user build reproduced the cached error. Only the ignored generated `.next/cache/turbopack` directory was renamed to `turbopack-part6-sandbox-diagnostic-20261025` for retention. The subsequent fresh-cache approved build passed. No source copy, font/configuration/dependency change, root access, blanket permission change or broad cleanup was used. One earlier build correctly failed on a Testing Library-only selector type error; that test selector was fixed and subsequent TypeScript/build passed.

### Financial evidence and limits

The executed prefix of the 4.2m failed budget journey verified actual overall/category creation, exact 60%/75% warning states, spending above limits with signed negative remaining/overspending, expense correction and reversal, budget limit PATCH, archive/restore, duplicate overlap rejection, a custom zero limit and its later one-paise expense, and server-null utilization. It then failed rendering the final report because of the now-fixed fractional axis tick. This is verified prefix evidence, **not a passing complete financial journey**.

The complete loan/shared/rent classification journey, expected 0.37 INR recognized owner expense versus 0.50 INR eligible external income, cross-module final balances, filtered CSV reconciliation, budget ambiguous-response replay case, comparisons, full pagination and two-user export checks remain **NOT VERIFIED as complete real journeys**. Its fixture writes are not substitute proof that later assertions passed. Existing backend financial services and previous Parts 1–5 historical evidence remain intact, but post-Part-6 full regression is **BLOCKED / NOT EXECUTED**.

Actual browser CSV download/filter/formula/empty-file/foreign-user scenarios were not reached after the safety stop; **CSV code IMPLEMENTED, live CSV verification NOT VERIFIED**. Isolated mocked-download tests and executed backend safe_cell unit tests do not relabel that as verified. UTF-8 and headers are implemented from the actual backend contract.

### Reliability blocker and exact recovery requirement

Final controlled runner log: **608 Django HTTP requests, 5 genuine backend HTTP 503, maximum response 37408ms**, plus the separately observed proxy deadline. The failures include:

| UTC time | Actual request | Status / duration |
| --- | --- | --- |
| 15:54:15 | POST transactions | 503 / 25025ms, OperationalError |
| 15:54:21 | GET transactions reconciliation | 503 / 5001ms |
| 15:54:47 | POST registration, fresh test user | 503 / 5002ms |
| 15:54:53 | POST registration, another fresh test user | 503 / 5002ms |
| 16:05:11 | GET authenticated current-user | 503 / 5002ms during read-only screens |

After the first outage, a fresh direct TLS diagnostic passed (initialization 2361.855ms, SELECT 204.682/205.337ms), and three then twelve bounded health GETs all returned 200. Twelve samples ranged 669–5771ms. An earlier diagnostic initialization took 6990.56ms while subsequent SELECTs took 155–205ms. The later current-user failure demonstrates why those passing probes did **not** resolve the blocker. Read-only trend/breakdown responses also took 25383ms/14861ms, beyond unchanged application read budgets.

The provider/network/pool-acquisition root cause is **NOT ESTABLISHED** from these client observations. Sanitized logs show an established-query OperationalError followed by failures at the 5s bounded acquisition interval; that timing is consistent with an unavailable connection lease, not proof of the Supabase-side cause. Diagnostics between failures do not prove historical peak connection counts or locks. No backend accounting rewrite, timeout inflation, SQLite fallback, fake response, automatic POST retry, schema change or database reset is used to conceal it.

**Required resolution:** inspect the development PostgreSQL/Supabase connection path and provider/pooler logs around these UTC timestamps; stabilize connection acquisition and query latency so session and safe reconciliation reads reliably finish within their bounded 12s upstream budget and audited financial writes within 30s. Use the existing approved development database. Apply only an evidence-backed infrastructure/configuration correction within authorized scope; business-logic/schema changes would require separate authorization. Then rerun the unchanged complete Part 6 journeys and Parts 1–5 regression. A new staging database is not required.

Identifiable test records are retained, including failed/unconfirmed intents. A timeout or 503 does not prove rollback. Never manufacture cleanup, infer success from similar amounts/titles, or retry an unresolved write using a new key. Fresh isolated test identities remain authorized once the safety gate is restored.

## Commands and reproducible verification

Commands below were executed from `kivo-frontend` unless prefixed with backend/root paths. Artifacts reside in the ignored private `.playwright-auth` directory; traces remain off. Full backend database pytest suites were not run against the application database.

```sh
pnpm typecheck
pnpm lint
pnpm test
node node_modules/next/dist/bin/next build
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-baseline-gate.json pnpm exec playwright test e2e/part1-live.spec.ts e2e/part4-recovery.spec.ts e2e/part5-live.spec.ts --grep 'approved friend-paid|committed|Django authentication' --project=chromium --workers=1 --max-failures=1 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-live-initial.json pnpm exec playwright test e2e/part6-live.spec.ts --grep 'real budget create' --project=chromium --workers=1 --max-failures=1 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-live-recheck.json pnpm exec playwright test e2e/part6-live.spec.ts --project=chromium --workers=1 --max-failures=3 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-live-sequenced.json pnpm exec playwright test e2e/part6-live.spec.ts --project=chromium --workers=1 --max-failures=3 --reporter=list,json
env KIVO_E2E_READ_ONLY=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-read-only-screens.json pnpm exec playwright test e2e/phase6.spec.ts --workers=1 --max-failures=4 --reporter=list,json
```

From the repository root: `backend/.venv/bin/python backend/manage.py check`, `backend/.venv/bin/python backend/manage.py spectacular --file /tmp/kivo-part6-openapi.yaml --validate`, `backend/.venv/bin/python backend/manage.py diagnose_database --samples 1` (then 3 and 2), and the exact 57-case backend unit selection above. Sandbox network/worker-port restrictions required scoped normal-user execution permissions; no blanket unrestricted prefix was introduced.

After resolving the blocker, rerun (these future commands are **NOT claimed passed**):

```sh
env -u KIVO_E2E_READ_ONLY KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-live-final.json pnpm exec playwright test e2e/part6-live.spec.ts --project=chromium --workers=1 --reporter=list,json
env -u KIVO_E2E_READ_ONLY KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-full-regression.json pnpm exec playwright test --workers=1 --reporter=list,json
```

The existing documented pool-enabled loopback Django runner must be running for those commands. Owned verification servers were stopped gracefully after this task; no deployment was performed.

## Security, performance and accessibility observations

- Django remains the sole identity/authorization/accounting authority. Same-origin session cookies, CSRF bootstrap, origin/method/query allowlists, host-only cookies, private/no-store and session-expiry handling are preserved.
- No configured private value was found in emitted browser JS. No direct browser Supabase access, localStorage authentication, sensitive logging, optimistic accounting or independent FIFO/balance/budget-consumption engine is introduced.
- CSV streams preserve actual Django bytes, attachment/metadata and nosniff. Incomplete 204/206, wrong content type and stream failures are rejected. Product code never rebuilds CSV rows. Backend formula escaping was inspected and its real Python unit cases passed; actual formula-containing downloadable rows remain unverified.
- Charts show server amounts/counts; all percentage/date/comparison authority stays in Django. Only graphical coordinates are rounded/clipped for tick/bar display. Accessible legends, labels, data tables, explicit chart limits and keyboard pagination are implemented. A 1,000-group isolated table stays at 20 data rows per page.
- Real desktop owned-data/report-chart rendering has six passing cases. Mobile/tablet overflow checks, full keyboard/browser checks, large actual financial datasets, production HTTPS/load behavior and final full regression remain **NOT VERIFIED**.
- Known API gaps: no budget audit-history retrieval/delete, no breakdown percentages/direct net cash flow/historical income series, no date-filtered fund report. These remain explicit unavailable states, not inferred values.
- Existing tab-journal limitation remains: closing the tab loses its local pending intent; no independent server idempotency-receipt lookup exists. Never treat a lost local journal as permission to repeat an ambiguous financial write.

## Original-repository inventory and final release-audit prerequisites

All changes are uncommitted in the original `INTIGRATION@611c9dc` workspace. Git status/diff/diff-check were reviewed. Backend source/business logic/schema, dependencies/lockfiles, Next configuration, global styles, root font/layout, README and STARTUP diffs are empty. The shared ServerMoney component is extracted without changing its existing funding export; all prior modules are preserved.

The following file inventory is generated from original-repository Git status. No implementation exists exclusively in /tmp.

<details><summary>All 67 created/modified files</summary>

```text
docs/audits/backend-api-frontend-coverage.md
docs/integration/integration-readiness.md
kivo-frontend/docs/audits/backend-api-frontend-coverage.md
kivo-frontend/docs/integration/integration-readiness.md
kivo-frontend/e2e/global-setup.ts
kivo-frontend/e2e/phase6.spec.ts
kivo-frontend/e2e/rent-live.ts
kivo-frontend/playwright.config.ts
kivo-frontend/src/app/budgets/page.tsx
kivo-frontend/src/app/reports/page.tsx
kivo-frontend/src/app/transactions/page.tsx
kivo-frontend/src/features/budgets/components/BudgetCard.tsx
kivo-frontend/src/features/budgets/components/BudgetList.tsx
kivo-frontend/src/features/budgets/components/BudgetModal.tsx
kivo-frontend/src/features/budgets/components/BudgetOverview.tsx
kivo-frontend/src/features/budgets/components/BudgetProgress.tsx
kivo-frontend/src/features/budgets/components/BudgetStatusBadge.tsx
kivo-frontend/src/features/budgets/schemas/budget.schema.ts
kivo-frontend/src/features/finance/queries.ts
kivo-frontend/src/features/finance/useFinancialWrite.tsx
kivo-frontend/src/features/finance/validation.ts
kivo-frontend/src/features/funding/components/LiveFunding.tsx
kivo-frontend/src/features/reports/components/AnalyticsSummaryCard.tsx
kivo-frontend/src/features/reports/components/CSVExportDialog.tsx
kivo-frontend/src/features/reports/components/CategoryBreakdownChart.tsx
kivo-frontend/src/features/reports/components/FinancialComparison.tsx
kivo-frontend/src/features/reports/components/IncomeExpenseChart.tsx
kivo-frontend/src/features/reports/components/ReportDetailPanel.tsx
kivo-frontend/src/features/reports/components/ReportFilterBar.tsx
kivo-frontend/src/features/reports/components/SpendingDistributionChart.tsx
kivo-frontend/src/features/reports/components/SpendingTrendChart.tsx
kivo-frontend/src/features/reports/schemas/export.schema.ts
kivo-frontend/src/features/transactions/history.ts
kivo-frontend/src/features/transactions/types.ts
kivo-frontend/src/lib/api/client.ts
kivo-frontend/src/lib/api/timeouts.ts
kivo-frontend/src/lib/server/api-bridge.ts
kivo-frontend/src/test/api/request-budgets.test.ts
kivo-frontend/src/test/api/server-auth.test.ts
kivo-frontend/src/test/features/budgets/BudgetProgress.test.tsx
kivo-frontend/src/test/features/budgets/BudgetStatusBadge.test.tsx
kivo-frontend/src/test/features/budgets/budget.schema.test.ts
kivo-frontend/src/test/features/finance/financial-write.test.tsx
kivo-frontend/src/test/features/finance/relationships.test.tsx
kivo-frontend/src/test/features/reports/AnalyticsSummaryCard.test.tsx
kivo-frontend/src/test/features/reports/FinancialComparison.test.tsx
kivo-frontend/src/test/features/reports/export.schema.test.ts
kivo-frontend/src/types/api.ts
docs/integration/part-06-budgets-reports-export-verification.md
kivo-frontend/e2e/part6-live.spec.ts
kivo-frontend/e2e/part6-live.ts
kivo-frontend/e2e/read-only-setup.ts
kivo-frontend/src/features/budgets/api.ts
kivo-frontend/src/features/budgets/components/LiveBudgets.tsx
kivo-frontend/src/features/budgets/queries.ts
kivo-frontend/src/features/reports/api.ts
kivo-frontend/src/features/reports/chart-format.ts
kivo-frontend/src/features/reports/components/FundReportPanel.tsx
kivo-frontend/src/features/reports/components/LiveReports.tsx
kivo-frontend/src/features/reports/download.ts
kivo-frontend/src/features/reports/filters.ts
kivo-frontend/src/features/reports/queries.ts
kivo-frontend/src/features/shared-financial/ServerMoney.tsx
kivo-frontend/src/test/features/reports/CSVExportDialog.test.tsx
kivo-frontend/src/test/features/reports/contracts.test.ts
kivo-frontend/src/test/features/reports/fixtures.ts
kivo-frontend/src/test/features/reports/presentation.test.tsx
```

</details>

Before a final release audit, restore reliable development availability; pass all three complete Part 6 real Django journeys, CSV/security/isolation assertions and full Parts 1–6 regression; resolve any resulting defects; then rerun type/lint/unit/build/security checks. Document unsupported API/product gaps and deploy-time HTTPS/streaming limits in that separately authorized audit. **Do not begin production-release hardening from this partially verified state.**

## Recovery addendum — 2026-10-25

### Current decision and workspace

**IMPLEMENTED / PARTIALLY COMPLETE. Complete live verification remains BLOCKED / NO-GO.** This recovery fixed a real CSV content-negotiation defect and substantially expanded real verification. It did not establish a durable fix for intermittent database transport latency. A passing later read-only run does not establish that the earlier financial/read deadline failures have been resolved.

All recovery edits exist directly in `/home/lucifer/Desktop/kivo`, branch `INTIGRATION`. The task initially encountered the previous 67-file Part 6 changes uncommitted at `611c9dc`. During investigation the owner committed those changes as `3d67e6f` (`feat: add budget management features including API, components, and queries`). That owner commit is preserved; the recovery did not create a commit, reset, stash, change branches or use a temporary implementation copy. The attempted initial patch/hash checkpoint occurred after the owner commit and was empty; it is not claimed as a backup. The original inventory above describes the earlier integration, not the current recovery diff.

Read the existing Parts 0–5 evidence, readiness/coverage documents, root/frontend instructions, current contracts and installed Next.js route-handler documentation. Regenerated OpenAPI validation exited 0: **68 paths / 84 operations**; no invented endpoint or schema change. Existing accounting services, serializers, permissions, session/CSRF policy, deadlines, dependencies, UI design, database configuration and schemas remain unchanged. Backend recovery edits add observability only.

### Availability investigation and evidence

The approved target remains the existing development PostgreSQL database named `postgres`. Real read-only checks confirmed development settings, the PostgreSQL engine, required TLS and an encrypted active connection. The configured address is a direct Supabase endpoint resolving to IPv6, port 5432; no locally configured verified session-pooler alternative was found. Credentials, host, role, database URL and financial rows were not printed. No staging database, migration, reset or cleanup deletion was performed.

The previous genuine Django 503s remain historical evidence. Their old logs exposed only `OperationalError`, so their ultimate provider/network cause cannot retrospectively be established. New diagnostics distinguish safe static driver categories, SQLSTATE, broken/closed flags and allowlisted pool counters without emitting driver messages, SQL or parameters. `KIVO_DB_DIAGNOSTICS=1` additionally reads TCP_INFO from a duplicated existing socket; it opens no database connection and closes only the duplicate descriptor. It is opt-in and changes no financial operation or retry behavior.

Observed results:

- A bounded **60-sample SELECT 1** probe ran at **159.689–263.407ms**, with no retransmissions during that probe and zero measured suspend delta. Initialization/TLS and server version were also checked; PostgreSQL was 17.11. This is a healthy interval, not a reliability fix.
- During later financial/report requests, slow SQL coincided with retransmission increments and rising RTT. At **16:59:54 UTC**, one query took **8,509ms**, retransmissions increased **7 → 8**, RTT increased **862,602 → 1,679,393µs**. The next query took **7,562ms**, retransmissions **8 → 9**, RTT **1,679,393 → 2,414,719µs**. The enclosing `GET /api/v1/reports/breakdown/` eventually returned Django **200 after 21,722ms**, with four queries / 20,145ms SQL. The bridge had already exceeded its unchanged **12s read deadline**, producing a real proxy 503 and visible report error.
- An earlier account-creation setup request returned Django **201 after 40,515ms**, 26 queries / 39,354ms SQL. Playwright's then-default 30s request deadline and the bridge's 30s write budget expired. This is an **ambiguous client outcome**, not rollback or permission to retry with a new key. Its identifiable record is retained. The test-session credential captured by the private failure artifact was invalidated through confirmed logout (204).
- A refreshed read-only `pg_stat_activity` observer sampled 129 times: **458 idle/ClientRead**, **53 idle-in-transaction/ClientRead** and **5 active/Lock/transactionid** observations; five observations had a blocking PID. Expected same-owner report locking exists and is not falsely ruled out. The observation query printed no SQL text. An earlier observer without `pg_stat_clear_snapshot()` had a cached empty view and is not used to claim absence of locks. No pool exhaustion or failed SQL was observed in the final instrumented server run.
- Across the two instrumented recovery server logs, **804 completed Django requests**, statuses **200:725, 201:69, 204:2, 400:1, 401:6, 406:1**, **zero Django 5xx**. This explicitly excludes proxy timeout responses and the prior genuine Django 503s; it is not a claim of zero end-to-end failures. Private log captures: `/tmp/kivo-part6-recovery-django.log` and `/tmp/kivo-part6-recovery-transport-server.log`.
- The existing bounded four-worker runner and min-1/max-4 development pool were reused. Every request releases its connection lease. Before shutdown two observed server connections were idle/ClientRead. The owned server stopped gracefully (exit 0), with pool closure; a subsequent real read-only query found **zero observed server backend PIDs still connected**. A session-scoped normal-user sleep inhibitor was used during controlled runs; it does not prove historical failures were caused by suspension and introduces no system setting change.

**Finding:** intermittent impairment on the direct database transport is evidenced by TCP retransmissions and multi-second query latency; proxy deadline expiration is reproduced. The faulty network hop/provider/local-link cause is **NOT VERIFIED**. Provider service termination is not proven, and pool starvation is not established. Changing accounting, raising limits/timeouts, weakening validation, blind POST retries or claiming a recovered SELECT solved the incident would be unjustified.

Required correction: supply a verified session-pooler connection setting for **the same existing development database**, or restore the current network route. Compare TLS/read-only latency and retransmissions first, then rerun bounded auth/read and financial gates. Only a file path and variable name are needed; never paste credentials into this report. No alternate address/region/credentials were guessed and no database target was changed. A verified alternative was requested; none was available during this run.

### Confirmed fixes

1. **CSV negotiation:** `GET reports/export/` is implemented by a DRF view with JSON renderer negotiation followed by a raw CSV streaming response. The bridge's exclusive upstream `Accept: text/csv` caused **406 before authentication/view execution**. The bridge now sends `Accept: application/json`; the downstream response still consists of actual Django CSV bytes and is validated as CSV. No CSV is generated in Next.js. The updated contract assertion and real browser downloads pass.
2. **Test request budget:** global setup now uses the existing approved `clientTimeoutMs` for account creation (35s, including the existing bridge budget). This fixes a 30s Playwright/30s proxy observation mismatch; it does **not** increase any product timeout, conceal the observed 40.5s failure, or retry the write.
3. **Test selectors/redirect metadata:** the transaction drill-down asserts the actual accessible `View details for …` link and UUID href. Replay verification follows the redirect to the original request and uses `allHeaders()` while preserving original key/body assertions. Same-browser A/logout/B report/export isolation coverage was added. These amended financial tails remain **NOT VERIFIED** because financial testing stopped after availability failed again; type/lint checks pass. No financial assertion was removed or weakened.

### Executed recovery checks

Private Playwright JSON and raw logs are retained under ignored `.playwright-auth` (directory mode 700, session file mode 600); traces stay disabled. Raw harness errors can contain authentication headers and must not be pasted into public logs. Test identities and small records remain identifiable and retained; no existing records were overwritten or deleted.

| Command / artifact | Observed result |
| --- | --- |
| `pnpm typecheck`; `pnpm lint` | Both **exit 0**, including the latest harness amendments. Current lint emitted no warnings; earlier warnings remain historical. |
| `pnpm test` | **393 passed, 60 files, 55.07s, exit 0** in the recovery full run. These are isolated frontend tests, not PostgreSQL integration evidence. |
| `node node_modules/next/dist/bin/next build` | Final **exit 0**, compile 1,251ms, TypeScript 4.0s, 23 prerender entries and actual dynamic routes. Existing scoped build permission; no root or blanket permissions. |
| `backend/.venv/bin/python backend/manage.py check` | **Exit 0**, zero issues. |
| `backend/.venv/bin/python backend/manage.py spectacular --file /tmp/kivo-part6-recovery-openapi.yaml --validate` | **Exit 0**, 68 paths / 84 operations. |
| `backend/.venv/bin/ruff check …`; `ruff format --check …` on the six recovery Python files | Both **exit 0**, six files formatted. |
| `backend/.venv/bin/python -m pytest tests/test_database_failure.py tests/test_database_diagnostics.py tests/test_development_pool.py tests/test_reporting.py tests/test_reporting_contract.py tests/test_rent_calendar.py -m unit` | **62 passed / 15 database cases outside the explicit unit selection, 0.37s, exit 0**. No database fixtures, schema creation or application-table flush. Not mislabeled as real financial integration tests. |
| Focused updated report contract Vitest selection | **37 passed, one file, 1.40s, exit 0** after the CSV header fix. |
| `part6-recovery-gate-readonly.json` | **2 passed / 1 failed**, 58.50s. Failure reproduced CSV 406. Preserved; subsequent real download cases pass after the fix. |
| `env KIVO_ALLOW_DEV_TEST_RECORDS=1 backend/.venv/bin/python kivo-frontend/e2e/recovery_gate.py` with the loopback production frontend running | Canonical-URL auth/read gate **exit 0**: 68 real requests, **200:63 / 201:1 / 401:3 / 204:1**, max 5,833ms, measured suspend delta 0. Register → unauthenticated me → login → ten repeated me/budget/summary/trend/breakdown/CSV cycles → logout → denied me/export. No financial writes or POST retries. First pre-canonicalization attempt failed on a 308 before registration and was not counted as passing. |
| `part6-recovery-financial-and-screens.json` | Setup failed on the real ambiguous account timeout above: **zero tests executed**, 48.65s. Not a passing run. |
| `part6-recovery-budget.json` | **1 passed / 0 failed / 0 skipped**, 239.34s overall, 177.88s test. Complete real UI receipt/budget/expense/correction/reversal flow below. |
| `part6-recovery-remaining.json` | **7 passed / 3 failed / 30 unexecuted**, 422.68s. Classification/CSV case failed late at the test-only drill-down selector; replay case failed at redirected request metadata; report-interval screen failed on the actual proxy deadline incident. Strict failure records retained. |
| `env KIVO_E2E_READ_ONLY=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part6-recovery-all-readonly.json pnpm exec playwright test e2e/phase6.spec.ts --workers=1 --reporter=list,json` | **38 passed / 0 failed / 0 skipped / 0 flaky**, 259.18s. All 19 desktop + 19 mobile Part 6 screen cases attempted, including previously unexecuted cases. This mode reuses existing real fixtures and blocks browser financial mutations; only the two explicitly labeled read-failure cases inject HTTP errors. |
| Final browser-bundle private-value scan | **49 emitted JS files / zero configured private-value or decoded DB-password matches**, exit 0. `.env` and session artifacts confirmed Git-ignored. This is a scoped scan, not a claim of a complete security audit. |

The financial selections used `env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/<artifact>.json pnpm exec playwright test … --project=chromium --workers=1 --reporter=list,json`. Budget selection: `e2e/part6-live.spec.ts --grep 'real budget create'`. Remaining selection: `e2e/part6-live.spec.ts e2e/phase6.spec.ts --grep-invert 'real budget create' --max-failures=3`. Raw stdout/stderr for subsequent runs was redirected to ignored private `.log` files; JSON summaries were inspected without copying request headers. No uncontrolled mutation retry, skipped critical assertion or invented passing case was used.

### Financial, report and CSV results

- **Budget/correction journey — VERIFIED:** create account via supported workflows; opening equity stays separate from income; actual Quick Add receipt **₹0.10**; overall/category limits **₹0.05/₹0.04**; ₹0.03 expense yields authoritative **60%/75%** warnings; second ₹0.03 produces exceeded limits; correction to ₹0.01 changes consumed amount to ₹0.04; reversal changes it to ₹0.03. Limit editing, archive/restore, overlap rejection (400), prior custom period, zero-limit/null-utilization and prior-period ₹0.01 expense all pass. Django dashboard ends at liquid **₹10.06**, current-period personal expense **₹0.03**, eligible income **₹0.10**. In-app report/budget refreshes observed after writes, without client accounting.
- **Shared/rent classification — PARTIALLY COMPLETE:** actual receipts, transfer, lending/borrowing, partial/full loan repayment, owner/friend-paid custom shared bills, settlements, rent plan/obligation/reserve/friend payment and partial/full reserve-linked repayment all executed before the harness selector failure. Assertions passed for personal expense **₹0.37**, external income **₹0.50**, borrowing **₹0.09**, lending **₹0.07**, repayments received **₹0.15**, internal transfers **₹0.05**, shared advances **₹0.08**, rent-spending-capacity liquid/safe **₹20.13**, reserves **₹0.00**, plus category/account/merchant/payment/contact/type breakdowns. This is real evidence, but the overall case failed and is not counted as a completed Journey D/E/F.
- **Live CSV — VERIFIED for executed scope:** browser download received actual Django bytes; selected inclusive date, account, category, kind, merchant, payment and search filters propagated; one authorized matching transaction row; UTF-8 BOM; INR `0.10`; `net_expense_inr=0.10`, `net_external_cash_inr=-0.10`; fixed filename `kivo-transactions.csv`; CSV content type, no-store, nosniff and Asia/Kolkata metadata. Formula-prefixed title/merchant/payment/notes were actually escaped in the downloaded file; Unicode and quoted/newline content exercised. Full read-only desktop/mobile suites additionally passed actual populated/empty downloads and duplicate-click protection. Anonymous export denied 401 in the native gate. **Cross-user export and whole-file cross-module aggregate comparison are NOT VERIFIED in this recovery**: those assertions follow the failing financial tails.
- **Report screens — VERIFIED for executed scope:** all 38 real fixture-backed desktop/mobile cases pass, covering exact trend/breakdown parameters, explicit apply/clear and refresh persistence, invalid URL filters, inclusive empty historical range, real retry after labeled injected read failure, pinned fund snapshot/lineage, chart/table accessibility and 375/768/1440px overflow checks. This is not the entire Parts 1–6 suite and does not certify unexecuted financial tails, large live datasets or every keyboard interaction.
- **Security/cache — PARTIALLY COMPLETE:** native real auth/current-user/logout/anonymous-export checks pass; no session secrets in browser bundles; Django CSRF/origin/owner scoping and idempotency code remain. Budget confirmed writes refresh budgets/reports/dashboard. Response-loss recovery reached a real replay **200 with the same budget UUID** before the test-metadata failure. The corrected original-header assertion, conflict/validation/calendar/pagination tails and new same-browser A/B cache-isolation journey have **NOT VERIFIED** status. Mocked tests are not substituted for them.

### Outstanding mandatory gates

| Requested journey/gate | Current recovery status |
| --- | --- |
| A: full browser registration/login/refresh/protected route/logout | Native auth equivalent passes; complete Part 1 browser regression **NOT VERIFIED in this run**. |
| B: account/receipt/budget/expense/utilization | **VERIFIED**, full passing browser case. |
| C: expense correction/reversal and budget/report refresh | **VERIFIED**, same complete passing case. |
| D: shared-finance full journey | Real classification assertions passed; overall case **PARTIALLY COMPLETE**. |
| E: rent/obligation/payment/reserve/safe-to-spend | Real supported workflow assertions passed within failed classification case; complete regression **PARTIALLY COMPLETE**. |
| F: filtered CSV complete financial journey | Actual filtered download/content passes; final drill-down/whole-file totals tail **NOT VERIFIED** after harness change. |
| G: same-browser A/B isolation and unauthorized foreign export | New coverage implemented; **NOT VERIFIED** because availability gate failed again. |
| Full Playwright Parts 1–6 regression and amended financial tails | **BLOCKED**, not executed after renewed critical availability failure. Historical Parts 1–5 passes remain historical. |
| Durable database route/503 recovery | **BLOCKED**; no verified alternate route/configuration available. |

Further financial mutations stopped after the recurring proxy availability failure, as required by Gate A. The later read-only passes are retained progress, not a bypass of that gate. The complete application-database pytest suite was not run: its database fixtures create/flush a test database and were not authorized to run against application tables. Use supported HTTP E2E records here; provision isolated pytest test-database privileges separately if desired, without destructive application-table cleanup.

### Recovery file inventory and handoff

Current recovery changes, separate from the owner's preserved Part 6 commit:

```text
backend/common/database_failure.py
backend/common/database_timing.py
backend/common/exceptions.py
backend/common/observability.py
tests/test_database_failure.py
kivo-frontend/e2e/recovery_gate.py
kivo-frontend/e2e/global-setup.ts
kivo-frontend/e2e/part6-live.spec.ts
kivo-frontend/src/lib/server/api-bridge.ts
kivo-frontend/src/test/features/reports/contracts.test.ts
docs/integration/part-06-budgets-reports-export-verification.md
docs/integration/integration-readiness.md
docs/audits/backend-api-frontend-coverage.md
kivo-frontend/docs/integration/integration-readiness.md
kivo-frontend/docs/audits/backend-api-frontend-coverage.md
```

Git status/diff are reviewed in the original workspace; no implementation remains exclusively in `/tmp`. Temporary observer scripts/logs are test artifacts. No accounting/model/migration/configuration/dependency/style/font change, automatic commit, deployment or production-hardening work occurred.

After the same development target has a stable verified route, run the native 68-request gate, all three amended `part6-live.spec.ts` cases and the complete Playwright suite with raw logs private, then rerun type/lint/unit/build checks and record actual outcomes. Reconcile retained ambiguous intents through original keys and supported reads; never infer rollback or create new-key duplicates. **Part 6 must not be marked VERIFIED before those gates pass.**

## 2026-10-26 — workspace correction and connectivity follow-up

### Workspace gate — VERIFIED

Before changes, `pwd -P` and `git rev-parse --show-toplevel` both returned `/home/lucifer/Desktop/kivo`; branch `INTIGRATION`; `git status --short --untracked-files=all` was clean. The owner's checkpoint is now `975d504` (`feat: implement recovery updates and enhancements for Part 6 integration`). It is preserved. No branch replacement, worktree, project copy, reset, stash or automatic commit was used.

The two reusable probes had incorrectly been created outside the repository. Recovery work was paused and the owned Django server stopped before correcting this. Both sources were reviewed for embedded secrets and preserved as actual files in the original workspace:

| Earlier external copy, no longer used | Canonical source |
| --- | --- |
| `/tmp/kivo-p6-http-read-probe.py` | `scripts/diagnostics/probe_authenticated_reads.py` |
| `/tmp/kivo-p6-connectivity-probe.py` | `scripts/diagnostics/probe_database_connectivity.py` |

Both resolve the repository from `Path(__file__).resolve().parents[2]`; neither imports or executes the temporary copy. Existing temporary duplicates were left unused; **no required source exists exclusively under `/tmp`**. Future reusable diagnostics must be created under `scripts/diagnostics/`. The new root AGENTS **Workspace Integrity** section records the authorized physical path, pre-edit Git checks, repository-only source/configuration/report rules, temporary-runtime exception, tracked/untracked inventory and financial/schema safeguards. A byte-prefix check against `git show HEAD:AGENTS.md` confirmed that all prior instructions were preserved, including the historical capitalized-path text; the new section specifies the actual authorized path.

The probes now have bounded sample/cycle arguments, typed entry points and unique private artifact names, so reruns do not overwrite earlier evidence. The HTTP probe only performs GETs with an existing test session, refuses an external redirect, records sanitized status/timing metadata and verifies anonymous export denial. It has no registration, login or financial-write fallback. The database probe uses read-only sessions, a probe-local 5s statement limit and 1s lock limit; it changes no application/server setting. Pool/socket cleanup runs in `finally`. The same-origin redirect boundary was exercised without an outbound request and rejected a foreign origin. No configured database URI or Django secret matched either source.

`ruff check` and `ruff format --check scripts/diagnostics` passed. Both `--help` commands ran from their repository paths. Actual repository-path executions also passed:

```sh
backend/.venv/bin/python scripts/diagnostics/probe_database_connectivity.py --samples 3
backend/.venv/bin/python scripts/diagnostics/probe_authenticated_reads.py --cycles 4
```

These commands ran with the existing normal-user sleep inhibitor and scoped network permission where required. The HTTP command used the existing bounded Django runner and local production frontend. It completed **25 requests: 24 HTTP 200 / one expected anonymous-export HTTP 401**, **44.218s**, maximum full-response time **2,674.694ms**, suspend delta 0, exit 0. It consumed actual report/CSV bodies, not only headers. The three-sample database command verified the development `postgres` target and TLS/read-only state: query **169.072–174.111ms**, initialization **1,428.442ms**, no retransmissions in that short interval, three additional fresh initializations **1,594.384 / 1,433.124 / 1,639.105ms**, **11.121s**, exit 0. Artifacts have unique `connectivity-<UTC timestamp>-<nanoseconds>-*.json` names under ignored `kivo-frontend/.playwright-auth`, mode 600 inside the existing mode-700 directory.

### Connection mode, network and resource evidence

The current environment is the local Linux development runtime, Python 3.14.4 / Django 6.1.2. No application listener was present initially on ports 8000/3001. The inspected production Gunicorn file describes two synchronous workers and a 60s worker deadline; it was not started or modified. No external deployment/provider access is available and no production-hardening action was taken.

Only `SUPABASE_DB_URL` is configured among local connection variables. It is the existing **Direct** endpoint, port **5432**, resolving to **AF_INET6 only**. A real direct connection confirmed PostgreSQL **17.11**, TLS enabled, `sslmode=require`, database `postgres`, `max_connections=60` and the existing application-session statement timeout **2min**. The initial sandbox DNS failure was retried with scoped network permission and succeeded; that sandbox failure is not classified as a Supabase outage. An independent bounded TCP connection to the official Supabase documentation host succeeded over IPv4/443 in **63.048ms**; this proves runtime IPv4 TCP reachability to that host, **not reachability or performance of this project's unprovided pooler on 5432**.

Default Django settings remain `CONN_MAX_AGE=600`, `CONN_HEALTH_CHECKS=True`, local pool off. The documented verification runner explicitly enables `KIVO_DEV_DB_POOL=1`: `CONN_MAX_AGE=0`, health checks on, min 1/max 4 connections, max 4 waiters, acquisition bound 5s, lifetime 600s and idle 60s, matching its four HTTP workers. Existing libpq settings remain connect timeout 10s, keepalive enabled/idle 5s/interval 5s/count 3 and TCP user timeout 10,000ms. Installed Django code supplies `prepare_threshold=None` by default and rejects local pooling with nonzero persistent connection age. None of these settings was changed.

Before the workspace interruption, the two serial read-only intervals below ran against the **same direct IPv6 endpoint**. Their source is now preserved in the canonical repository probe; the table does not misrepresent those earlier runs as repository-path execution. Each interval had one requesting client, read-only sessions and no financial writes. A local psycopg pool is **not** Supabase Session Pooler.

| Measurement | Direct persistent connection | Direct route + existing local psycopg pool |
| --- | --- | --- |
| Samples / errors | 60 / 0 | 60 / 0 |
| Duration / measured suspend delta | 81.513s / 0 | 88.842s / 0 |
| Initial connection initialization | 1,536.398ms | 1,603.407ms |
| Query min / median / p95 / max | 165.360 / 199.331 / 276.888 / 932.141ms | 159.916 / 204.193 / 280.161 / 307.284ms |
| Per-sample ensure/lease min / median / p95 / max | 0.038 / 0.060 / 0.084 / 0.094ms | 169.057 / 228.592 / 265.812 / 838.660ms |
| Observed physical connections / retransmission increment | 1 / 3 | 2 / 2 |
| Server execution / planning for `EXPLAIN ANALYZE SELECT 1` | 0.021 / 0.024ms | 0.021 / 0.019ms |
| Observed sessions / blocked sessions | 8 / 0 | 9 / 0 |

The persistent interval's additional three fresh initializations were **1,318.892 / 1,357.303 / 1,444.602ms**. The local-pool interval ended at pool size/available **1/1**, zero waiters, 61 leases, one startup queue observation / 1,419ms recorded wait and two physical connections created; no acquisition error was observed. The pool's per-lease health checks add an observable round trip but avoid repeated full connection setup across request threads. The persistent CLI loop does not emulate HTTP request-start health-check resetting, so its near-zero `ensure_connection()` cost must not be compared as an HTTP health-check cost. This serial measurement is not a randomized reliability comparison and does not establish that the pool caused the lower maximum query time.

**Finding:** retransmissions still occurred on the direct route, although neither current 60-sample interval failed or exceeded one second per SELECT. The constant statement's server execution time was tiny relative to client elapsed time, separating that probe's network/client overhead from SQL execution. This does not prove that all historical application queries were cheap. Current snapshots do not show pool/connection exhaustion or lock contention, but do not exclude historical peaks. The prior 21.722s report/proxy deadline failure and genuine Django 503s remain retained evidence; the responsible network hop/provider/local-link cause is still **NOT VERIFIED**. The historical temporary raw server logs are no longer present in the current runtime; their earlier recorded evidence is preserved above and is not claimed to have been re-read today.

### Session Pooler comparison and rollback

**Direct-versus-Supabase-Session-Pooler comparison: BLOCKED.** No Dashboard Session Pooler URI is stored in the inspected local configuration, no Supabase CLI/link configuration was found, and no connected Supabase management/browser tool supplies it. The private file path and variable name were requested; no actual Dashboard pooler parameters have been provided. Never compose a pooler hostname from a guessed region or substitute credentials. [Supabase's connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres) requires the project's Connect parameters and distinguishes Session from Transaction pooling. No Transaction Pooler trial or switch occurred.

**Configuration change: NONE.** The active development URI, environment files, Django database parser/settings, TLS, pool sizes, application deadlines and business/accounting services remain untouched. There is therefore no endpoint change to roll back. The original direct URI remains in the owner's Git-ignored mode-600 `.env`. Probe-only session settings end when each probe connection closes; the runner's opt-in flags end with its process.

If official Session Pooler parameters become available, preserve the original URI privately before any edit, verify they identify this same approved development project/database, trial them in a separate short-lived backend process and compare matched read-only intervals and HTTP gates. Persist a change only if the evidence supports it. Rollback would restore the preserved private `SUPABASE_DB_URL` and restart only the owned backend process to close old leases; it must never reset data, reverse journals or change schemas. Do not expose either URI in shell arguments, logs, documentation or commits.

### Fresh regression before the controlled financial rerun

- `pnpm typecheck`, `pnpm lint`, `pnpm test`: **exit 0**; **393 tests / 60 files**, 52.02s. These are isolated frontend checks.
- `backend/.venv/bin/python backend/manage.py check`: **exit 0**, zero issues.
- Existing six-file backend unit selection shown above: **62 passed / 15 database cases outside the unit selection**, 0.22s, exit 0. No schema/database fixture setup was executed.
- Production build: **exit 0**, compile 1,529ms, TypeScript 3.9s, 23 prerender entries and actual dynamic routes. No dependency/permission/configuration workaround was introduced.
- `connectivity-2026-10-26-screens.json`: **38 passed / 0 failed / 0 skipped / 0 flaky**, **275.37s**, exit 0. All desktop/mobile Part 6 read-only cases ran against actual Django fixtures; the two deliberately injected read-error cases remain labeled as such.
- Complete Playwright collection now contains **189 cases in 14 files**. Collection is not execution or a passing regression claim. Controlled financial and subsequent full-regression outcomes are recorded separately below.

After the repository-path read gates passed within existing deadlines, controlled financial verification resumed with isolated identifiable users and small amounts, original keys, no automatic POST retries and `--max-failures=1`. A current passing read interval is not presented as a durable infrastructure fix. Any renewed critical availability failure requires stopping the affected financial run.

### Controlled Part 6 financial rerun — VERIFIED for executed scope

The unchanged three-case live specification completed **3 passed / 0 failed / 0 skipped / 0 flaky**, **757.80s overall, exit 0**. Private evidence: `connectivity-2026-10-26-financial.json` and its private raw `.log`. Command from `kivo-frontend`:

```sh
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/connectivity-2026-10-26-financial.json pnpm exec playwright test e2e/part6-live.spec.ts --project=chromium --workers=1 --max-failures=1 --reporter=list,json
```

Raw stdout/stderr was redirected to the ignored private log. No assertion, financial service, test retry setting or application deadline was weakened. The earlier drill-down/header test fixes in the owner's preserved commit now have real passing evidence, as does the added same-browser isolation tail.

| Complete real Django-backed case | Test duration | Verified results |
| --- | --- | --- |
| Budget creation/edit/archive, expense utilization, audited corrections and cross-module refresh | 201.920s | Actual receipt, overall/category/custom/zero budgets, warning/exceeded/at-limit states, conflict rejection, immutable correction/reversal, authoritative dashboard/report/budget refresh. Final liquid ₹10.06, current expense ₹0.03, eligible income ₹0.10. |
| Reports preserve loan/shared/rent classifications and filtered UTF-8 CSV accuracy | 266.175s | Real receipts, owned transfer, lending/borrowing, partial/full repayments, owner/friend-paid custom shared bills, settlements, rent generation/reserve/friend payment and repayments. Expense ₹0.37, eligible income ₹0.50, safe-to-spend/liquid ₹20.13, reserve ₹0.00; six breakdown dimensions; actual filtered browser CSV with BOM, metadata, Unicode, quoted newlines and formula escaping; correct transaction drill-down; full-file net contributions match the server summary; real header-only historical empty download. |
| Calendars, replay recovery, strict validation, pagination and export ownership | 233.376s | Committed response loss survives refresh; explicit original-key/body replay returns 200 with same UUID and one budget; changed-body replay 409; invalid budget/report inputs 400; missing CSRF 403; all seven presets match Asia/Kolkata server bounds; inclusive custom comparison/peak/average; 22 owned budgets across two API pages; foreign budget GET/PATCH 404; foreign account export/summary expose no rows/expense; anonymous report/export 401; same browser A → confirmed logout → B → empty owned budgets/reports/CSV → confirmed logout and denied export. |

These are completed journeys, not isolated mocked responses. The deliberate response-loss interception forwards the original request to Django and confirms its real 201 before aborting the client delivery; it does not fabricate a posting or hide a genuine 503. The test-only CSV reader/contribution assertions do not introduce product-side accounting or CSV generation. Source cache/idempotency/session/CSRF implementations remain unchanged.

The current 189-case regression was then launched with one worker, no retries and a stop at the first failure:

```sh
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/connectivity-2026-10-26-full-regression.json pnpm exec playwright test --workers=1 --retries=0 --max-failures=1 --reporter=list,json
```

**Full regression: BLOCKED / NOT VERIFIED.** The command was stopped at the renewed availability failure below, **exit 130**, **1,178.03s overall**. Actual results: **6 passed, 1 interrupted, 182 not run** out of 189. The JSON reporter groups the interrupted/unexecuted cases under `skipped:183`; that is not a passing full run or intentional omission of a failing assertion. The six completed cases were fresh browser authentication/onboarding/session/logout/isolation (48.897s), core transactions/recovery/immutable corrections/isolation (307.015s), dashboard/pinned FIFO/exhaustion/corrections/isolation (153.592s), friend-paid custom bill and settlements (72.501s), shared-bill correction/reversal (81.774s), and settlement correction/reversal/idempotency/isolation (117.228s). The long Part 4 financial journey was interrupted; later cases, including the full Part 5 regression, did not run in this command. Their earlier historical passes and the separate current Part 6 rent-classification pass are not substituted for this missing regression.

### Renewed failure, final HTTP evidence and safety stop

At **2026-10-26 12:43:00.391755 UTC**, browser-originated `POST /api/v1/shared-bills/` completed in Django with **201 after 31,014ms**, **38 queries**, **30,531ms SQL elapsed**, maximum query **4,041ms**. Correlation ID: `1764bc81-9f4c-4d9a-b053-9d95aad2ab35`. The backend audit logged its commit at 12:42:59.378670 UTC. Application/middleware time outside measured SQL was approximately 483ms; the observation does not identify how much SQL elapsed time was PostgreSQL execution versus transport or lock waits.

The actual browser bridge deadline remains **30s for that financial POST**. The retained test log records **`Explicit UI recovery after actual HTTP 503; original key/body, confirmed 200.`** The existing test helper validates the original key/body and deliberately drives GET reconciliation followed by the original-key replay. That recovery does not make the original 503 a successful reliable request or justify a new-key write. The record and audit history are retained; no cleanup deletion, compensating transaction or independent balance edit was performed.

Within that same request/PID, TCP retransmissions increased **14 → 21** across the recorded slow-query sequence. At the 4,041ms query, retransmissions increased **20 → 21**, RTT **1,470,259 → 1,791,601µs**. Several sequential queries took 1.2–2.5s while RTT rose from about 0.21s to 1.88s. This reproduces significant direct-route transport degradation correlated with an application deadline failure. **The faulty hop/provider/local-link cause remains NOT VERIFIED; no permanent connectivity fix is claimed.** No SQL exception, pool-acquisition error or failed health check was observed in these current server logs. This does not prove absence of historical acquisition failures, peak locks or CPU pressure.

The runtime's connected interface is Wi-Fi. Bounded NetworkManager journal queries around both the 11:38–11:43 probes and the **12:41–12:44 UTC** timeout window returned no retained events. That is missing corroborating local network evidence, not proof that Wi-Fi or the upstream network is healthy. No wireless settings, network restrictions, routes, credentials or timeouts were changed.

The financial run was interrupted on observing the renewed deadline violation. Further financial tests and mutating smoke requests stopped; no rerun was attempted after a subsequent healthy SELECT. The server held the normal-user idle/sleep inhibitor, but a BOOTTIME-minus-MONOTONIC baseline was not recorded across the entire full-suite interval; only the shorter probes' zero suspend deltas are verified. Shutdown waited for the owned Django runner to release its workers/pool and exited **0**. The Playwright-owned frontend also stopped; an actual port inspection showed no listeners on 8000/3001. A final real repository-path diagnostic then checked cleanup:

```sh
backend/.venv/bin/python scripts/diagnostics/probe_database_connectivity.py --samples 1 --observed-log kivo-frontend/.playwright-auth/connectivity-2026-10-26-django-resumed.log
```

It exited **0**, observed **22 recorded server backend PIDs / zero still connected**, verified read-only/TLS state, zero blocked sessions out of six current database sessions, a **204.515ms** SELECT and no retransmission in that short check. Duration **8.968s**, suspend delta 0. This verifies connection release, not incident resolution. Its unique private artifact is `connectivity-20261026T124825Z-1793018905902276172-direct.json`.

Final HTTP totals from the two stopped server captures:

| Capture | Completed Django requests | Status distribution |
| --- | --- | --- |
| `connectivity-2026-10-26-django.log` | 297 | 200:296, 401:1 |
| `connectivity-2026-10-26-django-resumed.log` | 1,228 | 200:987, 201:167, 204:4, 400:17, 401:22, 403:4, 404:20, 409:6, 429:1 |
| **Combined** | **1,525** | **Zero Django 5xx; at least one separately confirmed real proxy 503.** |

| Method | Count | Median / p95 / maximum preparation time |
| --- | --- | --- |
| GET | 1,297 | 1,118 / 4,292 / 9,882ms |
| POST | 212 | 3,297 / 11,455 / 31,014ms |
| PATCH | 16 | 2,217 / 7,418 / 7,418ms |

These are server preparation measurements; streaming CSV iteration occurs after middleware timing. They are not whole-download percentiles. The repository HTTP probe separately consumed full response bodies and the browser CSV cases verified actual downloaded contents. The explicitly injected screen-error cases are test stimuli, not additional real Django outages. The one auth throttle rejection is retained as 429, not classified as a database or 5xx failure.

Final scoped privacy scan: **49 emitted browser JS files / zero configured private-value or decoded database-password matches**, exit 0. Private artifacts remain ignored; both diagnostic source files contain no embedded credentials. Root instructions and all source/test changes exist in the original Git workspace. No backend accounting, model, serializer, permission, schema, migration, dependency, application configuration or UI source was modified by this follow-up.

### Final follow-up status and required correction

- **Workspace Integrity: VERIFIED.** The root guardrail and both canonical diagnostics are preserved and executable in the original repository. Historical external copies are unused and not the only source.
- **Part 6 implemented functionality: VERIFIED for the three complete current live cases and 38 screen cases.** Budget/report/correction/classification/CSV/replay/security/isolation assertions now have real passing evidence.
- **Complete Part 6 recovery: PARTIALLY COMPLETE / BLOCKED — NO-GO.** The full cross-module regression did not complete; the direct connection again exceeded the financial proxy deadline. The physical/network/provider cause and requested Direct-versus-Session-Pooler comparison remain unverified.

Required next input: save this same development project's official **Dashboard → Connect → Session pooler** URI in a Git-ignored private setting and provide only its file path and variable name. Do not paste credentials. With those verified parameters, compare matched low-concurrency read-only runs from this backend, preserve the direct URI for rollback, and choose a change only if it demonstrably improves reliability. Alternatively, repair the current route with verifiable operator/provider evidence. Then rerun auth/read gates, the interrupted financial journey and the full unchanged suite. No new staging database, guessed hostname, timeout inflation, accounting rewrite or blind retry is a substitute.

Final original-workspace inventory from `git status --short --untracked-files=all`: **six modified tracked files and two new diagnostic sources**. Generated/private test artifacts are not implementation files.

```text
 M AGENTS.md
 M docs/audits/backend-api-frontend-coverage.md
 M docs/integration/integration-readiness.md
 M docs/integration/part-06-budgets-reports-export-verification.md
 M kivo-frontend/docs/audits/backend-api-frontend-coverage.md
 M kivo-frontend/docs/integration/integration-readiness.md
?? scripts/diagnostics/probe_authenticated_reads.py
?? scripts/diagnostics/probe_database_connectivity.py
```

Final Git diff/whitespace review and Ruff check/format-check passed. All eight resolved paths are inside the original Git root. The only project code introduced in this follow-up is the two canonical diagnostic sources; no required implementation is left exclusively under `/tmp`. The four readiness/coverage copies now link to the current evidence and preserve historical findings. No files were staged, reset or automatically committed. **Part 6 is not declared VERIFIED and production-release hardening has not begun.**
