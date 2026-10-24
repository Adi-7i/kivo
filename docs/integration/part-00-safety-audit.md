# Integration Part 0 — safety audit

Current decision: **GO under the project owner's development-database authorization**; see the appended recovery section. The initial NO-GO checkpoint below is preserved as history.

Date: 2026-10-22. Decision: **NO-GO**. Part 0 audit: **VERIFIED** to the limits below; staging isolation and browser verification: **BLOCKED**. Part 1 implementation has not started.

## Repository and preservation

| Check | Observed evidence |
| --- | --- |
| Original working directory and Git root | `/home/lucifer/Desktop/kivo`; `pwd` and `git rev-parse --show-toplevel` agree. |
| Original frontend | `/home/lucifer/Desktop/kivo/kivo-frontend`; its Git root is the same parent repository. |
| Actual backend | `/home/lucifer/Desktop/kivo/backend`; existing interpreter `backend/.venv/bin/python` reports Python 3.14.4. |
| Case discrepancy | The uppercase `/home/lucifer/Desktop/Kivo` in the root instructions does not exist. The latest user instruction and actual lowercase repository identify the authorized workspace. |
| Initial Git state | Clean, including untracked files. Initial branch `INTIGRATION`; other branches `frontend`, `main`. Baseline commit `ed53bff` (`Add category management UI, transaction action modals, and verification docs`). |
| Dedicated branch | `integration/part-00-auth-onboarding`, created from that baseline. The sandbox denied the first Git ref write (exit 128); the approved, scoped retry succeeded (exit 0). |
| Writability | Original frontend, `src`, and root `docs` pass `test -w`. `.git` is sandbox-protected; its permission failure was not a source-directory failure. |
| Workspace preservation | No repository copy, new worktree, reset, checkout of files, cleanup, dependency installation/upgrade, backend edit, or database mutation was performed. |

Read root and frontend `AGENTS.md`, root/frontend READMEs, frontend architecture and phase reports, both coverage/readiness copies, backend authentication ADR, technology ADR, security/operations procedures, and backend Phase 7/release gates. The named Final Development Suite, Technology Blueprint, and PRD were not found as tracked documents; no missing contract was inferred from their titles.

## Actual authentication and account contracts

These are **VERIFIED by source inspection and freshly generated OpenAPI**, not by live staging requests. Sources: `backend/config/urls.py`, `apps/users/{urls,views,serializers,services,models,managers}.py`, `common/authentication.py`, `common/exceptions.py`, `apps/ledger/{urls,views,serializers,services,selectors,money}.py`.

| Method and path | Request | Confirmed response/behavior |
| --- | --- | --- |
| `GET /api/v1/auth/csrf/` | No body | 200, `{"detail":"CSRF cookie set."}`; sets `csrftoken`, no token in response JSON. |
| `POST /api/v1/auth/register/` | `email`, `password`, optional `name` | 201 public profile. Does **not** log in. CSRF required even anonymously. Duplicate email/invalid password returns 400; registration throttle 3/minute. |
| `POST /api/v1/auth/login/` | `email`, `password` | 200 public profile; Django establishes/rotates the session and CSRF state. Invalid credentials return 400, not 401. CSRF required even anonymously; throttle 5/minute. |
| `GET /api/v1/auth/me/` | Authenticated session | 200 public profile; missing/expired session returns 401 with `WWW-Authenticate: Session`. |
| `POST /api/v1/auth/logout/` | Authenticated session and CSRF; no body | 204; Django flushes the session. Unauthenticated request returns 401; missing CSRF on an authenticated write returns 403. |
| `GET /api/v1/accounts/` | Authenticated session; optional `page` | Paginated `{count,next,previous,results}` with page size 20, scoped to the current user. Includes archived accounts; there is no verified onboarding-completion flag. |
| `POST /api/v1/accounts/` | Authenticated session, CSRF, `Idempotency-Key`; `name`, `kind`, `opened_on`, optional `opening_balance` | 201 on creation, 200 on identical owner-scoped key replay, 409 on conflicting key reuse. Atomic account/opening posting. |

Public profile: `id` (integer), `email`, `name`, `date_joined` (timestamp). No profile PATCH/PUT endpoint, preferences endpoint, password-change endpoint, or `onboarding_completed` field exists in the inspected implementation. Registration name is optional/blank with maximum 150 characters; email maximum is 255. Passwords preserve whitespace and require at least 10 characters, rejection of common/numeric passwords, and similarity checks against email/name. Django does not impose the frontend's specific letter-plus-number rule.

Account input: name maximum 100 characters; `kind` is `cash`, `bank`, or `wallet`; `opened_on` is a real ISO date; opening balance defaults to `"0.00"`. Unknown account input fields are rejected. Account output: UUID `id`, `name`, `kind`, `opened_on`, `archived`, `created_at`, `balance`, `opening_balance`. Monetary JSON values are **exact INR strings with exactly two decimal places**, e.g. `"120.50"`; JSON numbers/paise integers are rejected. The server converts to integer paise internally (maximum 9,000,000,000,000,000). Nonzero opening funds create an `opening` event, not an income/receipt event. Zero opening funds do not create an artificial event.

Account replay returns the account object again; it does not add a `replayed: true` property. Duplicate names return a validation error. Durable write receipts and owner locking implement account creation idempotency. A later integration must retain the original key and exact body after ambiguous failures, reconcile owned account state, and require deliberate recovery; no automatic account POST retry is authorized.

Expected validation/error envelope:

```json
{"error":{"status_code":400,"type":"validation_error","details":{"email":["..."]}}}
```

401 uses `authentication_required`; 403 uses `permission_denied`; 404 uses `not_found`. Other DRF errors, including 409/429, use the envelope and their actual status; throttling can include `Retry-After`. Unexpected errors use `error.message`; database failures are sanitized 503. The existing frontend normalizer expects top-level `detail`/field arrays and does not unpack this actual nested envelope.

## Route inventory cross-check

**VERIFIED:** Django resolver traversal and newly generated/validated OpenAPI 3.0.3 independently yield **68 `/api/v1/` paths and 84 method/path operations**, excluding automatic HEAD/OPTIONS, admin, and schema/docs routes. The previous claim of 52 endpoints is incorrect.

| Group | Paths | Operations |
| --- | ---: | ---: |
| Health | 2 | 2 |
| Authentication | 5 | 5 |
| Accounts | 3 | 5 |
| Categories | 3 | 5 |
| Transactions | 5 | 6 |
| Funds | 6 | 6 |
| Contacts | 3 | 5 |
| Claims | 3 | 3 |
| Loans | 4 | 5 |
| Settlements | 4 | 5 |
| Shared bills | 4 | 5 |
| Rent | 18 | 22 |
| Budgets | 2 | 4 |
| Dashboard | 1 | 1 |
| Reports | 5 | 5 |
| Total | 68 | 84 |

Before corrections, the coverage table documented 83 unique operations across the same 68 paths. Normalizing UUID placeholder names and comparing against generated schema found exactly one omitted operation: `GET /api/v1/categories/{id}/`. No documented method/path was absent from the actual API. This verifies route existence, not the claimed completeness of UI behavior or request-field compatibility. Other inaccurate coverage notes included account color/icon updates, profile preferences, integer API amounts, and top-level error envelopes. Both coverage/readiness copies now carry corrections.

OpenAPI was generated from the original backend into the permitted temporary artifact `/tmp/kivo-integration-part00-openapi.yaml`. Existing `openapi-typescript` is available as a declared dependency; no generated frontend client/types were introduced before the safety gate.

## Environment and database isolation

**Critical blocker — BLOCKED:** loading the existing environment and Django settings without connecting shows `config.settings.development`, `DEBUG=True`, PostgreSQL on a remote Supabase host, application database name `postgres`, and `sslmode=require`. The database host, role, password, DSN and secret key values were not printed. Development settings and a loopback API hostname do not establish that the database is non-production.

Only `SUPABASE_DB_URL` is set among the inspected database/staging/test/public-API variables. No staging frontend environment file exists, no `NEXT_PUBLIC_API_URL` override is set, and no `KIVO_TEST_DATABASE_NAME` override is set in this process. Django's derived default pytest database is `test_postgres`, different from `postgres`; no explicit `TEST.NAME` or mirror is configured. The pytest fixture can select `KIVO_TEST_DATABASE_NAME` and guards PostgreSQL/remote host/test-name isolation **only during pytest setup**. It does not redirect `runserver`, WSGI, ASGI, or browser traffic.

Existing operations/Phase 7 records describe a historical `test_kivo_phase07` database. Its current existence, credentials, migrations, accessibility, record isolation, and suitability for this integration were **NOT VERIFIED**. No database was created, migrated, flushed, queried, or mutated during this audit. A historical test-database reference is not evidence of a currently configured staging application server.

The frontend defaults to `http://localhost:8000`. No source call sites invoke the API client today; the only native fetch is inside the unused transport. Once wired, that default can reach a Django process using the existing remote application database. The client also accepts arbitrary absolute endpoints and has no staging-target restriction. Therefore prevention of accidental production writes is **NOT VERIFIED**, and registration/account creation/live integration tests were not attempted.

## Security configuration and frontend findings

- **VERIFIED, configuration only:** allowed hosts are `127.0.0.1` and `localhost`; trusted CSRF origins are `http://localhost:3000` and `http://127.0.0.1:3000`. The Playwright frontend origin is port 3001 and is not in that list.
- **VERIFIED, source/configuration:** Django DB-backed sessions; session cookie HttpOnly, SameSite=Lax, default age 14 days. CSRF cookie is readable by browser JavaScript and SameSite=Lax. Both cookies are host-only; development Secure flags are false. Production settings enforce secure cookies, HTTPS, explicit hosts/origins and no debug. No deployed HTTPS/cookie behavior was verified.
- **VERIFIED:** no CORS middleware/configuration is installed. Direct cross-origin browser JSON/CSRF requests to port 8000 are not supported by the current backend. `credentials: include` alone is insufficient. ADR-007 specifies same-origin ingress. A later integration should use a narrowly scoped same-origin Next.js proxy/ingress, preserving Django cookies, rotated CSRF token, origin enforcement and private/no-store responses. This is an architectural recommendation pending topology/staging verification; no proxy was implemented.
- **VERIFIED:** root `.env` is ignored, untracked, and mode 600. Frontend `.env*` files are ignored except the example. Only example environment files are tracked. Root `.env.staging`/`.env.test` are not covered by the current root ignore patterns; any future secret file there needs an explicit ignore rule before creation. No secret file was added.
- **VERIFIED, inspected source/environment:** the sole `NEXT_PUBLIC_*` reference is the public API URL; no public database credentials or Supabase keys were found in that surface. No localStorage/sessionStorage authentication or sensitive form logging was found. Browser-bundle secret inspection is **NOT VERIFIED** because the production build did not complete.
- **VERIFIED, existing UI:** registration/login and final onboarding only wait briefly and display integration-pending notices. Profile is unconnected. No real session provider, authenticated query, protected-route enforcement, or logout flow exists. TanStack Query uses one provider-owned client, one retry for eligible queries, and no mutation retries; cross-user private-cache clearing still needs implementation.
- **VERIFIED, existing validation mismatch:** registration currently accepts eight-character passwords and requires a letter/number. Onboarding amount validation uses `parseFloat`, despite the earlier financial audit claim, and validates dates only by shape. These are pre-existing findings for a later authorized Part 1 after GO; no source was changed to bypass the gate.
- **Historical, NOT REVERIFIED:** backend operations report administrative/table-owner database credentials and open production release gates. No restricted staging runtime role or live permission enforcement was verified here. These historical observations were not promoted to fresh database evidence.

Existing backend tests inspected include `tests/test_auth.py`, `tests/test_auth_security.py`, `tests/test_security_hardening.py`, `tests/test_schema.py`, account/owner-isolation tests and the real HTTP financial suite. They cover registration validation, session rotation, CSRF, expiry/logout and ownership, but were not executed against an unverified database environment. Existing Playwright tests verify preview UI and explicitly expect pending integration; they are not Django integration tests.

## Executed baseline checks

Frontend commands ran in the original `kivo-frontend`, with existing Node v24.21.0 and pnpm 12.10.1. No application source changes preceded these checks.

| Command | Exit | Observed result |
| --- | ---: | --- |
| `pnpm typecheck` | 0 | **VERIFIED**; TypeScript passed. |
| `pnpm lint` | 0 | **VERIFIED**; zero errors, three pre-existing `react-hooks/incompatible-library` warnings in `BudgetModal.tsx`, `CategoryModal.tsx`, `CreateSharedBillModal.tsx` for RHF `watch()`. |
| `pnpm test` | 0 | **VERIFIED**; 45 test files, 200 tests passed; 53.17 seconds. Unit/component tests, not real Django integration. |
| `pnpm build` (sandbox) | 1 | **FAILED**; Turbopack could not write `/page`, tracing to `globals.css`, creating a process/binding a port: `Operation not permitted (os error 1)`. |
| `pnpm build` (approved permission retry) | 1 | **FAILED** with the same process/port restriction. No successful build or route count is claimed. |
| `pnpm test:e2e --workers=2` (sandbox) | 1 | **FAILED**; configured webServer could not start. |
| `pnpm test:e2e --workers=2` (approved permission retry) | 1 | **FAILED**; webServer explicitly reports no production build in `.next`. No browser tests ran. |
| `pnpm exec playwright test --list` | 0 | **VERIFIED collection only**; 190 tests in six files, desktop Chromium and Mobile Chrome. |
| `backend/.venv/bin/python backend/manage.py check` | 0 | **VERIFIED**; no system-check issues. Does not establish a DB connection. |
| `backend/.venv/bin/python backend/manage.py spectacular --validate --file /tmp/kivo-integration-part00-openapi.yaml` | 0 | **VERIFIED** generation/validation; 68 paths, 84 operations. Not a live API test. |
| Resolver enumeration and schema/coverage set comparison | 0 each | **VERIFIED**; route counts agree, missing category GET identified. |
| Sanitized environment/settings inspection | 0 | **VERIFIED** configuration observations above; no network/DB connection. |
| `git diff --exit-code -- backend tests pyproject.toml requirements.lock kivo-frontend/src kivo-frontend/package.json kivo-frontend/pnpm-lock.yaml` | 0 | **VERIFIED**; these source/dependency paths remain unchanged. |

Package-manager stream-FD permission warnings occurred during sandbox runs; passing exit codes above were observed despite those warnings. The failed build's temporary panic logs identify the process/port denial. These are baseline execution-environment failures, not integration-induced regressions. The earlier Phase 7 claims of a successful production build and 190 browser passes are historical and were not reproduced in this audit. No tests were skipped, suppressed, or changed to obtain passing results. No real staging authentication/onboarding tests ran.

## Gate decision and exact prerequisites

**NO-GO — Part 1 BLOCKED.** The staging/application database boundary is not verified. Build/browser verification is also blocked. A working frontend test suite does not satisfy database isolation.

Before rerunning this gate:

1. An operator must identify an authorized non-production PostgreSQL target and provide backend-only credentials scoped to that target. An existing isolated database may be used after verification; no new infrastructure or production-credential provisioning is authorized by this audit. Verify database identity, required migrations and test-record ownership through that target without copying production financial records.
2. Configure a dedicated Django integration process so **its actual default database** is the approved staging database, using existing environment mechanisms; keep the existing application `.env` untouched. `KIVO_TEST_DATABASE_NAME` alone is insufficient for a running server. Record the staging API origin and ensure the frontend/proxy can reach only that intended integration target.
3. Confirm the same-origin routing topology and explicit host/CSRF origins for both development and Playwright. Configure staging secure-cookie behavior to match its actual HTTP/HTTPS topology. No backend source changes or weakened security checks are needed or authorized here; cross-origin deployment would require separate backend authorization.
4. Provide a runner that permits the existing Turbopack build's required child-process/port operations. Then rerun the unchanged production build and Playwright baseline; if another error appears, diagnose it from that new evidence.
5. Rerun the safety audit, establish GO, then implement only authentication, read-only profile and initial account onboarding. Profile/preference mutations remain unsupported. Real staging tests must verify session/cookie/CSRF behavior, logout/cache isolation and exact opening balances.

The current user request already conditionally authorizes Part 1 after GO; this report does not add another approval requirement. **Integration Part 2 is not authorized and has not begun.**

## Final change boundary

All final edits are documentation in this original repository: this audit, the blocked Part 1 status report, both `integration-readiness.md` copies, and both `backend-api-frontend-coverage.md` copies. Backend/frontend source, design tokens, typography, dependencies, environment files, financial records and tests remain unchanged. No commit or push was performed.

Final review: `git status --short` identifies exactly six documentation files (two new reports, four updated documents). `git diff --check` exits 0. The source/dependency/configuration diff check exits 0 with no changes. Recomparison of each corrected coverage table against generated schema exits 0 with 84/84 operations, 68 paths, and no missing/extra routes. Coverage mirrors match; readiness mirrors agree after accounting for their relative audit links. Git root remains `/home/lucifer/Desktop/kivo` on `integration/part-00-auth-onboarding`.

## Recovery decision — approved development database (2026-10-22)

The project owner subsequently confirmed that the configured Supabase `postgres` database is exclusively for Kivo development, currently has no user/financial data, and is authorized for identifiable registration/session/initial-account integration tests through supported application workflows. This supersedes the historical staging prerequisite above. No additional staging database or further ordinary test-record approval is required. Destructive resets, schema changes and unrelated financial workflows remain prohibited.

Fresh sanitized settings inspection verified `config.settings.development`, PostgreSQL database `postgres`, a configured remote host and `sslmode=require`. The initial sandbox connection failed; the scoped network-permission retry connected successfully with `default_transaction_read_only=on` and `statement_timeout=10000`. Executed `SELECT current_database(), current_setting('transaction_read_only'), 1` returned `postgres`, `on`, `1` (exit 0), without printing credentials or financial data.

**Recovery gate: GO for Part 1 implementation and scoped development-database tests.** Database separation is no longer a blocker. Build/browser execution may remain restricted and must be reported separately; it does not block safe implementation under the latest instruction. The established session/CSRF/ownership contracts remain unchanged. Existing audit history above is retained as the earlier checkpoint, not the current gate decision. No schema/migration/reset/cleanup operation is authorized or planned.

### Runner recovery and real verification observations

An ephemeral loopback bind fails with `EPERM` in the sandbox and succeeds in the approved execution context. Running the installed Next.js CLI directly with Node in that context succeeds: `node node_modules/next/dist/bin/next build`. No root access, blanket chmod, global security changes, dependency changes, or repository copy was used. Playwright likewise runs through its installed Node CLI with scoped browser/network permission; its webServer command now uses the installed Next.js Node entrypoint.

The development Django process was started using existing source/settings/database, with explicit process-local `CSRF_TRUSTED_ORIGINS` for localhost/127.0.0.1 ports 3000 and 3001. It performed no migration/reset. A narrow Next.js bridge preserves the browser Origin and Django cookie/CSRF enforcement. Production Secure cookie flags were not weakened or rewritten.

The first real browser regression executed all 175 collected cases: **165 passed, 10 failed**, exit 1. Failures exposed long-identity mobile overflow and a lifecycle timeout; subsequent bounded diagnostics identified inactive Next.js cached forms matching unscoped labels. Header/profile wrapping and active-form selectors were corrected. A focused real lifecycle then **passed (1/1, 59.5s; overall 1.3m)**, including registration, login, account creation, exact opening funds, idempotent replay/conflict, CSRF, ownership, restoration, logout, user switching and invalid-session handling. These are actual Django/PostgreSQL results, distinct from mocked HTTP tests.

A separate focused attempt's fixture received HTTP 503 while Django subsequently logged a committed account creation/201 at **12,372 ms**, exceeding the bridge's 12-second deadline. The write was not retried. The fixture now explicitly reconciles an ambiguous response using only owned-account GETs, with exact account-name/opening-balance checks; it never automatically replays a financial POST. This observed latency/commit ambiguity remains a real operational consideration, not proof of rollback or a reason to weaken security.

Development records use `kivo-integration-<run>-a/b@example.test`, `Kivo Integration A/B <run>`, and `Integration baseline/opening <run>` labels. Repeated verification attempts retain their identifiable records. No unrelated user/financial record, schema, migration, role, or database was changed. Fixture session artifacts are Git-ignored, with directory mode 700/file mode 600; browser authentication traces are disabled to avoid credential capture.

The final consolidated Part 1 report records final reruns, file inventory, remaining limitations and the current completion decision. Historical statements that only six documentation files changed apply exclusively to the initial audit checkpoint.

### Sustained-run connection diagnosis and scoped recovery

A later full browser run completed **136 passed / 39 failed (175 cases, 7.0m, exit 1)**. The real Part 1 lifecycle passed in that run (52.7s); later failures were actual session-verification 503 pages. Sanitized Django logs showed `OperationalError` in `MeView`, often before any recorded SQL execution. A separate read-only connection also failed temporarily; a later read-only `SELECT 1` succeeded. The exact provider rejection message was not retained or printed, so no specific provider error code is invented.

The existing read-only `diagnose_database --samples 2` then connected with real TLS and reported database `postgres`, `max_connections=60`, and 40 idle client sessions, pooling disabled, connection max age 600 seconds, health checks enabled. After stopping only the task's Django process and restarting it with `--noreload --nothreading`, the same diagnostic showed four idle client sessions. These observations support connection pressure as a contributor; they do not establish a production capacity limit or a complete provider root-cause analysis.

Recovery changes are scoped to the existing frontend and development runner: private AppNav links disable speculative prefetch, and session observers share a verified identity for ten seconds rather than duplicating immediate reads. Server/API authorization still checks Django, session focus/periodic/change verification remains, and private caches clear on identity changes. The development server uses a single thread to bound retained connections without changing Django settings/source, database pooling, grants, roles, schema, TLS or timeouts.

Assertions and authentication checks were not relaxed. Returning-user browser checks now await the actual accounts GET and assert its 200 result before asserting navigation, distinguishing a pending check from a failed redirect. The final report records the complete rerun after these changes.

### Final recovery sign-off

The bounded-server parallel reruns completed 173/175 and then 174/175 cases; remaining failures observed pending account/session loading while other browser cases wrote to the single-threaded backend. The final configuration matches that development runner with **one Playwright worker**. Final complete regression: **175 passed / 0 failed / 0 skipped in 7.9m, exit 0**, including the real registration/session/onboarding/CSRF/ownership/logout/user-switching lifecycle and desktop/mobile UI checks.

Final accompanying gates: **236/236 unit/component tests in 48 files passed**, TypeScript exit 0, ESLint exit 0 with three existing warnings, production build exit 0, Django check/schema validation exit 0, corrected API inventory comparison exit 0, secret-bundle scan exit 0 and Git whitespace/unchanged-backend checks exit 0. No skipped assertion, weakened security setting, financial POST auto-retry, schema/role/dependency change or destructive cleanup was used.

**Current Part 0 decision: GO. Part 1: IMPLEMENTED and VERIFIED on the owner-approved development database.** Production concurrency/HTTPS/least-privilege deployment remains outside this sign-off; the earlier connection/latency evidence is retained. All 50 changed/new files exist in the original repository. Full file inventory, exact commands/results, test-data policy and remaining product limits are in the Part 1 verification report. Part 2 remains unauthorized.
