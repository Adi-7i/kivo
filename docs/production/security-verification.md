# Security verification — 2026-10-27

**PARTIALLY COMPLETE.** The configured database role fails the production gate.
Fresh deployed-origin authentication and full database security regression are
blocked. Full command results are indexed in [the release report](final-release-report.md).

| Control | Evidence and current limit |
| --- | --- |
| Identity and password validation | Existing canonical lower-case email lookup, secure Django hashing, minimum 10 characters, common/numeric/similarity validation against email/name, safe profile field allowlist. Actual CI race/session tests need authorized PostgreSQL. Live index exists and has zero duplicate groups. |
| Registration/login/logout | Existing session protocol preserved. Login delegates rotation and CSRF rotation to Django; logout flushes the stored session. Fourteen-day server expiry, HttpOnly session, SameSite=Lax, host-only cookies. Password fields remain write-only. Persistence/expiry/invalidation verification is pending in the full suite. |
| Browser CSRF | Anonymous register/login explicitly CSRF protected; authenticated writes use session CSRF. Unit tests verify anonymous rejection/error envelope. Trusted origins alone do not enable CORS. No CORS middleware or wildcard policy was added. |
| HTTPS/proxy | Production rejects DEBUG, weak secrets, wildcard hosts, insecure origins and disabled redirect. Secure cookies/HSTS retained. Gunicorn scheme trust is loopback-only; Django does not blindly trust forwarded HTTPS headers. Actual TLS/proxy behavior remains unverified. |
| Abuse controls | DRF authentication throttles are process-local and non-atomic. Prepared nginx shared-memory client-IP zones work across workers of one ingress; actual nginx execution is blocked. Multiple ingress replicas would need a shared enforcement design. |
| Ownership and privilege | Owner-scoped selectors and service lookups retained. Cross-user/IDOR and concurrency test cases remain in the suite; current isolated frontend tests are not live authorization evidence. Runtime DB role is still overprivileged. |
| Admin/docs | Production schema/docs require authentication in existing entrypoint unit checks. Proposed ingress denies public admin/schema/docs/redoc and readiness; actual exposure must be tested. Development defaults intentionally differ. |
| Errors and logs | Existing uniform JSON errors, request IDs, no-store responses, sanitized DB diagnostics, exception class without arbitrary exception text, and ambiguous-commit guidance retained. Nginx template omits sensitive URL/header/body fields from access logs. |
| Secrets | Existing `.env` ignored and mode 600; no secret edits. Scanner checks configured private values in current non-ignored source and actual built browser JS; see final counts. It does not certify Git history, arbitrary unknown secrets, deployed bundles or third-party logs. |

## Fixed configuration defects

Existing unreadable secret files fail explicitly without including exception
text. Database URL TLS root certificates are preserved; ambiguous/empty TLS
options are rejected. TLS encryption was observed live, but current
`sslmode=require` does **not** establish hostname/certificate verification.
Validate the official CA and `verify-full` on the actual host before release.

The privilege gate now checks effective schema/database DDL access, forbidden
table/column mutations and privilege-flag updates. Unit tests inject one unsafe
privilege at a time and verify a nonzero result. These mocks are unit control-flow
evidence; the separate remote audit supplies actual privilege evidence.

## Open release-blocking findings

1. **High: runtime least privilege fails.** Two administrative memberships,
   36 owned tables and effective forbidden mutation privileges. No role or grant
   was changed. Actual production role credentials remain unavailable.
2. **Backend-only function privacy fails.** Supabase client-role EXECUTE remains
   on `kivo_expected_postings(bigint)`. The function is an invoker, and client
   table/sequence grants are revoked; no data disclosure exploit is claimed.
   Prepared `ledger.0009_private_financial_helpers` fixes grants only after
   approved application. Runtime EXECUTE must be explicitly granted.
3. **Deployment-dependent controls unverified.** Real HTTPS, cookies/CSRF,
   original-client shared throttling, firewall, admin/docs and log retention
   require staged validation. No public deployment occurred.

The deployment proposal preserves URLs, JSON, cookies, CSRF and idempotency. It
routes browser `/api/v1/` requests directly through nginx to Django while Next
serves pages and retains its existing server-side Django reads. This avoids
collapsing all bridge users into one backend throttle peer. It is a proposed
ingress routing configuration, not an authentication-protocol replacement.
Do not activate it until the compatibility workflow matrix in the runbook passes.

[Django's proxy-header requirements](https://docs.djangoproject.com/en/6.1/ref/settings/#secure-proxy-ssl-header)
require a trustworthy proxy boundary. Do not set `AUTH_TRUSTED_PROXY_HOPS=1`
unless the sole ingress replaces X-Forwarded-For and direct worker access is blocked.
