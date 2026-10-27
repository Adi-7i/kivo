# Database evidence and approval plan — 2026-10-27

**FAILED for production least privilege; migration application BLOCKED pending
target approval.** The inspected connection is the existing development/application
target from the ignored root `.env`, variable `SUPABASE_DB_URL`, database
`postgres`, direct Supabase port 5432, IPv6-only DNS, PostgreSQL 17.11. No endpoint
or credential is reproduced here. No mapping to an approved production project
or independent staging target has been supplied.

## Current read-only findings

`run_release_checks.py database` forces read-only sessions with diagnostic-only
10s statement / 2s lock bounds; it does not persist timeout settings. Snapshot
uses a repeatable-read transaction. TLS is true; `sslmode=require`; max connections
60; idle-in-transaction timeout 0. These diagnostic timeout values are not
asserted to be the application's normal statement/lock configuration.

All prior migrations, including users.0003, are applied. No model-state changes
are detected. The only newly planned migration is
`ledger.0009_private_financial_helpers`. The live email index is valid/unique;
duplicate email groups: 0. Catalog totals: 145 indexes, 0 invalid; 37 check,
77 foreign-key, 36 primary-key, 21 constraint-trigger and 26 unique constraints,
0 unvalidated; 0 disabled public user triggers. Catalog validation does not
prove the optimizer selects every intended index or certify every historical row.

Security audit: 36 Django tables present with RLS, no client-role table privacy
failures; 20 sequences checked, no client-role failures. Configured credentials
own all 36 tables and access two administrative roles. Effective database/public
schema CREATE and staff/superuser updates are allowed. Forbidden mutation access
exists on 29 append-only/reference tables. A callable helper privacy check fails.
The release database gate therefore exits 1. Journal reconciliation passes for
590 events, without mutation.

## Exact unapplied migration

Target for any future execution must be approved explicitly. The observed target
is identified above; no approval to alter it or any production target is inferred.
Objects: two functions in its `public` schema. Generated SQL:

```sql
BEGIN;
REVOKE EXECUTE ON FUNCTION public.kivo_expected_postings(bigint)
    FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.kivo_reserve_change_active(uuid,bigint)
    FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
```

Django also records the migration in `django_migrations` on actual application.
No financial records, tables, columns, indexes or function bodies change. Owners
retain function access. A separately provisioned backend role needs named
EXECUTE grants before cutover. This is intentionally irreversible by automatic
backward migration: application rollback keeps the privacy restriction. Before
commit a transaction rollback restores prior ACLs; after commit, fix a missing
private-role grant forward. Never reopen EXECUTE to PUBLIC as automatic rollback.
Capture exact pre-change ACLs privately for incident review.

After authorization, verify the exact project/database, backup and ACLs, inspect
`migrate --plan`/`sqlmigrate ledger 0009`, apply to isolated staging first with
the migration credential, and run all workflow/negative-privilege tests using
fresh runtime LOGIN credentials. Apply to the approved production target only
in its release window. Verify migration history, function grants, actual runtime
workflows, audit gate and financial reconciliation. SQL generation has passed;
application has **NOT** been tested or executed in this pass.

## Migration/runtime separation

Reuse the existing reviewed [role design](../security-and-operations.md#runtime-database-privileges),
[SQL generator](../../backend/common/runtime_role.py) and
[rollback-only rehearsal](../release/runtime-role-rehearsal.sql). Do not execute
the historical `test_kivo_phase07` rehearsal without renewed authorization.
Role DDL is cluster-wide even when object grants target an isolated database.

Migration principal owns schema and applies DDL; never inject it into application
workers. Runtime principal must be a distinct LOGIN without administrative
attributes/membership, ownership, schema/database CREATE or trigger alteration.
Grant SELECT/INSERT on journals/receipts/snapshots/audits, reviewed metadata
updates, user password/last_login updates and session deletion only. Keep
Supabase client/PUBLIC table, sequence and helper grants revoked. Backend-only
RLS policies must name the runtime role; Django retains owner isolation.

The existing generator produces NOLOGIN rehearsal SQL with ROLLBACK, explicit
table allowlists, policies and private helper EXECUTE. It does not provision
production credentials. Production LOGIN secret creation, role grants, policies,
deployment secret selection and rollback secret version need an approved exact
project/role plan. Reusing the old administrative runtime secret as a production
rollback is not an acceptable least-privilege result.

## Connection selection and recovery

[Supabase's connection guidance](https://supabase.com/docs/guides/database/connecting-to-postgres)
distinguishes direct sessions from session and transaction poolers. Long-lived
WSGI workers can use direct sessions where IPv6 is available; session pooling
is a candidate for IPv4 hosting. Obtain the project's official Connect parameters;
do not guess regions, hostnames or reuse the wrong role username. No Session
Pooler URI was available, so a matched route comparison remains BLOCKED.

Existing defaults remain connection age 600s, health checks enabled, connect
timeout 10s, TCP keepalive and user-timeout detection. The opt-in development
pool is unchanged. Proposed WSGI has two synchronous workers, normally two
request connections; include migration, monitoring, Supabase services and
deployment overlap within the observed 60-connection budget. This is a sizing
proposal, not measured peak capacity. Verify CA/hostname trust and connection
limits on the actual host. Recover dead connections before new work; never retry
an ambiguous financial write with a new key.
