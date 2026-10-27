# Deployment and rollback runbook

**PREPARED / NOT DEPLOYED.** Hosting, domains, certificates, service account,
production secrets and tool installations are not approved/provided. Files under
`deploy/` are reviewable templates with `.invalid` placeholders. No infrastructure,
DNS, service installation, port exposure or package change occurred.

## Proposed portable host

Use the existing Python environment and synchronous Gunicorn WSGI configuration
in [gunicorn.conf.py](../../deploy/gunicorn.conf.py), managed by the prepared
[systemd unit](../../deploy/kivo-backend.service.example). It binds loopback,
uses two workers without preloading DB connections, graceful termination,
bounded restarts and worker recycling. The unit runs as a dedicated unprivileged
account with a read-only filesystem and private temporary space. Confirm that
account can traverse the original repository and read the environment and CA.
Do not relocate source to work around permissions.

Gunicorn is absent. nginx and PostgreSQL client tools are absent. Select and
approve compatible pinned versions before installation; no speculative version
was added to requirements. The actual systemd validator exits 1 because the
Gunicorn executable is missing. It did not install/start anything. `nginx -t`
and actual server startup remain BLOCKED, not passing static checks.

## Configuration and compatibility

Use [backend.env.example](../../deploy/backend.env.example) as an operator
checklist, not a usable secret file. Production does not load development `.env`.
Inject secrets through the approved host secret facility or root-owned mode-600
systemd EnvironmentFile. Never place a database URL in argv, Git or browser
configuration. Maintain separate versioned runtime and migration secrets.

Replace both `.invalid` hosts/certificate paths in
[nginx.conf.example](../../deploy/nginx.conf.example). Proposed browser topology:
HTTPS web host sends `/api/v1/` directly to Django and other paths to Next;
Next server-side reads use the HTTPS API host via server-only `DJANGO_API_ORIGIN`.
`ALLOWED_HOSTS` contains both actual hosts; CSRF trust contains the actual HTTPS
web origin. Browser sessions remain host-only, Secure, HttpOnly, SameSite=Lax;
CSRF token remains readable for the existing header integration. No browser CORS
is needed. Preserve the Next page/proxy/session behavior.

This routes around the Next API bridge at ingress while preserving the public
session/JSON/CSRF/idempotency contract. It permits Django's own implemented API
routes rather than the bridge's narrower allowlist. Review that exposure and
verify unsupported methods/unknown paths before activation. Keep the existing
development bridge available; no frontend source was modified.

The sole loopback ingress replaces forwarded IP/proto headers. Gunicorn trusts
scheme headers only from loopback. `AUTH_TRUSTED_PROXY_HOPS=1` is appropriate
only with that exact boundary. Firewall workers and the Next port against direct
access. nginx IP zones are shared across its workers, with no upstream financial
retries; they are not shared across multiple nginx replicas. Validate original
client addresses, spoofed headers, rate limits from two clients and multiple
workers. Do not enable proxy trust on an unreviewed hosting topology.

Public admin/docs/redoc/schema and DB-readiness are denied by the template;
operator access needs an explicitly secured tunnel/configuration. Liveness stays
available; database readiness runs from loopback over the HTTPS API host. Static
admin files need a reviewed `collectstatic`/restricted static-serving setup if
admin is enabled. The template serves neither admin nor its static files publicly.

nginx access logs omit IPs, URLs, queries and headers; application JSON logs carry
request IDs, status and SQL timing without SQL values/bodies. Standard nginx
error messages can expose queries, so its template records only critical errors;
status metrics and sanitized Django diagnostics must cover upstream failures.
Confirm this observability tradeoff and private retention with the operator.

## Approved-host validation before cutover

1. Record source revision, runtime versions and secret versions privately; check
   host paths/users/firewall/certificates and production environment completeness.
2. Run real production `manage.py check --deploy --fail-level WARNING`, migration
   plan and least-privilege audit with that host's actual environment. Synthetic
   configuration checks in this pass are not substitutes.
3. Confirm backup/recovery evidence and independently approved staging database.
   Rehearse helper migration/role policies, then run the entire pytest suite with
   the explicit target opt-in and actual PostgreSQL. A `test_` name alone is not
   isolation authorization; setup can create/migrate/flush/drop the named DB.
4. Run `nginx -t`, `systemd-analyze verify` and a real Gunicorn start/stop/restart.
   Confirm HTTPS requests do not redirect-loop, HTTP redirects, invalid hosts
   fail, secure cookies survive the proxy and readiness fails safely on outage.
5. Run browser registration/login/session reload/logout, old-cookie invalidation,
   bad-origin/missing-CSRF writes, cross-user resources, admin/docs denial and
   shared auth throttling. Run full financial workflows, including original-key
   recovery after lost delivery, friend-paid rent reserve reductions and CSV.
6. Use identifiable staging-only users and small synthetic amounts for load.
   Record dataset size, geography, worker/connection count, warmup, concurrency,
   throughput, p50/p95/p99/max, status/error rate, query counts, lock waits,
   database CPU/I/O/connections, stream completion and peak memory. Exercise
   dashboard/report/large CSV and concurrent writes to same/different owners.
   Compare writes with the existing 30-second frontend budget. Stop on ambiguous
   failures; reconcile original keys before proceeding. Agree on SLOs with the
   operator first. No production capacity number is inferred from SELECT probes.
7. After all seven release gates pass, obtain cutover authorization, apply only
   approved production migrations with migration credentials, start the runtime
   service with least-privilege credentials and perform approved smoke checks.

## Rollback and incidents

Keep the previous application artifact and compatible schema/secret versions.
Stop cutover or drain writes on a failed health/security/financial gate. Roll back
the application revision and restart with a reviewed compatible private runtime
credential; keep journal data, retry receipts and restrictive helper ACLs intact.
The helper migration has no automatic reverse and changes no function bodies.
Do not run blanket backward migrations or restore a database as routine rollback.

For HTTP timeouts/503, retain request ID, operation/key and exact body privately.
Check committed event/retry receipt before any replay. Reuse the original key
and identical payload through the supported recovery flow; never compensate
with direct balance edits. Capture lock/session/network/query timings during
recurrence. Preserve evidence and stop affected mutating tests on degradation.
For outages inspect liveness vs readiness, pool/connection limits, DNS/TLS,
sanitized failure class and provider status. For suspected compromise isolate
ingress and involve the operator before approved secret rotation. Restore only
to an authorized isolated target using the recovery runbook.
