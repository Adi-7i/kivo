# Bug 01 — application entry flow

Date: 2026-10-26. Status: **IMPLEMENTED / VERIFIED in the development environment**.

## Scope and repository baseline

The original physical workspace and Git root are `/home/lucifer/Desktop/kivo`. The branch is **`UTA-TESTING`**, baseline commit **`b083bea`**. Initial `git status --short --untracked-files=all` was clean. Root and frontend `AGENTS.md`, the Part 1 verification report, the current Part 6 recovery findings, installed Next.js authentication/Proxy documentation, and the existing authentication/onboarding/dashboard code were reviewed.

All edits are in this original repository. No project copy, worktree, automatic commit, dependency change, backend application change, schema change, migration or destructive database operation was used. Previous integration evidence and connectivity diagnostics remain preserved.

## Root cause and correction

`src/app/page.tsx` still rendered the entire Phase 1 design-system showcase. The server Proxy matched private routes only, and `SessionBoundary` allowed public routes through without entry/setup routing. The shared header/navigation also exposed phase badges and a Design System destination.

The obsolete homepage was removed rather than relocated into another publicly accessible demo route. Its replacement is a minimal loading shell governed by the existing Django session boundary. Global CSS, Forest Green tokens, Plus Jakarta Sans, shared UI components and the integrated financial screens remain intact.

| State | Result |
| --- | --- |
| Root request without a session cookie | Server 307 to `/register`, with private/no-store and `Vary: Cookie` headers. |
| Root with an opaque/expired cookie | Verify through Django `me`; a confirmed 401 goes to Register. Cookie presence is never accepted as identity. |
| Authenticated root/Login/Register, zero owned accounts | `/onboarding`. |
| Authenticated root/Login/Register, an existing owned account | `/dashboard`, or an explicitly validated private return destination. |
| Direct private navigation with incomplete setup | Hide private children, check owned accounts, then route to onboarding; a safe non-dashboard destination is retained in `next`. |
| Session verification unavailable | Hide route content and show `Retry session check`; do not infer logout. |
| Account/setup verification unavailable | Hide route content and show `Retry account check`; preserve the verified session and perform no account write. |
| Returning user visiting onboarding | The existing wizard checks accounts and returns to Dashboard. |

The existing server Proxy still verifies private document requests with Django. Django permissions remain authoritative for every API operation. Public entry pages use the same existing client session/API infrastructure, with no second authentication mechanism. Private query keys remain user-scoped. Setup checks reuse the wizard's `["accounts", user.id]` cache key, with a ten-second freshness window and no automatic retry. The wizard retains ownership of its own account check while on `/onboarding`.

Authenticated public pages and private content remain hidden during unresolved session/setup state. Safe return-path validation now rejects the onboarding route and its query/subpath variants as final destinations, preventing setup-return loops and preserving the existing external/encoded redirect rejection.

## Registration, onboarding and dashboard

Source review confirmed Django registration returns a public profile with HTTP 201 and **does not call Django login**. The registration form now navigates to `/login` only after that confirmed response; password fields are cleared and duplicate submission remains disabled. Login continues using Django session cookies and CSRF. Its account response is cached before publishing the verified client identity, avoiding a competing setup fetch while the login form decides its destination.

The existing four-step wizard is preserved: Welcome, supported identity/INR/Asia-Kolkata presentation, initial account and review. No `onboarding_completed` property or unsupported profile write was added. Initial account submission retains its precise decimal value, opening date, pre-submit account check, submission lock, persisted operation identity and explicit ambiguous-result reconciliation. No income transaction is synthesized.

Dashboard still uses real `/api/v1/dashboard/`, category and report queries. It does not import homepage demo data or calculate authoritative balances. The obsolete notice saying rent operations were scheduled for Part 5 was replaced with a link to the already integrated rent screen. The application header and navigation retain the existing style and actual module destinations, with development badges/showcase/setup navigation removed.

Confirmed logout behavior is unchanged: terminate Django session, cancel/clear private queries and recovery state, notify other tabs, then replace the document at Login to discard router/component caches. Existing session-change and browser restoration handlers remain active.

## Actual API contracts used

Existing APIs, unchanged by this fix:

- `GET /api/v1/auth/csrf/`: Django CSRF bootstrap.
- `POST /api/v1/auth/register/`: name, email, password; 201 profile without a session.
- `POST /api/v1/auth/login/`: email/password; Django session and rotated CSRF cookies.
- `GET /api/v1/auth/me/`: authenticated profile; 401 represents confirmed anonymous/invalid credentials.
- `POST /api/v1/auth/logout/`: confirmed termination, HTTP 204.
- `GET /api/v1/accounts/`: owned paginated state; `count` determines first-account setup.
- `POST /api/v1/accounts/`: name, kind, opening balance, opening date and `Idempotency-Key`.
- Existing dashboard, category and trend/breakdown GETs remain the financial data source.

The same-origin Fetch bridge and Django CSRF/session protections were preserved. No authentication credentials were written to browser storage or committed.

## Environment and test setup

The repository read-only database probe confirmed the configured **development `postgres` database, Direct IPv6 connection and TLS**, with `transaction_read_only=on`. Three samples succeeded: **169.539–234.818ms**, median **182.136ms**, zero blocked sessions and no retransmission increase during that short sample. Fresh connection setup ranged **1.685–7.372s**. This is limited evidence of current connectivity, not resolution of the separate Part 6 transport issue.

Port 8000 was already occupied by another Django process. Its registration request from the browser-test origin received a legitimate **403**. That process was neither stopped nor reconfigured. The existing repository verification runner gained a validated optional `--port` argument, defaulting to the previous 8000, so this run could bind **127.0.0.1:8001** instead. Only the isolated runner trusted the exact localhost test origins. CSRF enforcement was not disabled.

The production frontend was tested on **localhost:3001**, with process-only `DJANGO_API_ORIGIN=http://127.0.0.1:8001`. The routing itself is relative and also applies to normal localhost:3000 use. No `.env` or persistent application/backend configuration changed. The isolated runner was stopped gracefully with exit 0 after verification; the existing port-8000 service was preserved.

The focused Playwright configuration avoids the unrelated global financial fixture seeding. Two identifiable `kivo-bug01-…@example.test` development identities and their ₹5.25 opening accounts were created across the successful creation attempts and retained. No expenses, artificial income, cleanup deletion or ambiguous write retry was performed.

## Executed checks

| Command/check | Actual outcome |
| --- | --- |
| Baseline `pnpm typecheck && pnpm lint && pnpm test` | Exit 0; **393 tests / 60 files passed**, 47.96s. |
| Initial production build | Exit 0; existing Next.js build/type generation/prerendering passed. |
| Targeted authentication/entry/onboarding Vitest command | Exit 0; **90 tests / 11 files passed**, 7.18s. Mocked HTTP/component evidence. |
| Full post-change `pnpm typecheck && pnpm lint && pnpm test` | Exit 0; **418 tests / 61 files passed**, 59.55s. Mocked unit/component tests, not live Django evidence. |
| Post-change `node node_modules/next/dist/bin/next build` | Exit 0; production compilation, TypeScript and 23 prerendered entries passed. |
| Final `pnpm typecheck && pnpm lint` and changed-TypeScript Prettier check | Exit 0. |
| `backend/.venv/bin/python backend/manage.py check` | Exit 0, no system-check issues. |
| Ruff check and format-check of `e2e/django_server.py` | Exit 0. |
| `git diff --check` and original-workspace inventory review | Exit 0; all changed/new implementation and report paths are inside the original Git root. |

The full backend database test suite and broad cross-module financial Playwright suite were not rerun for this focused frontend bug. Existing accounting/financial services were not modified. Those earlier Part 6 gates retain their own documented status.

### Browser command and final evidence

Run from `kivo-frontend/` with private mode-600 JSON/raw logs under ignored `.playwright-auth/`:

```sh
DJANGO_API_ORIGIN=http://127.0.0.1:8001 \
KIVO_ALLOW_DEV_TEST_RECORDS=1 \
PLAYWRIGHT_JSON_OUTPUT_NAME=.playwright-auth/bug01-entry-final.json \
pnpm exec playwright test --config=playwright.entry.config.ts \
  --workers=1 --max-failures=1 --reporter=list,json
```

**Exit 0; 15 passed, zero failed, zero skipped, zero flaky; 111.777s.** Eight desktop Chromium and seven Mobile Chrome cases ran. Tracing remained disabled.

- **One complete real Django/database journey, 101.981s:** fresh root → Register/Login navigation → real registration 201 → automatic Login navigation → `me` 401 proves registration did not log in → real login → HttpOnly/SameSite=Lax session → incomplete users from Root/Login/Register/direct Dashboard reach onboarding without dashboard metrics → existing wizard → double-click account submission results in one financial POST with the original idempotency header → confirmed account 201 → real Dashboard → Root/Login/Register/Onboarding all return to Dashboard → refresh preserves identity → confirmed logout 204 → `me` 401 → browser Back contains no dashboard metrics → private route denied → invalid cookie at Root returns to Register.
- **Authoritative financial evidence:** account balance/opening balance and Django dashboard liquid/safe-to-spend values all **₹5.25**; server personal expenses and eligible income **₹0.00**. The test reads Django responses and rendered metrics. Opening equity was not represented as income. Existing module links remained accessible and phase/showcase notices were absent.
- **Six anonymous real-Django browser cases:** root registration, Login/Register links, no private navigation and responsive layout on desktop/mobile.
- **Eight explicitly mocked-session browser cases:** six session-503/retry states across Root/Login/Register and two anonymous private-route sweeps. The latter cover all twelve existing protected entry roots using actual server redirects and a mocked anonymous client-session response. These do not prove database availability.
- **One explicitly injected account GET 503 within the real journey:** the real session cookie was preserved; Root showed an account retry state; removing the injected failure and retrying returned to Dashboard. The injection is not counted as a real backend outage.
- No unexpected browser page errors or real HTTP 5xx were observed in the successful live journey.

In the final browser window **16:09:59.730–16:11:51.507 UTC**, the isolated Django log recorded **133 completed requests: 115×200, 2×201, 1×204, 15×401, zero 5xx**. These counts select request-completion records with method/path/duration, excluding duplicate generic log entries. Median duration **684ms**, maximum **6,081ms**. Confirmed mutations: registration **1,573ms**, login **2,352ms**, initial account **5,919ms**, logout **952ms**. This short controlled run is not a reliability guarantee for the separate Part 6 issue.

### Failed attempts retained

The final successful evidence does not erase earlier executed failures:

1. Sandbox socket/DNS restrictions blocked initial diagnostics/server/browser startup. Scoped permission retries were used; no blanket permission changes were made.
2. `bug01-entry.json`: **4 passed, 1 failed, 10 unexecuted**, exit 1. The new live test used an ambiguous label during cached auth-page navigation. It now scopes fields to the visible form; no registration occurred in that attempt.
3. `bug01-entry-rerun.json`: **4 passed, 1 failed, 10 unexecuted**, exit 1. Real registration returned 403 against the pre-existing port-8000 process. The isolated test listener resolved the origin/configuration mismatch without changing that service or weakening security.
4. `bug01-entry-isolated.json`: **4 passed, 1 failed, 10 unexecuted**, exit 1. Registration and account creation succeeded, but the test inspected the redirect request's abbreviated headers. It now asserts the idempotency header from the original browser request's `allHeaders()`. The created records were retained; assertions were not removed or weakened.

The 15-case successful run was executed after those corrections with automatic retries disabled.

## Modified-file inventory

All paths below are relative to `/home/lucifer/Desktop/kivo`:

**Application source (nine modified files):**

- `kivo-frontend/src/app/page.tsx`
- `kivo-frontend/src/app/dashboard/page.tsx`
- `kivo-frontend/src/components/layout/AppHeader.tsx`
- `kivo-frontend/src/components/layout/AppNav.tsx`
- `kivo-frontend/src/features/auth/components/LoginForm.tsx`
- `kivo-frontend/src/features/auth/components/RegisterForm.tsx`
- `kivo-frontend/src/features/auth/navigation.ts`
- `kivo-frontend/src/features/auth/session.tsx`
- `kivo-frontend/src/proxy.ts`

**Unit/component tests (four modified, one new):**

- `kivo-frontend/src/test/api/auth-transport.test.ts`
- `kivo-frontend/src/test/api/server-auth.test.ts`
- `kivo-frontend/src/test/app.test.tsx`
- `kivo-frontend/src/test/features/auth/RegisterForm.test.tsx`
- `kivo-frontend/src/test/features/auth/entry-flow.test.tsx` — new

**Browser verification (four modified, three new):**

- `kivo-frontend/e2e/django_server.py` — optional isolated loopback port
- `kivo-frontend/e2e/part1-live.spec.ts` — registration now navigates automatically
- `kivo-frontend/e2e/phase1.spec.ts` — obsolete showcase expectations replaced with real entry checks
- `kivo-frontend/e2e/phase2.spec.ts` — public-page tests explicitly start anonymous
- `kivo-frontend/e2e/entry-errors.spec.ts` — new
- `kivo-frontend/e2e/entry-live.spec.ts` — new
- `kivo-frontend/playwright.entry.config.ts` — new

**Report (one new):** `docs/fixes/bug-01-application-entry-flow.md`.

Final inventory: **17 modified tracked files and five new files**. Generated build/browser/runtime artifacts remain ignored; no required source exists only outside the repository. No files were staged, committed or reset.

## Remaining limitations and final decision

**Bug 01: VERIFIED** for the tested development entry/authentication/onboarding/dashboard flow. Backend-unavailable behavior is supported by explicit fault-injection tests, not a claim that the previous network instability has been resolved. The separate Part 6 recovery remains governed by its existing report and is not promoted to VERIFIED here. Broad financial regression, deployed HTTPS behavior and natural fourteen-day session expiry were not revalidated in this focused fix.

No subsequent bug, integration phase or production-release hardening was started.
