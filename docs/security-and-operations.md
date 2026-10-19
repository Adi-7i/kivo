# Kivo security, deployment and recovery procedures

These are reviewable procedures, not a claim that deployment, role provisioning
or restoration was executed. Current evidence and blockers are in
[Phase 7](phases/phase-07-verification.md) and the
[release gate](release/kivo-v1-release-readiness.md).

## Runtime and secrets

Use the established `backend/.venv` and verify its interpreter and locked
distributions before deployment. Do not recreate environments or install/change
packages without approval. Phase 7 uses Python 3.14.4; no Python 3.13 rebuild is
required. Gunicorn and PostgreSQL client tools are currently absent.

Production requires process environment variables; it does not load the local
development `.env`. Supply a generated secret of at least 50 characters, explicit
`ALLOWED_HOSTS`, `DEBUG=False`, `DJANGO_SETTINGS_MODULE=config.settings.production`,
and the authorized database URL through an operator-controlled secret store.
Keep secret files mode 600 and outside Git. Do not put DSNs/passwords in command
arguments, terminal captures, issue reports or request logs. Keep migration and
runtime database credentials separate. A deliberate secret rotation invalidates
sessions; coordinate client reauthentication and never publish either key.

Database transport must remain encrypted. The observed connection uses TLSv1.3
with `sslmode=require`; that observation does not prove hostname verification.
Validate `verify-full` and the server CA/root certificate with the actual hosting
environment before release. Never weaken TLS to work around DNS or timeouts.

## Runtime database privileges

The configured role is currently an administrative/table-owner role. Do not use
it for the production application. Provision a dedicated LOGIN role without
SUPERUSER, CREATEDB, CREATEROLE, BYPASSRLS, ownership, or membership permitting
administrative role switching. This is an approval-requiring infrastructure
operation; Phase 7 does not create roles or change grants automatically.

Grant only the backend's required table operations and sequence usage. Journal,
retry, FIFO snapshot and audit tables need SELECT/INSERT, not UPDATE/DELETE.
Accounts/categories, users, contacts, rent-plan active state and budgets need
their reviewed updates; Django sessions need deletion for logout. Schema changes
and `django_migrations` writes belong to the migration role. Do not give the
runtime role schema CREATE, TRUNCATE, sequence reset, trigger alteration or
permission to disable audit guards.

RLS defaults deny a new non-owner role: table grants alone will not make it work.
Create policies scoped only to the private Django backend role for its required
operations. Django continues to enforce per-user ownership using its single
backend connection identity; these are not Supabase Auth policies. Preserve all
client-role/PUBLIC revocations. Review EXECUTE grants for the helpers
`kivo_expected_postings(bigint)` and `kivo_reserve_change_active(uuid,bigint)`;
do not broadly expose financial helpers to client roles. Test complete workflows
using the proposed runtime credentials in an authorized isolated database.

Run the read-only release gate with the proposed runtime connection:

```bash
backend/.venv/bin/python backend/manage.py audit_database_security
```

A nonzero exit blocks release. It checks actual TLS, accessible administrative
roles, table ownership and privacy of all Django tables and their sequences.
It does not provision policies/grants or prove every effective DML privilege.
Successful authentication, financial, concurrency and negative permission tests
with the runtime role are also required.

## HTTPS, proxies, cookies and rate limiting

Serve the web client and `/api/` through one HTTPS origin. No CORS middleware is
installed; setting a CORS environment variable has no effect. Add a cross-origin
architecture only through a separately reviewed dependency/configuration change.
Trusted CSRF origins must be explicit HTTPS origins without wildcards or paths.

Use [the Gunicorn configuration](../deploy/gunicorn.conf.py) only after approving
and installing a compatible pinned Gunicorn version. It resolves the original
backend directory, forces production settings, binds loopback, avoids pre-fork DB
connections, and uses synchronous workers with a 60-second worker timeout. The
configuration was loaded as Python; actual Gunicorn startup remains NOT VERIFIED.
After approval, the launch command from the original repository is:

```bash
backend/.venv/bin/gunicorn --config deploy/gunicorn.conf.py
```

Configure the HTTPS ingress to reject unexpected hosts and replace, rather than
append untrusted, forwarding headers. Gunicorn accepts the HTTPS scheme header
only from its loopback ingress. Do not expose its port publicly. For that exact
single-proxy topology set `AUTH_TRUSTED_PROXY_HOPS=1`; otherwise retain 0. With 0,
all users behind the same proxy share its peer-IP bucket. Test spoofed forwarded
headers at the actual public boundary before enabling proxy trust.

Enforce shared authentication limits at the ingress across workers (login five
attempts/minute/IP, registration three/minute/IP, plus a reviewed burst policy).
DRF's in-process cache limits are best effort, not a brute-force protection
boundary. No Redis or new cache infrastructure is introduced. The actual ingress
and limits are not configured or verified in this task.

Verify Secure/HttpOnly/SameSite=Lax session cookies, CSRF rotation and rejection,
HTTPS redirects and `/auth/me/`/logout at the deployed HTTPS origin. The CSRF
cookie is intentionally readable so clients can send `X-CSRFToken`. All API
responses are private/no-store. Keep readiness probes accessible to the monitor
and rate-bound at ingress; liveness performs no session/database lookup.

## Migration and deployment sequence

1. Record the release revision, approved dependency versions, current schema,
   backup identity and rollback revision. Pause writes during the approved change.
2. Using production settings and the appropriate credentials, run:

   ```bash
   backend/.venv/bin/python backend/manage.py check --deploy --fail-level WARNING
   backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
   backend/.venv/bin/python backend/manage.py showmigrations
   backend/.venv/bin/python backend/manage.py migrate --plan
   backend/.venv/bin/python backend/manage.py sqlmigrate users 0003
   ```

3. Review duplicate identities with a count grouped by `lower(email)`. If any
   exist, stop for an account-specific decision. Never merge/delete users or
   financial data automatically. The new unique index is additive, but its build
   can block writes; inspect the production data size and maintenance window.
4. Only with explicit target approval apply `migrate --noinput` using the migration
   role. Do not use fake migrations, reset history, truncate tables or remove
   immutability guards. Application users.0003 remains unapplied in Phase 7 unless
   that approval is received; isolated pytest databases apply it independently.
5. Verify schema/privileges with runtime credentials, collect static assets if
   serving admin, and start the approved supervised server. Do not use runserver
   for production. Supervisor/ingress installation and public deployment require
   their own approval and verification.
6. Verify health, real HTTPS session/CSRF flows, and read-only reconciliation:

   ```bash
   backend/.venv/bin/python backend/manage.py reconcile_ledger
   backend/.venv/bin/python backend/manage.py rebuild_funds --all --check
   backend/.venv/bin/python backend/manage.py reconcile_rent
   ```

7. Reopen writes only after all mandatory release gates pass. No public deploy,
   DNS change, purchase or production financial mutation is authorized by this
   runbook alone.

## Incident response and rollback

Use request IDs, error classes, status and `duration_ms` to correlate incidents.
Logs intentionally omit bodies, cookies, passwords, tokens and arbitrary error
text. Duration measures response preparation; streaming completion is separate.
Investigate DNS/connectivity and DB waits before changing accounting behavior.

A timeout, lost connection or 500/503 can have an ambiguous commit outcome.
Resend the identical financial request with its original Idempotency-Key. Never
generate a fresh key to guess whether the first write committed. Read back the
posted resource/history and reconcile; do not manually change balances. Failed
atomic operations retain no partial journal or consumed retry key. There is no
automatic financial write retry.

CSV iteration holds the owner lock for consistency. Closing/disconnecting a
stream must release it; the reliability test exercises that path. Bound ingress
and worker timeouts so a stalled stream cannot hold the owner indefinitely. A
partial CSV is incomplete: discard it and request a new export.

For a confirmed release regression pause writes, preserve diagnostics/receipts,
and select a reviewed compatible application revision. Keep additive schema and
audit history; never blindly migrate backwards or remove the email identity
constraint. Reverify auth, schema, privileges and reconciliation before resuming.
Rollback must not re-enable known authentication defects. Database restoration
is a separate approval-requiring action, not a routine code rollback.

## Backup policy and isolated restoration

Current provider plan, actual recovery points and retention are NOT VERIFIED.
The operator must inspect the Supabase dashboard and record them. Do not infer
PITR or retained backups from connectivity. Provider retention and recoverability
depend on the account configuration; see [Supabase backups](https://supabase.com/docs/guides/platform/backups).

Proposed operating targets for approval: daily encrypted off-site logical backups,
30-day retention, RPO at most 24 hours, RTO at most 24 hours. These are targets,
not achieved guarantees. Name a backup owner and recovery approver; confirm
storage/encryption/key custody and recurring restore-drill responsibility before
release. No jobs, storage purchases or backup services were configured.

Before a drill, approve a distinct empty remote PostgreSQL target and compatible
PostgreSQL client tools. The tools are absent here and were not installed. Use
operator-managed libpq services/passfiles so command arguments contain no secrets.
Example commands below were NOT executed; paths/services must be explicitly
approved and must never point restore at the source application database:

```bash
pg_dump --dbname=service=kivo_backup --schema=public --format=custom --no-owner --file=/approved/encrypted-storage/kivo.dump
pg_restore --list /approved/encrypted-storage/kivo.dump
pg_restore --dbname=service=kivo_restore_isolated --no-owner --exit-on-error --single-transaction /approved/encrypted-storage/kivo.dump
```

Preserve functions, constraints, sequences, RLS, ACLs and durable retry receipts
alongside every financial/audit table. Do not add `--no-acl` or `--clean` as a
shortcut. A public-schema dump does not back up provider-managed schemas, storage
objects or external secret material. Ensure target extensions/roles exist and
review the archive before loading it. See [pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html)
and [pg_restore](https://www.postgresql.org/docs/17/app-pgrestore.html).

Record backup checksum, time and database identity; measure real restore duration.
On the isolated restored target verify migrations, counts, ledger/FIFO/rent
reconciliation, object privacy and retry-receipt preservation using read-only
commands. Run destructive automated tests only in another empty isolated test
database, not against the populated restored archive. Verify intended session
invalidation and secret/role-password recovery before any approved cutover.
Restoring an old copy can resurrect sessions and lose later committed writes;
reconcile the precise recovery boundary and client retry receipts explicitly.

No backup/restore drill occurred in Phase 7. Operational readiness stays blocked
until actual restoration, recovery objectives and deployment controls are verified.

References: [Django deployment checks](https://docs.djangoproject.com/en/6.1/howto/deployment/checklist/),
[PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html),
[DRF throttle limitations](https://www.django-rest-framework.org/api-guide/throttling/),
[Gunicorn settings](https://gunicorn.org/reference/settings/).
