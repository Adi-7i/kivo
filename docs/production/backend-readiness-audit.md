# Backend production audit — 2026-10-27

**PARTIALLY COMPLETE / NOT READY.** This hardening pass preserves the modular
monolith, financial rules, frontend source and 68-path / 84-operation API. The
[final report](final-release-report.md) is the current evidence index. Historical
reports remain intact and do not certify this checkout.

## Workspace and baseline

Canonical directory and Git root: `/home/lucifer/Desktop/kivo`; branch
`UTA-TESTING`; baseline HEAD `e5fe3a8e3843844c1fd688a3c161e293b6869132`.
Initial `git status --short --untracked-files=all` was empty. Backend writes
were permitted and subsequent patches succeeded in the original repository.
Backend: `backend/`; integrated client: `kivo-frontend/`. No worktree, project
copy, alternate capitalized directory, commit or reset was used.

Read the root instructions, ADRs 001–007, Phase 1–7 verification material,
integration Parts 0–6 and readiness reports, existing release report and
security/operations procedures. Large historical reports were inspected by
current sections and targeted searches; old failures remain evidence, not
assumed current defects. Review covered auth, database parsing, exception/logging
boundaries, financial write/selector boundaries, retry receipts, FIFO, rent,
reporting/export and the Next server transport. Static parsing checked 120
backend Python files. This is not a formal proof of every source path.

Existing interpreter: `backend/.venv/bin/python`, Python **3.14.4**. Installed
Django **6.1.2**, DRF **3.18.3**, psycopg **3.3.6**, psycopg-pool **3.3.3**,
drf-spectacular **0.30.0**, pytest **9.1.1**, pytest-django **4.14.0**, Ruff
**0.17.1**. Baseline Django/Ruff/pip checks passed; 314 tests collected and
174 unit tests passed, 140 database-dependent cases deselected. No runtime
rebuild, install, dependency/lockfile change or secret-file edit occurred.

## Previously reported issues: actual status

| Issue | Current finding |
| --- | --- |
| Pending users.0003 | **RESOLVED before this pass**: recorded applied; valid unique case-insensitive index; zero duplicate groups. Nothing applied here. |
| Privileged runtime role | **FAILED**: configured application credentials access two administrative roles, own 36 tables, allow database/schema CREATE and privileged user updates. Actual production credentials are not provided. |
| Rent-reserve timeout | **NOT VERIFIED as resolved**. Current three-query and longer read-only probes cannot establish write reliability. Historical reserve timeout and later shared-bill commit beyond the frontend deadline remain open. |
| Full regression | **BLOCKED**: current full attempt stops before DB setup because no isolated mutation target was authorized. Historical failed/incomplete full runs are retained. |
| Production security settings | Synthetic production-profile `check --deploy --fail-level WARNING` passes. Actual hosting/HTTPS/origins remain **BLOCKED**. |
| Backup/restore | **BLOCKED**: plan, retained recovery points, tools and safe restore target unavailable. |
| HTTPS/session/CSRF | Secure defaults and unit coverage pass. Fresh production-origin browser/session verification remains **BLOCKED**. |

## Confirmed fixes and limitations

An existing unreadable environment file now raises a sanitized configuration
error instead of silently falling back. Missing optional files remain supported.
Explicit `sslrootcert` URL configuration now reaches psycopg; repeated/empty TLS
options fail closed. Existing connection defaults and deadlines remain unchanged.
The pre-fix regression executed with **4 failures / 10 passes**, exit 1; after
fixes and test-safety coverage, **18 passed**, exit 0.

Database pytest setup now needs both an explicit `test_` name and the mutation
opt-in. Its existing remote-engine, non-mirror and distinct-target guards remain.
This prevents accidental creation/flush/drop using unapproved application
credentials. It is not permission to mutate a database merely by setting flags.

The security audit additionally rejects database/schema CREATE, forbidden
updates/deletes on append-only/reference tables, column-level UPDATE access and
staff/superuser updates. An unapplied migration removes public/client EXECUTE
from two financial helpers. Its SQL was generated and inspected, but its actual
application/rollback compatibility needs authorized PostgreSQL verification.

## Performance and financial scope

Actual read-only journal reconciliation passed for **590 financial events**.
It checks zero-sum postings and exact operation-specific posting multisets.
It does not prove current FIFO/rent/report equality, concurrency, repayment caps
or ambiguous-write recovery. Those require the isolated full regression and
browser workflows. Existing FIFO/rent commands acquire owner locks and were not
included in the enforced read-only production snapshot.

Source review confirms integer-paise operations, owner-scoped selectors, atomic
owner locks and durable owner/key/body retry receipts. No calculation, policy,
posting, reserve, balance, serializer contract or frontend source was changed.
Existing immutable guards remain enabled; no assertion was relaxed.

Measured small SELECT probes are network observations, not API capacity tests.
No staging load, concurrent authenticated request test or large-history/CSV
memory measurement was run without a safe target. No speculative index, cache,
financial rewrite, retry or timeout increase was introduced. See the final
report for measurements and [deployment runbook](deployment-runbook.md) for the
required staged measurement conditions.
