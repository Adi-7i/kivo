# Phase 6 implementation plan

Phase 6 is authorized by the latest user request. Phase 7 remains excluded.
Implementation is **BLOCKED** at the prerequisite gate: Phase 5 is partially
complete. The user subsequently approved the original recognition/FIFO questions;
remaining Phase 5 verification and linked friend-paid rent reserve handling must
be resolved first. This document is a plan, not Phase 6 application implementation.
See [current evidence](phase-06-verification.md) and
[ADR-005](../decisions/ADR-005-personal-sharing-and-rent.md).

## Prerequisite decisions and verification

1. Apply the user's approved friend-paid expense/payable and FIFO v2 decisions
   documented in ADR-005. Obtain the separate pending decision about linked
   friend-paid rent reserves before implementing that financially ambiguous path.
2. Complete the already authorized Phase 5 financial workflows using the existing
   balanced ledger, immutable history, owner locking and durable idempotency.
   Verify lending, borrowing, repayments, shared bills/settlements and shared rent
   against real isolated PostgreSQL, including corrections and FIFO replay.
3. Use the restored isolated Python 3.13 verification environment with the approved
   dependencies. Inspect additive migration plans, apply only authorized
   development changes, and pass the complete Phase 1–5 gate before Phase 6 code.

The PRD, Backend Technology Blueprint and Final Development Suite are not present
in the repository. Available specifications are the user prompts, AGENTS.md,
README, ADRs and phase reports. No review of unavailable documents is claimed.

## Conditional implementation sequence

1. Add owned monthly/category budgets with validated periods, configurable
   warning thresholds, archival and progress derived from recognized personal
   expense. Cover absent budgets, zero limits, overspending and corrections.
2. Add dashboard selectors over the same ledger, claim, rent and reserve sources.
   Expose actual liquid balances, calendar spending, cash flows, outstanding
   claims, rent states, budget progress, earmarks and safe-to-spend.
3. Extend the existing history selector and validation with shared date presets,
   inclusive ranges, related-resource filters, search and deterministic ordering.
   Reject unsupported parameters. Reuse these filters for reports and CSV.
4. Implement report summary, trends, breakdown, comparisons and fund-source
   integration with scoped ORM aggregates. Distinguish expense recognition,
   external income, principal and cash movements. Define averages and zero
   denominators explicitly; never fabricate exhaustion dates.
5. Implement authorized streaming UTF-8 CSV with exact INR strings and formula
   escaping for every user-controlled text column. Document reversal/status
   conventions so filtered exports reconcile with history and reports.
6. Verify real PostgreSQL financial scenarios, authenticated HTTP behavior,
   ownership, rollback, corrections and representative query counts. Inspect
   migrations and privacy grants, validate OpenAPI, run the full regression and
   final Django/Ruff checks, and update the verification report with actual exits
   and counts. Stop after Phase 6.

## Financial and reporting constraints

- All money remains integer paise; percentages and averages use exact decimal
  arithmetic with documented denominators. Limits never change ledger balances.
- Personal spending follows economic ledger contributions, including refunds and
  corrections. Shared bills contribute only the owner's recognized expense.
  Principal and owned transfers never become income or personal expense.
- Rent due dates alone create no paid expense. Active rent reserves reduce
  safe-to-spend, never cleared liquid balance. Use the existing reserve lifecycle.
- Use effective dates for financial periods and audit timestamps for provenance.
  State the applicable timezone; distinguish Monday–Sunday calendar weeks from
  rolling seven-day windows. Use stable tie-breakers for pagination.
- Choose and document report read-consistency behavior across multiple aggregates
  before implementing them. Do not introduce mutable dashboard balances, caches,
  materialized views, background infrastructure or alternate funding engines.
- Reuse existing authenticated ownership boundaries and inspect query plans/counts
  when representative data justifies optimization. No performance claim is made
  before measurement.
