# ADR-007: Authentication identity and production security boundaries

Status: Phase 7 implementation; executed results and open release gates are in
[verification](../phases/phase-07-verification.md). This ADR does not authorize
deployment, dependency installation or production database changes.

Email identity is case insensitive across manager normalization, login lookup
and a PostgreSQL unique `lower(email)` index. Existing identities are never
automatically merged. Only known identity uniqueness failures become duplicate
registration validation errors after atomic rollback. Password validation receives
the proposed user; password whitespace is part of the secret and is preserved.

Django DB sessions remain the sole API authentication mechanism. Anonymous login
and registration require CSRF; login rotates session/CSRF state, and logout removes
the server-side session. No tokens, OAuth, password reset or alternate identity
provider is introduced. Authentication responses and all financial API responses
are private/no-store.

Authentication throttles cover anonymous and authenticated callers. The default
uses the peer address and ignores untrusted forwarded headers. A single trusted
ingress hop is an explicit production setting after the backend is isolated and
the ingress overwrites forwarding headers. DRF cache limits remain process-local
and non-atomic; shared edge limits are required before release.

WSGI/ASGI default to strict production settings; manage.py explicitly selects
development for local commands. Production rejects unsafe operator input rather
than silently relaxing HTTPS, host, secret or origin checks. No CORS middleware
is claimed; same-origin ingress is the current deployment contract.

Logs contain request IDs, committed financial resource IDs, error classes and
response-preparation timing. They do not evaluate lazy authentication or retain
arbitrary exception messages/tracebacks that can contain credentials. Health
probes bypass session loading. Sanitized JSON outage responses preserve the
distinction between response failure and unknown financial commit outcome;
durable original-key retries remain the recovery mechanism. Connection health
checks recover stale idle connections before a new operation, not by replaying
an uncertain financial write.

Financial recognition, FIFO v1/v2, integer-paise arithmetic, the owner-row lock,
retained friend-paid rent reserves and immutable audit history retain ADRs 003–006.
No accounting policy change was justified by the passing targeted financial audit.

A runtime database role must be separate from migration/admin credentials and
must pass the read-only database security audit plus actual workflows under its
RLS/grants. The configured role currently fails that production gate. Server
configuration and backup/restore procedures are prepared, but actual server boot,
ingress enforcement, least-privilege credential cutover and isolated restore are
external release gates. See [operations](../security-and-operations.md).

## Final blocker remediation (2026-10-19)

Request preparation logs now include bounded SQL execution count, total/max
duration and backend PIDs. Executions over one second produce a correlated
`database_query_slow` event. Statements, parameters, bodies and arbitrary exception
text are never retained. These timings exclude connection establishment, direct
driver health checks, commit/rollback and later streaming iteration; a gap between
SQL time and request time is not automatically CPU time. `diagnose_database`
separately measures DNS, connection initialization and SELECT round trips, and
reads actual wait events/blocker PIDs without query text or financial rows.

The existing owner-row locking and SQL/HTTP timeout settings are preserved. Historical
statement aggregates include a 42-second owner-lock execution, but cannot identify
the earlier failed HTTP request. This is a contention candidate, not proof of its
root cause. A real isolated PostgreSQL regression observes the lock, applies a
short timeout to that test session alone, verifies complete rollback/503 and then
durable same-key reserve creation/replay. No client deadline is raised and no
financial write is automatically retried.

A later full attempt correlated kernel-confirmed workstation suspend with stale
connections and a 959-second failed execution, independently observed on a
read-only connection. Actual client defaults used two-hour keepalive idle and no
TCP user timeout. Client keepalives now use idle/interval 5 seconds, count 3, and
10000 ms unacknowledged-data timeout. These are transport liveness controls, not
SQL deadlines; a real 12-second healthy query verifies that distinction. Actual
Linux socket values are checked. No server timeout or accounting rule changes.
Tests run under a temporary sleep inhibitor with recorded suspend-clock deltas;
production requires an always-on host. No permanent power configuration changes.
The earlier reserve timeout still lacks enough evidence for exact attribution.
Backend PIDs are captured before execution so libpq failure cannot replace their
diagnostic identity with zero.

The database release audit also checks effective client EXECUTE on directly
callable financial helpers. Trigger-only functions are not normal callable RPCs.
The existing invoker helper's public EXECUTE is an unnecessary exposed capability;
table ACL/RLS denial is still intact, so this is not evidence of data disclosure.

The prepared role rehearsal uses a fresh NOLOGIN, non-owner, non-administrative
role, operation-specific RLS policies, append-only journal grants, sequence USAGE,
users' password/last-login column updates (including Django password rehash), and
session deletion for logout. It grants no migration writes or schema/trigger
control, and does not transfer ownership of the 36 existing tables. New table
permissions require explicit review. Runtime and migration credentials remain
separate. The approval-gated probe targets only an isolated test database and
rolls back role/policy/grant/data changes; sequence gaps are possible. It does not
certify a new LOGIN principal, concurrent multi-connection operation, or live
credential cutover. Those remain separate authorized deployment gates.
