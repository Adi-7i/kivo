# Kivo v1 release readiness

Status: **NOT READY / PARTIALLY COMPLETE**, from clean baseline `e562cbf`.
Latest complete post-change run: **305 passed, 1 failed, 0 errors/skipped,
all 306 executed, exit 1**. No suspension occurred during that run. Targeted
transport/HTTP regression **16 passed, exit 0**; subsequent ownership follow-up
**1 passed, exit 0**. Neither replaces the failed complete regression.

The first follow-up full attempt was interrupted after **47 passed / 1 failed**,
exit 2, to investigate an independently observed connection loss. Kernel evidence
confirms workstation suspend during the failing dashboard read. Transport
liveness controls and a temporary process-scoped sleep inhibitor address that
demonstrated defect; original HTTP/SQL deadlines and assertions remain intact.
The later complete run still encountered a simultaneous independent connection
failure on an awake host. Exact attribution of the older reserve
timeout remains unverified; this new incident is not retroactive proof of it.

Original repository: `/home/lucifer/Desktop/kivo`. Existing runtime:
`backend/.venv/bin/python`, Python 3.14.4; all 25 locked distributions match.
No runtime/dependency changes, external source copies or deployments. The earlier
audit is committed in the baseline; this agent made no commit/history change.

## Release gates

| Gate | Status | Evidence / remaining requirement |
| --- | --- | --- |
| Authentication | BLOCKED | Current complete run's 50 auth/user cases pass. Application email index and actual deployed HTTPS/ingress verification remain pending. |
| Functional completeness | FAIL | Complete run: 305 passed/1 failed. Initial receipt in ownership case returned safe 503 before authorization assertions. Fresh follow-up passes; full gate remains failed. |
| Financial integrity | PASS | Actual PostgreSQL ledger/FIFO/rent, retained friend reserves, rollback, concurrent duplicates/settlements and report reconciliation pass. Uncertain response/commit outcomes are not certified as rolled back. |
| Database integrity | BLOCKED | Prior migrations applied and no model drift; new `users.0003_case_insensitive_email` remains pending on the application DB. Isolated test DB applies it. |
| Security | FAIL | Actual read-only database security command exits 1: runtime role has administrative access and owns 36 Django tables. Tables/sequences remain private; the extended audit additionally detects public client EXECUTE on invoker helper kivo_expected_postings(bigint). Rollback-only restricted-role rehearsal awaits approval. |
| Reliability and performance | FAIL | Confirmed suspend/stale-connection issue hardened with actual socket tests and temporary awake verification. Complete awake run still had a 503 and simultaneous observer connection loss. Precise path/provider cause remains unlocalized; no production SLO is certified. |
| Operational readiness | BLOCKED | No installed/verified production application server, configured HTTPS ingress/shared limiter, restricted-role cutover, verified provider retention or isolated backup restoration. |

## Required actions before release

1. Approve the specific application database target and apply the reviewed additive
   email-identity migration. Zero duplicate groups were observed in the read-only
   preflight; do not merge/delete identities if that changes.
2. Approve and execute the prepared isolated rollback-only
   [restricted-role rehearsal](runtime-role-rehearsal.sql), then review the actual
   runtime LOGIN/credential provisioning and live RLS/DML/sequence/helper grants
   separately. Leave table ownership with the migration administrator. Keep
   migration credentials separate; an admin-role test pass or SET LOCAL ROLE
   rehearsal cannot replace actual runtime-login/concurrency verification.
3. Approve/pin a production WSGI server dependency and verify the prepared
   [server configuration](../../deploy/gunicorn.conf.py). Configure and test the
   actual HTTPS origin, headers, cookies, proxy trust and shared auth limits.
4. Confirm actual Supabase backup plan/retention, secure backup custody and an
   authorized isolated restore target. Approve the missing PostgreSQL client
   tooling, execute the restore drill and measure actual recovery objectives.
5. Resolve the remaining connection-availability failure and obtain a clean
   complete regression on the same approved environment. No guessed endpoint,
   blind timeout increase or financial-write retry is an approved workaround.
   Current database credentials cannot read server log files; provider incident
   logs need separately authorized access to localize the remaining failure.
   A targeted retry pass is insufficient. Final Django,
   OpenAPI, Ruff and dependency checks pass; preserve the failed/interrupted
   attempts in the evidence record.

No application schema/privilege mutation, real financial write, public deployment,
DNS change, purchase, backup or restoration was performed without approval.
The application database has remained read-only during this audit; destructive
tests execute only in the separate authorized remote PostgreSQL test database.

See [executed Phase 7 evidence](../phases/phase-07-verification.md),
[security/deployment/recovery procedures](../security-and-operations.md) and
[ADR-007](../decisions/ADR-007-authentication-and-operations.md). Those records
distinguish source implementation, isolated integration evidence and external
production gates. **Phase 7 is not declared complete while mandatory gates remain.**

## Exact approval-dependent operations

Application migration target is `postgres` at
`db.zybhyenkqzszpjcoajxx.supabase.co:5432`. Latest read-only preflight: zero users,
zero duplicate identity groups; index absent. Reviewable additive operation:

```bash
backend/.venv/bin/python backend/manage.py migrate users 0003 --noinput
```

It creates the unique lower(email) index and records the migration, with a possible
brief users-table write lock; no financial row is changed. Approval remains pending.

Separately, pytest has released `test_kivo_phase07`; the still-unapproved role probe is:

```bash
backend/.venv/bin/python backend/manage.py rehearse_database_runtime --test-database test_kivo_phase07 --role kivo_runtime_probe --execute-rollback-only
```

It creates a fresh uncommitted NOLOGIN role and isolated-object grants/policies,
checks real synthetic workflows and forbidden privileges, rolls back, and checks
role absence. Test sequences may advance. Role DDL is cluster-wide even though
uncommitted; this also remains pending explicit approval. Neither question
authorizes production role/credential cutover or a restoration.
