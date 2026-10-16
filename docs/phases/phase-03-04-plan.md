# Phase 3–4 execution plan

## Inputs and prerequisite gate

The 2026-10-16 Phase 3 + 4 master prompt authorizes these two phases sequentially.
Phase 5 is excluded. Existing uncommitted Phase 2 work must be preserved.
The repository contains AGENTS.md, README, two baseline ADRs and the Phase 1
report. No PRD, Backend Blueprint, Final Development Suite or Phase 2 report was
found. The latest user prompt is the available controlling feature specification.

Before implementing Phase 3, execute the existing Phase 1–2 tests against a
separate remote PostgreSQL database, inspect the development migration plan,
and validate Django configuration, OpenAPI and Ruff. A passing liveness test or
mocked readiness test alone does not verify the database or authentication.

## Phase 3 implementation sequence

1. Define owned accounts and categories, stable UUID public identifiers, immutable
   financial events and signed double-entry postings in integer paise.
2. Add atomic posting services with owner-scoped row locks, persistent idempotency,
   ownership validation, exact money input, opening equity, receipts, expenses,
   transfers, expense-linked refunds, reversals and superseding corrections.
3. Expose versioned APIs, scoped history queries and generated OpenAPI contracts.
4. Inspect generated migrations and SQL before applying to the authorized
   development database; run behavioral tests on the isolated test database.
5. Verify balance conservation, journal reconciliation, refund eligibility,
   rollback, retries, concurrent writes, historical corrections and isolation.
6. Record executed evidence in phase-03-verification.md. Do not start Phase 4
   until all blocking Phase 3 failures are resolved.

## Phase 4 implementation sequence

1. Derive independently identifiable funding batches from eligible opening and
   receipt events. Keep income classification separate from source attribution.
2. Allocate by account using effective date and stable event order; transport
   original batch lineage through owned-account transfers.
3. Recompute deterministically inside the financial write transaction after
   backdated events, corrections or reversals. Retain prior attribution runs for
   audit and record the policy version.
4. Expose batch capacities, source journeys, category/date breakdowns, explicit
   attribution status, exhaustion dates and inclusive elapsed calendar dates.
5. Test the three required FIFO scenarios plus backdating, refunds, reversals,
   concurrency, idempotency, capacity protection and owner isolation.
6. Record evidence in phase-04-verification.md and rerun the full regression and
   security/financial checks after final implementation changes.

## Conservative behavior and unresolved product policy

Insufficient funds must produce an explicit rejection and roll back the complete
write. Do not synthesize a receipt, allow an unexplained cleared overdraft, or
spend funds from a different owned account without an explicit transfer.
Historical changes must also preserve a fundable effective-date history.

Approval is still needed before introducing negative balances, provisional
funding, manual attribution overrides, recovery write-offs, or migration of
unexplained legacy funds. Those features are outside this implementation.
Future lending and shared-expense business features remain deferred to Phase 5.

## Verification boundaries

Use the configured remote Supabase development database for authorized additive
migrations. The test runner must create/use a different PostgreSQL database;
never flush or reset the development database. Retain test databases for repeated
verification with pytest --reuse-db. Do not reset existing migrations or tables.
Never include credentials or full connection URLs in reports.

The installed runtime is Python 3.14.4; the user requests Python 3.13. The existing
ADR permits 3.14, but results on 3.14 do not establish verification on 3.13.
