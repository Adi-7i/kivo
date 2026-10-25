# Part 5 — monthly rent, payments, reserves and spending capacity

## Final development verification — 2026-10-25 — VERIFIED

**VERIFIED for the approved development scope.** Part 4's complete uninterrupted real journey passed before Part 5 implementation and passed again in regression. All four complete Part 5 Django/PostgreSQL journeys now have passing evidence, including the exact friend-paid rent policy, owner-paid shared partial/full rent with response-loss recovery, audited corrections/reversals/security, and calendar/duplicate-generation behavior. All **180 unique browser cases** have passing evidence across the full run and focused rechecks; the full run itself had five retained failures, not a fictitious single-run green result. See the detailed execution table below and the [Part 4 recovery report](part-04-people-sharing-verification.md).

Original workspace is `/home/lucifer/Desktop/kivo`, frontend `kivo-frontend`, branch `INTIGRATION`, baseline `b67f020`. Existing Parts 1–4 changes and the owner's README/STARTUP work are preserved. No repository copies, worktrees, schema operations, destructive cleanup, financial SQL writes, dependency upgrades or backend accounting changes are used. The approved development Supabase PostgreSQL `postgres` is retained. Identifiable `p5-*`/`kivo-integration-*` records are created only through supported Django workflows and retained.

## Actual contracts

All routes below begin `/api/v1/`. Contracts were inspected in actual sharing URLs, views, serializers, selectors, calendar and rent services, generated TypeScript, backend tests and freshly validated OpenAPI. The installed schema has 68 paths / 84 operations. Existing generated rent types already describe these contracts; no speculative generation or response types are introduced.

| Route | Supported methods / behavior |
| --- | --- |
| `rent/plans/`, `rent/plans/{uuid}/` | GET list/detail; POST create; PATCH **only `active`**. Terms and participant shares are immutable after creation. No DELETE or unsupported term edit. |
| `rent/plans/{uuid}/generate/` | POST `{through: YYYY-MM-DD}`. Includes actual due dates on/after plan start and on/before cutoff. At most 120 new months. Returns the plan DTO/UUID, not an invented batch. |
| `rent/plans/{uuid}/obligations/` | GET owned paginated obligations for one plan. |
| `rent/obligations/`, `rent/obligations/{uuid}/` | GET list/detail. Server supplies gross amount, paid, outstanding landlord amount, independent friend payable, status and overdue flag. |
| `rent/obligations/{uuid}/payments/` | GET paginated history, POST payment. Exactly one of owner `account` or friend `payer`; the unused field is omitted, not sent as null. |
| `rent/obligations/{uuid}/change-status/`, `/history/` | POST `{action: skip|reopen, reason}`; GET immutable status audit. |
| `rent/payments/`, `rent/payments/{uuid}/` | GET only. Root POST is not supported. Payment wrapper UUID differs from its nested event UUID. |
| `rent/payments/{uuid}/correct/`, `/reverse/` | POST full payment plus reason for correction, or reason only for reversal. Correction preserves original payer kind and appends audited history. |
| `rent/reserves/`, `rent/reserves/{uuid}/` | GET list/detail, POST create `{obligation,label,amount,reason}`. |
| `rent/reserves/{uuid}/adjust/`, `/history/` | POST `{amount,reason}`, amount is the target, zero releases unassigned capacity; GET signed, active/deactivated audit changes linked to payments, claims and settlements. |
| `rent/spending-capacity/` | GET independent server `liquid_balance`, `active_reserves`, `safe_to_spend`. No client subtraction. |
| Existing `contacts/`, `claims/`, `shared-bills/`, `settlements/` and owned account/category/reporting reads | Reused for actual participants, linked shares, outstanding debt, partial/full rent repayments and regression oracles. |

Plan creation sends title/payee/start_date/due_day/amount/category/split_method/participants. `due_day: null` means last day; fixed 29–31 clamps in Django. Owner is included exactly once. Equal splits omit share amounts; custom decimal inputs are checked exactly for conservation, then Django assigns recognized amounts. Read DTOs do not expose split_method, so it is not inferred. Mutations use original Idempotency-Key; 201 is first success, 200 is replay, conflicting identity returns 409. Lists expose page only; client filters apply to all downloaded owned rows, with no invented server search/status filters.

## Authentication, mutation safety and cache consistency

Existing Django session authority, same-origin Fetch bridge, CSRF bootstrap/current token, strict origin and method/query allowlists, host-only cookies and private/no-store responses remain. No direct browser Supabase access, localStorage authentication, fake API success, optimistic balances or uncontrolled POST retries are introduced.

Each intent is persisted in a user-scoped tab journal before sending. Duplicate clicks are locked and each open modal permits one confirmed write. Ambiguous network failures keep the original key/body locked across refresh. A safe owned-resource GET precedes deliberate replay; matching metadata is never treated as confirmation. Details retain pending-payment recovery even after Django marked the obligation paid. UUID confirmation is required before success. Financial timeout budgets are 30s upstream / 35s browser, reads/auth remain 12s/15s; these are bounded, not automatic retries. See Part 4's measured latency evidence and opt-in pool configuration.

Confirmed mutations, including existing Part 4 claim repayments, invalidate accounts, transactions, funds/funding, dashboard, summary/report/budget consumers, contacts, claims, loans, settlements, shared-bills, rent plans, obligations, payments, reserves and spending capacity. Query keys remain user-scoped; logout clears private queries and journals. UI errors do not turn a confirmed posting into an unconfirmed retry. Unused future budget/export write routes remain unexposed.

## Financial policy and real development verification

The following complete approved scenario **VERIFIED** against actual Django HTTP/PostgreSQL and browser UI (`part5-friend-recheck-20261025.json`, 1 passed, 2.8m overall, 2.1m test):

| Confirmed state | Cash | Active reserve | Safe-to-spend | Friend payable | Personal rent expense |
| --- | ---: | ---: | ---: | ---: | ---: |
| Opening equity / generated obligation | ₹3,000 | ₹0 | ₹3,000 | ₹0 | ₹0 |
| Reserve created | ₹3,000 | ₹2,000 | ₹1,000 | ₹0 | ₹0 |
| Friend pays landlord | ₹3,000 | ₹2,000 | ₹1,000 | ₹2,000 | ₹2,000 |
| Repay ₹800 | ₹2,200 | ₹1,200 | ₹1,000 | ₹1,200 | ₹2,000 |
| Repay remaining ₹1,200 | ₹1,000 | ₹0 | ₹1,000 | ₹0 | ₹2,000 |

Every row was compared with independent Django account, spending-capacity and dashboard responses, then the rendered rent figures. External income remained zero. Obligation became landlord-paid while friend payable remained separate. Protected release to zero returned actual 409. Claim became settled, reserve history contained active -800/-1200 changes, funding batch remaining capacity was 1000, and browser refresh restored the same values. No 5xx was observed in this passing journey. These are observed test expectations, not React accounting calculations.

An initial attempt failed because the fixture selected today before a last-day rent due date; Django correctly generated zero obligations. The cutoff fixture and misleading help text were corrected to the verified inclusive due-date behavior; the assertion was retained and the complete scenario rerun successfully.

The remaining-case run completed **2 passed / 1 failed, 7.5m overall, exit 1** (`part5-remaining-20261025.json`). Corrections/reversals for both owner/friend payer kinds, reserve adjustment/release, skip/reopen audit, active-only PATCH, immutable-field rejection, invalid amounts/payer combinations, overpayment conflict, CSRF 403, anonymous 401 and foreign resource/action 404 all passed (3.8m). Calendar generation passed (1.1m): 14 obligations, February 28/29, due-day-31 clamping, last-day null, exact custom shares, repeated generation without duplicates and invalid calendar input rejection.

The initial shared owner-paid case confirmed partial/full cash/expense/share effects, a deliberately lost committed response, refresh, exact original-key/body 200 replay/same payment UUID, changed-body 409 and exactly two payments. It then failed at its first receivable recovery because the helper's `.last()` dialog locator resolved to the parent after the child closed, matching two legitimate repayment buttons. The helper now captures the submitted dialog's exact accessible title and asserts that dialog closes. The **entire journey subsequently passed (2.4m)**, including all partial/full receivable recoveries, final cash/safe-to-spend 9.94, expense 0.06, no outstanding debt and zero external income. No financial or security assertion was removed. Parts 1–4 also passed their complete live regression cases.

## Checks executed so far

| Command | Actual result |
| --- | --- |
| `pnpm typecheck` | Exit 0. |
| `pnpm lint` | Exit 0, one retained BudgetModal RHF compiler warning, zero errors. |
| `pnpm test` | Final run: **335 passed / 57 files, 48.89s, exit 0**; isolated frontend/mocked HTTP tests. Includes persisted original rent intent across remount, safe resource GET and explicit unchanged-key/body replay for every rent action family, plus shared validation error accessibility. Earlier 324/332/335 checkpoints also passed. |
| `node node_modules/next/dist/bin/next build` | Final cold and subsequent incremental builds **exit 0**, 23 static entries plus dynamic owned UUID routes/bridge/proxy. Cold compile 13.6s/TypeScript 6.6s; incremental compile 1349ms/TypeScript 4.0s. A retained cache-related font resolver failure and safe artifact-only recovery are documented below. |
| `backend/.venv/bin/python backend/manage.py check` | Exit 0, no issues/silenced checks. |
| `backend/.venv/bin/python -m pytest tests/test_rent_calendar.py tests/test_development_pool.py tests/test_database_diagnostics.py -m unit` | 24 passed, 1 DB test deselected by explicit unit selection, 0.10s. These are unit tests, not the real financial HTTP verification above. No live schema/test database reset. |
| Ruff check/format on changed Python configuration/runner/unit files | Exit 0. |
| Live complete Part 4 recovery | 1 passed, 8.9m overall, zero browser 5xx; prerequisite gate passed. |
| Full browser regression | **175 passed / 5 failed / 0 skipped / 0 flaky**, 42.1m, exit 1. All complete Parts 1–4, the shared-rent recovery, rent corrections/security and calendar cases passed. Five retained failures were the new desktop funding selector, blank reserve validation alert in both projects, and loose skip selector in both projects. |
| Focused rebuilt screen rechecks | **38 passed / 1 failed / 0 skipped / 0 flaky**, 6.5m, exit 1. All 38 desktop/mobile People/Sharing/Rent screen, validation, history, filter and responsive cases passed. The sole remaining failure was this task's funding assertion targeting a hidden mobile card in the desktop journey. |
| Final complete policy journey | **1 passed / 0 failed / 0 skipped / 0 flaky**, 3.1m overall / 2.3m test, exit 0. Entire approved financial journey rerun, with correct visible summary and actual desktop funding row, plus dashboard/account screens and session refresh. |

The three final JSON artifacts were compared by file, test title and browser project: **180 full-suite case identities, 180 with passing evidence, zero without a pass**, including **12 real financial/authentication Django-backed journeys**. The other browser cases are screen/layout regressions; existing Phase 6 previews and locked export UI remain previews, not actual Part 6 integration. Mocked Vitest tests are separately identified above.

The recovered pooled development process logged **4,149 requests with zero backend 5xx**, maximum request 15,046ms and confirmed-write p95 11,022ms. Expected 400/401/403/404/409 validation/authentication/ownership conflicts are separate from availability failures. Historical provider OperationalError triggers remain uncertain; current development evidence establishes no remaining critical reliability blocker, not a provider-wide uptime guarantee.

Real browser command prefix: `env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/<report>.json pnpm exec playwright test ... --workers=1 --reporter=list,json`. Private auth artifacts are ignored and mode-restricted; credentials/tokens are not included in reports or enabled traces.

Fresh spectacular validation exited 0 with 68 paths / 84 operations. Final standalone typecheck/lint each exited 0; lint retains one existing warning. Targeted Prettier and `git diff --check` pass. A value-only scan checked five nonempty private values/decoded database credential parts from repository-root `.env` and found zero matches in 49 browser JS files, zero private `NEXT_PUBLIC_*` names. The optional frontend `.env.local` does not exist; its ignore rule is verified, not presented as a scanned file.

Retained build issue: a later build produced 16 Turbopack font resolver errors (`next/font/google queries have exactly one entry`) after earlier successful builds. Only the ignored generated `.next/cache/turbopack` directory was renamed to `.next/cache/turbopack-font-diagnostic-20261025` and retained. Both a cold rebuild and a later normal incremental rebuild passed. Fonts, layout, Tailwind configuration, Next configuration, dependencies and permissions were unchanged. The precise compiler/cache trigger remains unproven; no source copy, blanket cleanup or permission weakening was used.

Final browser artifacts (ignored, private): `parts45-full-regression-20261025.json`, `parts45-final-focused-20261025.json`, `part5-policy-final-20261025.json`. Commands, from the frontend directory:

```sh
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/parts45-full-regression-20261025.json pnpm exec playwright test --workers=1 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/parts45-final-focused-20261025.json pnpm exec playwright test e2e/part5-live.spec.ts e2e/phase5.spec.ts --grep 'approved friend-paid|Live People, Sharing and Rent' --workers=1 --reporter=list,json
env KIVO_ALLOW_DEV_TEST_RECORDS=1 PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/part5-policy-final-20261025.json pnpm exec playwright test e2e/part5-live.spec.ts --grep 'approved friend-paid' --project=chromium --workers=1 --max-failures=1 --reporter=list,json
```

## Source inventory

Frontend source paths below are relative to `kivo-frontend/`:

- `src/app/rent/page.tsx` — real owned rent workspace, retained header/navigation/layout.
- `src/features/rent/api.ts`, `queries.ts`, `types/index.ts` — generated-contract aliases, exact representation and owned queries.
- `src/features/rent/components/LiveRent.tsx`, `RentDetails.tsx`, `RentField.tsx` — orchestration, real payment/status/reserve history, linked claim settlement and shared input presentation.
- Existing `RentPlanConfigModal.tsx`, `RentGenerateModal.tsx`, `RentPaymentModal.tsx`, `RentReserveModal.tsx`, `ObligationActionModal.tsx` in that component directory — supported real financial operations and pending-intent recovery.
- Existing `RentOverviewCard.tsx`, `RentObligationList.tsx`, `RentReserveCard.tsx`, `SafeToSpendCard.tsx` — accurate statuses, policy explanations, authoritative metrics and details actions; design system retained.
- `src/features/rent/schemas/rent-plan.schema.ts`, `rent-payment.schema.ts`, `rent-reserve.schema.ts` — actual UUID/date/decimal/participant validation.
- `src/features/finance/queries.ts`, `useFinancialWrite.tsx`, `src/lib/server/api-bridge.ts`, `src/lib/api/timeouts.ts` — rent cache roots, intent recovery and narrow authenticated routes/budgets.
- `e2e/rent-live.ts`, `part5-live.spec.ts`, `global-setup.ts`, `phase5.spec.ts`, `playwright.config.ts` — actual Django harness, journeys and responsive regression. Historic fake rent assertions replaced with actual owned fixtures, not reported as real integration passes.
- `src/test/features/rent/rent.integration.test.ts`, `rent.schemas.test.ts`, `src/test/features/finance/financial-write.test.tsx` — distinct isolated contract, input and recovery tests.

Recovery-specific Python changes are limited to `backend/common/db.py`, `backend/config/settings/development.py`, `kivo-frontend/e2e/django_server.py`, `tests/test_development_pool.py`; client/server budget consumers and request-budget tests are listed in Part 4. No rent service, serializer, model, migration or financial business rule was changed. Documentation includes this report, preserved Part 4 history, operations guidance and readiness/coverage addenda.

The full browser run exposed a real pre-existing shared validation-display bug: `FieldError` computed the preferred `message || error` but rendered only `error`. New rent/relationship callers using `message` therefore produced an empty alert. It now renders the computed text, preserving existing `error` callers. Three focused accessibility/prop tests were added. The zero-reserve validation assertion remained intact and **passed in both rebuilt browser projects**. Another old rent selector matched the early-rendered “Skipped” filter before the owned row loaded; targeting the owned obligation UUID's exact “Skip” action fixed it, and both projects passed the modal/reason assertions. The final fund-screen assertion first matched both summary/mobile cards, then mistakenly targeted the hidden mobile card on desktop. It now verifies the actual visible remaining-capacity summary and desktop table cell; the complete journey passed. No financial assertion was removed and no test was disabled or skipped.

Additional source changes: `kivo-frontend/src/features/auth/components/FieldError.tsx` (one-line rendering correction shared by rent/relationship forms), and `kivo-frontend/src/test/features/auth/FieldError.test.tsx` (message/error/empty-alert regression).

## Original workspace review inventory

The following Git review inventory includes this recovery/Part 5 work **and preserved preceding Parts 3–4 work**. Stage-specific edits are identified above and in the Part 4 report. The owner's already modified `README.md` and untracked `STARTUP.md` are excluded from implementation changes and were not edited by this task. All paths are inside the original repository; new files remain untracked and all changes are uncommitted.

<details>
<summary>Modified and new review paths (103)</summary>

- `backend/common/db.py` (modified)
- `backend/config/settings/development.py` (modified)
- `docs/audits/backend-api-frontend-coverage.md` (modified)
- `docs/integration/integration-readiness.md` (modified)
- `docs/security-and-operations.md` (modified)
- `kivo-frontend/docs/audits/backend-api-frontend-coverage.md` (modified)
- `kivo-frontend/docs/integration/integration-readiness.md` (modified)
- `kivo-frontend/e2e/django_server.py` (modified)
- `kivo-frontend/e2e/global-setup.ts` (modified)
- `kivo-frontend/e2e/live-api.ts` (modified)
- `kivo-frontend/e2e/phase4.spec.ts` (modified)
- `kivo-frontend/e2e/phase5.spec.ts` (modified)
- `kivo-frontend/playwright.config.ts` (modified)
- `kivo-frontend/src/app/dashboard/page.tsx` (modified)
- `kivo-frontend/src/app/money/sources/[id]/page.tsx` (modified)
- `kivo-frontend/src/app/money/sources/page.tsx` (modified)
- `kivo-frontend/src/app/people/[id]/page.tsx` (modified)
- `kivo-frontend/src/app/people/page.tsx` (modified)
- `kivo-frontend/src/app/rent/page.tsx` (modified)
- `kivo-frontend/src/app/shared-expenses/[id]/page.tsx` (modified)
- `kivo-frontend/src/app/shared-expenses/page.tsx` (modified)
- `kivo-frontend/src/features/dashboard/components/CategoryBreakdownCard.tsx` (modified)
- `kivo-frontend/src/features/dashboard/components/FinancialSummaryGrid.tsx` (modified)
- `kivo-frontend/src/features/dashboard/components/RecentActivityCard.tsx` (modified)
- `kivo-frontend/src/features/dashboard/components/SpendingChartCard.tsx` (modified)
- `kivo-frontend/src/features/dashboard/types.ts` (modified)
- `kivo-frontend/src/features/finance/QueryState.tsx` (modified)
- `kivo-frontend/src/features/finance/api.ts` (modified)
- `kivo-frontend/src/features/finance/queries.ts` (modified)
- `kivo-frontend/src/features/finance/useFinancialWrite.tsx` (modified)
- `kivo-frontend/src/features/lending/components/ClaimCard.tsx` (modified)
- `kivo-frontend/src/features/lending/components/LendBorrowModal.tsx` (modified)
- `kivo-frontend/src/features/lending/components/RepaymentModal.tsx` (modified)
- `kivo-frontend/src/features/lending/schemas/loan.schema.ts` (modified)
- `kivo-frontend/src/features/lending/schemas/settlement.schema.ts` (modified)
- `kivo-frontend/src/features/lending/types/index.ts` (modified)
- `kivo-frontend/src/features/people/components/ContactCard.tsx` (modified)
- `kivo-frontend/src/features/people/components/ContactDetailHeader.tsx` (modified)
- `kivo-frontend/src/features/people/components/ContactList.tsx` (modified)
- `kivo-frontend/src/features/people/components/ContactModal.tsx` (modified)
- `kivo-frontend/src/features/rent/components/ObligationActionModal.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentGenerateModal.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentObligationList.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentOverviewCard.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentPaymentModal.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentPlanConfigModal.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentReserveCard.tsx` (modified)
- `kivo-frontend/src/features/rent/components/RentReserveModal.tsx` (modified)
- `kivo-frontend/src/features/rent/components/SafeToSpendCard.tsx` (modified)
- `kivo-frontend/src/features/rent/schemas/rent-payment.schema.ts` (modified)
- `kivo-frontend/src/features/rent/schemas/rent-plan.schema.ts` (modified)
- `kivo-frontend/src/features/rent/schemas/rent-reserve.schema.ts` (modified)
- `kivo-frontend/src/features/rent/types/index.ts` (modified)
- `kivo-frontend/src/features/shared-expenses/components/CreateSharedBillModal.tsx` (modified)
- `kivo-frontend/src/features/shared-expenses/components/SharedBillCard.tsx` (modified)
- `kivo-frontend/src/features/shared-expenses/components/SharedBillDetailHeader.tsx` (modified)
- `kivo-frontend/src/features/shared-expenses/components/SharedBillList.tsx` (modified)
- `kivo-frontend/src/features/shared-expenses/schemas/shared-bill.schema.ts` (modified)
- `kivo-frontend/src/features/shared-expenses/types/index.ts` (modified)
- `kivo-frontend/src/features/transactions/components/TransactionPagination.tsx` (modified)
- `kivo-frontend/src/lib/api/client.ts` (modified)
- `kivo-frontend/src/lib/server/api-bridge.ts` (modified)
- `kivo-frontend/src/test/api/server-auth.test.ts` (modified)
- `kivo-frontend/src/test/features/finance/financial-write.test.tsx` (modified)
- `kivo-frontend/src/test/features/lending/ClaimCard.test.tsx` (modified)
- `kivo-frontend/src/test/features/lending/loan.schema.test.ts` (modified)
- `kivo-frontend/src/test/features/rent/rent.schemas.test.ts` (modified)
- `kivo-frontend/src/test/features/shared-expenses/SharedBillCard.test.tsx` (modified)
- `kivo-frontend/src/test/features/shared-expenses/shared-bill.schema.test.ts` (modified)
- `docs/integration/part-03-dashboard-funding-verification.md` (new)
- `docs/integration/part-04-people-sharing-verification.md` (new)
- `docs/integration/part-05-rent-reserves-verification.md` (new)
- `kivo-frontend/e2e/financial-ui.ts` (new)
- `kivo-frontend/e2e/part3-live.spec.ts` (new)
- `kivo-frontend/e2e/part4-isolated.spec.ts` (new)
- `kivo-frontend/e2e/part4-live.spec.ts` (new)
- `kivo-frontend/e2e/part4-recovery.spec.ts` (new)
- `kivo-frontend/e2e/part5-live.spec.ts` (new)
- `kivo-frontend/e2e/rent-live.ts` (new)
- `kivo-frontend/src/features/dashboard/api.ts` (new)
- `kivo-frontend/src/features/finance/useOwnedQuery.ts` (new)
- `kivo-frontend/src/features/funding/api.ts` (new)
- `kivo-frontend/src/features/funding/components/LiveFunding.tsx` (new)
- `kivo-frontend/src/features/relationships/api.ts` (new)
- `kivo-frontend/src/features/relationships/components/LivePeople.tsx` (new)
- `kivo-frontend/src/features/relationships/components/LiveSharing.tsx` (new)
- `kivo-frontend/src/features/relationships/components/RelationshipHistory.tsx` (new)
- `kivo-frontend/src/features/relationships/queries.ts` (new)
- `kivo-frontend/src/features/relationships/useToday.ts` (new)
- `kivo-frontend/src/features/rent/api.ts` (new)
- `kivo-frontend/src/features/rent/components/LiveRent.tsx` (new)
- `kivo-frontend/src/features/rent/components/RentDetails.tsx` (new)
- `kivo-frontend/src/features/rent/components/RentField.tsx` (new)
- `kivo-frontend/src/features/rent/queries.ts` (new)
- `kivo-frontend/src/lib/api/timeouts.ts` (new)
- `kivo-frontend/src/test/api/request-budgets.test.ts` (new)
- `kivo-frontend/src/test/features/finance/dashboard-funding.test.ts` (new)
- `kivo-frontend/src/test/features/finance/relationships.test.tsx` (new)
- `kivo-frontend/src/test/features/finance/report-state.test.tsx` (new)
- `kivo-frontend/src/test/features/rent/rent.integration.test.ts` (new)
- `tests/test_development_pool.py` (new)

- `kivo-frontend/src/features/auth/components/FieldError.tsx` (modified)
- `kivo-frontend/src/test/features/auth/FieldError.test.tsx` (new)

</details>

## Limits and final gate

**Part 4 VERIFIED; Part 5 IMPLEMENTED / VERIFIED for the approved development environment. GO for development use with the documented pool-enabled runtime.** No critical authentication, accounting, data-isolation or 503 blocker remains in the executed scope. No production HTTPS/load certification is claimed. Term editing/deletion and unsupported status values are not fabricated. Test records are retained; the database contains identifiable development fixtures now. Tab closure loses the tab-local pending journal because Django has no receipt lookup endpoint. Full backend pytest database suites were not run against the live application database; real financial behavior was tested through Django HTTP workflows, without schema changes.

Final Git review confirmed the original root and `INTIGRATION` branch: 70 modified tracked files and 33 new review files, including preserved preceding Parts 3–4 work, excluding the owner's untouched README/STARTUP changes. All changes are uncommitted. No backend business service, model, serializer, migration, dependency/lock file, font setup, `src/app/layout.tsx`, `next.config.ts` or design-token source changed. The diff and the source inventory above are reviewable in the original repository.

Part 6 budgets/reports/CSV implementation has **not begun**. Its prerequisites are separate explicit authorization, fresh actual contract inspection and a new verification gate using the documented development runtime. No new staging database is required by this task.
