# Kivo v1 release readiness

Status: **NOT READY**. The post-change full suite completed with **293 passed,
1 failed, 0 errors/skipped**. Targeted passes do not replace that failed full
regression or the external production gates.

Original repository: `/home/lucifer/Desktop/kivo`. Existing runtime:
`backend/.venv/bin/python`, Python 3.14.4; all 25 locked distributions match.
No runtime/dependency changes, external source copies, commits or deployments.

## Release gates

| Gate | Status | Evidence / remaining requirement |
| --- | --- | --- |
| Authentication | BLOCKED | Isolated PostgreSQL auth gate: 49 passed. Production needs the approved application email constraint and actual HTTPS/ingress verification. |
| Functional completeness | FAIL | Full suite ran all 294 cases; real HTTP financial lifecycle exceeded its unchanged 30-second deadline creating a rent reserve. Fresh isolated retry passes, but the original cause remains unverified. |
| Financial integrity | PASS | Actual PostgreSQL ledger/FIFO/rent scenarios, retained friend reserves, rollback and concurrent retry/settlement checks pass. This does not certify the timed-out HTTP response or its historical commit outcome. |
| Database integrity | BLOCKED | Prior migrations applied and no model drift; new `users.0003_case_insensitive_email` remains pending on the application DB. Isolated test DB applies it. |
| Security | FAIL | Actual read-only database security command exits 1: runtime role has administrative access and owns 36 Django tables. Object privacy itself passes (36 tables, 20 sequences). |
| Reliability and performance | FAIL | Representative query-count/recovery/stream-lock checks pass (budget 1/dashboard 20/CSV 6 queries), but a real HTTP reserve request timed out in the full run. Diagnostic retry returns 201 in 4.9151 s (13 SQL executions); it does not resolve the original timeout or certify production load/SLO. |
| Complete regression | FAIL | Post-change full run: 293 passed, 1 failed, 0 errors/skipped in 4908.725 seconds (JUnit). Process exit was not captured after the conversation interruption; all 294 completed results are preserved. |
| Operational readiness | BLOCKED | No installed/verified production application server, configured HTTPS ingress/shared limiter, restricted-role cutover, verified provider retention or isolated backup restoration. |

## Required actions before release

1. Approve the specific application database target and apply the reviewed additive
   email-identity migration. Zero duplicate groups were observed in the read-only
   preflight; do not merge/delete identities if that changes.
2. Provision and verify a non-owner, non-administrative runtime DB role with
   explicit backend-only RLS/DML/sequence/helper-function permissions. Keep
   migration credentials separate. Run the actual security gate and workflows
   under those runtime credentials; an admin-role test pass cannot replace this.
3. Approve/pin a production WSGI server dependency and verify the prepared
   [server configuration](../../deploy/gunicorn.conf.py). Configure and test the
   actual HTTPS origin, headers, cookies, proxy trust and shared auth limits.
4. Confirm actual Supabase backup plan/retention, secure backup custody and an
   authorized isolated restore target. Approve the missing PostgreSQL client
   tooling, execute the restore drill and measure actual recovery objectives.
5. Resolve the observed HTTP response timeout with execution evidence and obtain a
   clean complete regression. A targeted retry pass is insufficient. Final Django,
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
