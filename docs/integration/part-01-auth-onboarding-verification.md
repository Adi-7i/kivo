# Integration Part 1 — authentication and onboarding verification

Current status: **VERIFIED in the approved development environment — Part 1 complete**. Final gates: 236 unit/component tests and 175 real-session browser cases passed; production build, TypeScript and lint passed (three existing warnings). The initial blocked-status record below is retained as history. Current architecture and final verification are recorded in the appended recovery sections.

Date: 2026-10-22. Status: **BLOCKED — NOT STARTED**.

The mandatory [Part 0 safety gate](part-00-safety-audit.md) is **NO-GO**. This is a blocked-status record, not evidence of implementation or live integration verification.

| Deliverable | Status and evidence |
| --- | --- |
| API endpoints integrated | None. Five auth endpoints and account list/create contracts were inspected in Part 0. |
| Authentication/session architecture | **BLOCKED**, implementation not started. Django DB sessions are the verified backend mechanism; same-origin routing is the supported contract. |
| CSRF/cookies | **NOT VERIFIED in staging**. Source/settings observations are in Part 0. |
| Registration, login, restoration, expiry, protected access | **BLOCKED**. No mutating API requests, test users, or fake sessions created. |
| Logout and cross-user cache isolation | **BLOCKED**. No implemented logout or authenticated cache lifecycle. |
| Profile | **BLOCKED** for integration. Backend supports current-user GET only; profile/preferences updates are unsupported. |
| First account/onboarding | **BLOCKED**. Exact decimal-INR/account idempotency contracts verified from source; no financial write executed. |
| Staging environment | **NOT VERIFIED**. Active backend targets remote database `postgres`; historical test DB references do not configure a staging application server. |
| Automated tests | Baseline only: typecheck exit 0, lint exit 0 with three warnings, Vitest exit 0 (200/200). Build exit 1 twice; Playwright execution exit 1 twice, zero browser cases ran; collection exit 0 (190 cases). Backend check/schema validation exit 0. Full evidence in Part 0. |
| Security | No backend or frontend source/environment changes; no database access/mutations, credential exposure, or alternate authentication introduced. Live CSRF, cookie, authorization and bundle verification remain outstanding. |
| Completion | **BLOCKED**; no claim of implemented or verified authentication/onboarding. |

Documentation changed in the original repository:

- `docs/integration/part-00-safety-audit.md` (new audit).
- `docs/integration/part-01-auth-onboarding-verification.md` (this blocked-status record).
- `docs/integration/integration-readiness.md` and its frontend copy.
- `docs/audits/backend-api-frontend-coverage.md` and its frontend copy.

Resolution: configure and verify an isolated Django staging process/database and intended frontend origin, and restore build/browser execution capability as detailed in Part 0. After GO, the existing conditional authorization permits Part 1 implementation and its real staging test matrix. No additional feature-scope approval is being requested.

Part 2 prerequisite: complete Part 1 with actual staging authentication/session/onboarding evidence and review its deliverables. **Do not begin Part 2 without explicit user authorization.**

## Recovery — owner-approved development database

The owner's later explicit instruction designates the existing Django-connected Supabase `postgres` database exclusively for development and authorizes identifiable test users, sessions and initial money accounts through supported application workflows. This supersedes the historical staging/record-approval prerequisites. No additional database, schema change or infrastructure was created. The [Part 0 recovery](part-00-safety-audit.md#recovery-decision--approved-development-database-2026-10-22) records the real encrypted read-only connection result and GO decision.

## Implemented contracts and architecture

| Operation | Implemented frontend behavior |
| --- | --- |
| `GET /api/v1/auth/csrf/` | Bootstraps the readable Django cookie when absent; every write rereads the current token. |
| `POST /api/v1/auth/register/` | RHF/Zod name/email/password/confirmation; minimum ten-character non-numeric password, server-side common/similarity validation, nested field errors and duplicate-email handling. Confirmation is local only. Success offers explicit login; no automatic login is assumed. |
| `POST /api/v1/auth/login/` | Real credentials/session establishment, private-cache reset and first-account routing. Account-state outage after confirmed login routes to a retryable account check rather than falsely reporting invalid credentials. |
| `GET /api/v1/auth/me/` | Current `id`, `name`, `email`, `date_joined`; restoration after refresh/focus, periodic verification, cross-tab change notification and history-restoration check. |
| `POST /api/v1/auth/logout/` | Requires a confirmed 204 before success; clears Query caches and tab-local recovery data, notifies other tabs and replaces the full document at `/login`, discarding router/component caches. Ambiguous failure remains an explicit error. |
| `GET /api/v1/accounts/` | Owned, paginated account state; zero accounts starts the wizard, an existing account bypasses repeat onboarding. No completion field is invented. |
| `POST /api/v1/accounts/` | Uses `name`, `kind` (`cash/bank/wallet`), `opened_on`, exact two-place INR `opening_balance` and durable `Idempotency-Key`. Double-submit lock; no automatic POST retries. |

Browser Fetch calls remain same-origin under `/api/v1/`. The server-only `DJANGO_API_ORIGIN` defaults to `http://127.0.0.1:8000` and permits HTTPS or loopback HTTP origins, never URL credentials/paths. The bridge allowlists only the six paths/seven operations above, forwards only Django session/CSRF cookies and necessary headers, preserves the actual browser Origin and distinct Set-Cookie headers, and rejects cross-origin writes, redirects, oversized/non-JSON writes and debug HTML responses. It does not forward spoofable client proxy headers or invent an identity/token. Django remains the sole authentication, authorization and financial authority. No browser-to-Supabase connection exists.

Server `src/proxy.ts` protects dashboard/onboarding/settings and the other existing private route roots. Cookie presence is insufficient: an opaque session is checked through Django `me`. A confirmed 401 redirects to login with a safe local return path; outages return 503 and do not impersonate expired credentials. Client boundaries hide private content during initialization/errors and clear private queries when the verified user changes or disappears. Backend permissions remain authoritative on every API operation.

API responses/fetches use private/no-store behavior; the bridge retains Retry-After, WWW-Authenticate and correlation IDs. The client normalizes actual `error.details`/`error.message` responses, including 400/401/403/409/429/500/503 and network/timeout failures. Fetch deadlines remain bounded (client 15 seconds; bridge/server verification 12 seconds), including body consumption, and no financial mutation is automatically replayed.

## Profile and onboarding behavior

Profile displays the actual authenticated identity. Name/email are read-only; unsupported profile/password updates are disabled and explained. Currency/timezone are fixed supported standards, not invented persisted preferences. Forest Green tokens, Plus Jakarta Sans, shadcn components and existing layouts remain. Small wrapping changes accommodate long authenticated identities on mobile.

The existing four-step wizard uses the registered identity and actual account contract. It normalizes monetary **strings** using exact integer/string operations, validates real calendar dates and defaults dates in Asia/Kolkata. It does not calculate account balances or create income transactions. Summary formatting no longer uses floating-point conversion. Django owns the opening/equity posting.

Before submitting, the wizard checks owned accounts again. Before the first POST, it stores the original key and exact payload in tab-local `sessionStorage`, scoped by verified user ID. This is recovery metadata, never authentication credentials. An ambiguous result locks edits and requires an explicit account-state check; a deliberate retry reuses that key/body. Refresh restores the pending attempt. Successful creation refreshes account state and navigates to the existing dashboard. Its financial preview modules remain pending; no other financial APIs were integrated.

Completion is derived only from verified account existence. Archived accounts are included by the current endpoint; per-step persistence before a submission and editable profile preferences are not supported. Closing a tab loses its pending recovery metadata; returning account-state checks and backend name uniqueness still prevent a blind duplicate submission of the same named account.

## Safe execution and reproduction

All final source lives in `/home/lucifer/Desktop/kivo/kivo-frontend` on `integration/part-00-auth-onboarding`. No worktree/copy, root access, permission weakening, dependency upgrade, backend source change, migration, flush, truncate or data cleanup was used. Temporary generated schemas/debug artifacts are not implementation copies.

Using the existing backend environment, the development server command was:

```bash
env CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001 backend/.venv/bin/python backend/manage.py runserver 127.0.0.1:8000 --noreload --nothreading
```

Frontend commands run from `kivo-frontend`:

```bash
pnpm typecheck
pnpm lint
pnpm test
node node_modules/next/dist/bin/next build
env KIVO_ALLOW_DEV_TEST_RECORDS=1 node node_modules/@playwright/test/cli.js test --workers=1
```

The runner requires scoped approval for ports, Chromium and remote networking. Direct installed Node CLI execution succeeds without package/runtime upgrades. Playwright's dedicated opt-in protects accidental test-data creation outside an approved development run. It uses real Django sessions; other module tests continue checking their existing UI previews. Real lifecycle writes run once on desktop Chromium; both desktop/mobile projects cover authentication/profile layout and the existing frontend regressions. Obsolete preview-only auth expectations were replaced with real behavior, yielding 175 collected cases; no failed cases were skipped to manufacture a pass.

## Security observations and practical limits

- Real missing-CSRF and untrusted-Origin writes are rejected; invalid/foreign resources do not disclose another user's account. Session cookies remain HttpOnly/SameSite=Lax. Production Secure attributes are passed through intact; local development runs over HTTP and is not a deployed HTTPS certification.
- No session/password/token is placed in localStorage/sessionStorage. Only account recovery metadata is tab-local. Session fixture files are ignored and mode 600 in a mode-700 directory. Real browser traces are disabled. Test passwords are random process-only values and are never printed or committed.
- A built-bundle check scanned 45 browser JavaScript files for the actual configured database DSN and Django secret values: neither was present. These checks report booleans/counts only.
- Real remote-write latency exceeded the proxy deadline once. A 503 can follow an eventual commit; reconciliation, not automatic replay, is required. The fixture now checks owned state after such responses without retrying the write. No timeout was raised to conceal that observation.
- Sustained threaded-run traffic produced real `MeView` OperationalError/503 responses. A read-only diagnostic observed 40 idle clients against a reported PostgreSQL maximum of 60; restarting only the task's development process in single-threaded mode reduced idle clients to four. Private navigation prefetch is disabled and session observers share a ten-second freshness window to avoid redundant authentication reads. This bounds the development runner's connection use; production concurrency/connection provisioning remains a separate deployment concern. No connection limit, database role, pooling setting or backend source was changed.
- Because the bridge strips untrusted forwarded addresses and Django currently limits auth by peer address, deployments must review shared ingress rate limits/proxy identity. Existing historical least-privilege/HTTPS/recovery release gates are not certified by this development integration. No backend grant/role/policy changes were made.
- Component/unit tests use mocked HTTP responses and are explicitly distinguished from real Django/PostgreSQL browser tests. The backend pytest suite was not pointed at the application database; no test fixture was allowed to flush it.

## Part 2 boundary

Review this Part 1 implementation and its verified evidence before separately authorizing Part 2. Dashboard metrics, other account-management operations, categories, transactions, lending, sharing, rent, budgets and reports remain unintegrated. Unsupported profile operations require backend product/API work separately. Part 2 has not begun.


## Files changed in the original repository

The following 50 source/test/configuration/documentation files are changed or new relative to `ed53bff`; this includes the six documentation changes retained from the initial audit. All paths are under `/home/lucifer/Desktop/kivo`. No backend source, backend tests, dependency manifests/lockfiles or actual secret environment files changed.

- `docs/audits/backend-api-frontend-coverage.md`
- `docs/integration/integration-readiness.md`
- `docs/integration/part-00-safety-audit.md`
- `docs/integration/part-01-auth-onboarding-verification.md`
- `kivo-frontend/.env.example`
- `kivo-frontend/.gitignore`
- `kivo-frontend/docs/audits/backend-api-frontend-coverage.md`
- `kivo-frontend/docs/integration/integration-readiness.md`
- `kivo-frontend/e2e/global-setup.ts`
- `kivo-frontend/e2e/live-api.ts`
- `kivo-frontend/e2e/part1-live.spec.ts`
- `kivo-frontend/e2e/phase2.spec.ts`
- `kivo-frontend/playwright.config.ts`
- `kivo-frontend/src/app/api/v1/[...path]/route.ts`
- `kivo-frontend/src/app/providers.tsx`
- `kivo-frontend/src/components/layout/AppHeader.tsx`
- `kivo-frontend/src/components/layout/AppNav.tsx`
- `kivo-frontend/src/features/auth/api.ts`
- `kivo-frontend/src/features/auth/components/AuthPageLayout.tsx`
- `kivo-frontend/src/features/auth/components/LoginForm.tsx`
- `kivo-frontend/src/features/auth/components/RegisterForm.tsx`
- `kivo-frontend/src/features/auth/navigation.ts`
- `kivo-frontend/src/features/auth/schemas/register.schema.ts`
- `kivo-frontend/src/features/auth/session.tsx`
- `kivo-frontend/src/features/onboarding/api.ts`
- `kivo-frontend/src/features/onboarding/attempt.ts`
- `kivo-frontend/src/features/onboarding/components/FirstAccountStep.tsx`
- `kivo-frontend/src/features/onboarding/components/OnboardingShell.tsx`
- `kivo-frontend/src/features/onboarding/components/PersonalSetupStep.tsx`
- `kivo-frontend/src/features/onboarding/components/SetupSummaryStep.tsx`
- `kivo-frontend/src/features/onboarding/money.ts`
- `kivo-frontend/src/features/onboarding/schemas/account.schema.ts`
- `kivo-frontend/src/features/profile/components/ProfileHeader.tsx`
- `kivo-frontend/src/features/profile/components/ProfileInfoSection.tsx`
- `kivo-frontend/src/features/profile/components/ProfilePage.tsx`
- `kivo-frontend/src/lib/api/client.ts`
- `kivo-frontend/src/lib/api/errors.ts`
- `kivo-frontend/src/lib/config/env.ts`
- `kivo-frontend/src/lib/server/api-bridge.ts`
- `kivo-frontend/src/lib/server/django.ts`
- `kivo-frontend/src/proxy.ts`
- `kivo-frontend/src/test/api/auth-transport.test.ts`
- `kivo-frontend/src/test/api/server-auth.test.ts`
- `kivo-frontend/src/test/features/auth/LoginForm.test.tsx`
- `kivo-frontend/src/test/features/auth/RegisterForm.test.tsx`
- `kivo-frontend/src/test/features/auth/register.schema.test.ts`
- `kivo-frontend/src/test/features/auth/session.test.tsx`
- `kivo-frontend/src/test/features/onboarding/OnboardingShell.test.tsx`
- `kivo-frontend/src/test/features/profile/ProfilePage.test.tsx`
- `kivo-frontend/src/test/setup.ts`

## Final executed verification and completion

| Gate | Exact observed outcome |
| --- | --- |
| Approved database connectivity | **VERIFIED**, encrypted read-only connection to configured `postgres`; `transaction_read_only=on`, `SELECT 1=1`, exit 0. No credentials printed. |
| `pnpm typecheck` | **VERIFIED**, exit 0, including the final browser configuration/tests. |
| `pnpm lint` | **VERIFIED**, exit 0; zero errors and the same three existing RHF `watch()`/React Compiler warnings in BudgetModal, CategoryModal and CreateSharedBillModal. No warning was suppressed. |
| `pnpm test` | **VERIFIED**, exit 0; **48 files / 236 tests passed**, latest full run 47.55s. These are isolated unit/component and mocked-HTTP tests. |
| `node node_modules/next/dist/bin/next build` | **VERIFIED**, exit 0; Next.js 16.4.2 compiled, typechecked and generated 43 static/prerendered entries, with the dynamic API bridge and server Proxy present. Latest build compilation 3.5s, TypeScript 5.0s, prerendering 1.721s. |
| Final full Playwright command above | **VERIFIED**, exit 0; **175/175 passed, 0 failed, 0 skipped, 7.9m**, one worker against the original production frontend build and real Django/development PostgreSQL. Desktop Chromium and Mobile Chrome included. |
| Focused real lifecycle | Earlier **1/1 passed, 59.5s**; later final full-run lifecycle **passed, 49.7s**, including actual weak-password rejection. |
| Django `manage.py check` | **VERIFIED**, exit 0, no system-check issues. |
| Django `spectacular --validate --file /tmp/kivo-integration-part1-openapi.yaml` | **VERIFIED**, exit 0; OpenAPI 3.0.3 with 68 paths/84 operations. Both corrected coverage tables compare exactly to all 84 operations. |
| Browser-bundle secret check | **VERIFIED**, exit 0; actual configured database DSN and Django secret absent from all 45 built browser JavaScript files. Only counts/booleans printed. |
| Git/unchanged backend gates | **VERIFIED**, `git diff --check` exit 0 and backend/test/dependency-manifest/lockfile diff checks exit 0. All 50 changed/new files are in the original repository and cataloged above. No commit/push performed. |

Real development lifecycle evidence includes:

- UI registration confirmed by Django 201; immediate `me` 401 proves registration did not establish a session. Duplicate registration and weak password return 400; invalid credentials return 400.
- Login establishes a real HttpOnly/SameSite=Lax session and rotates CSRF. Refresh restores the same authenticated profile; direct anonymous/invalid-session access redirects to login.
- A first account is created through the wizard with `opening_balance="1200.50"`. Owned account list confirms exactly one account and the exact returned opening/current balances. Summary, read directly from Django for verification only, returns `liquid_balance="1200.50"`, `personal_expense="0.00"`, `external_receipts="0.00"`: opening funds are not income. The baseline fixture separately creates an identifiable `"123.45"` opening account for the other test identity.
- Replaying the exact original account body/key returns 200 and the same UUID; changed body with that key returns 409. UI duplicate-submit protection and pending recovery are also covered by mocked-HTTP component tests.
- Missing CSRF and untrusted Origin writes return 403. A foreign-owned account UUID returns 404 through Django ownership enforcement.
- Returning users bypass repeat onboarding after a confirmed accounts GET. Logout invalidates both the current cookie and a captured old session cookie (`me` 401); switching to the other test identity in the same browser displays only that identity. Invalid-session handling is tested directly; the natural 14-day expiry interval and deployed HTTPS behavior were not time-elapsed/deployment tested.

Preserved failed-run history:

| Earlier run | Observed outcome and resolution |
| --- | --- |
| Initial sandbox build/browser baseline | Build exit 1 on process/port restrictions; browser startup exit 1 without a build. Scoped direct Node execution resolved the runner restriction. |
| First full real browser run | 165 passed / 10 failed, 7.4m, exit 1. Mobile long-identity overflow and inactive cached-form/timing failures were corrected; no tests were skipped. |
| Sustained threaded-server full run | 136 passed / 39 failed, 7.0m, exit 1. Real OperationalError/503 responses and connection-pressure evidence are retained in Part 0. |
| First bounded-server parallel run | 173 passed / 2 failed, 6.3m, exit 1. Both failures asserted navigation before the real account check finished; tests now await and verify that GET. |
| Subsequent parallel run | 174 passed / 1 failed, 6.6m, exit 1. One profile assertion observed the legitimate session-loading state while another case wrote to the single-threaded backend. |
| Final matching-runner regression | **175 passed / 0 failed / 0 skipped**, 7.9m, exit 0. The one-worker configuration matches the bounded development server. Application deadlines and all assertions/security checks remain enabled. |

The final clean run is functional development verification, not a concurrency/load or production-readiness certification. Earlier provider/runtime failures and the ambiguous-commit observation are not erased by the clean run. Keep the bounded runner for this verification procedure; production server/connection/ingress capacity needs separate operational review.

**Final assessment: GO for verified Part 1 use on the approved development target; Part 1 IMPLEMENTED and VERIFIED.** There are no remaining mandatory development verification blockers in the completed scope. Identifiable test records are retained, never deleted as cleanup. Profile/preference editing remains unsupported by the actual API. **Part 2 has not begun and still requires explicit authorization.**
