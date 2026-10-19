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
