# Part 6 — budgets, reports and CSV export

Date: 2026-10-25. Final status: **IMPLEMENTED / PARTIALLY COMPLETE. Full live verification BLOCKED — NO-GO.** No production release audit has begun. This report is updated from actual command/test evidence; passing isolated tests are not treated as real Django verification.

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
