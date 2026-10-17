# Phase 5 execution plan

Current continuation (2026-10-17): the user approved immediate friend-paid
expense/payable recognition and conditional FIFO v2. Deterministic rules were
documented in ADR-005 before implementing the new engine. Lending, borrowing,
claim settlements, shared bills and owner-paid shared rent are now under real
Python 3.13/PostgreSQL verification. Linked friend-paid rent reserve handling is
the explicit remaining policy question. The original plan/evidence below records
the earlier partial implementation and does not establish the new completion gate.

The latest Phase 5 prompt authorizes this phase only. Phase 6 and 7 remain out of
scope. Existing uncommitted Phase 3–4 work is preserved. Available inputs are
AGENTS.md, README, ADR-001 through ADR-004 and Phase 1–4 reports. No PRD,
Backend Technology Blueprint or Final Development Suite is present in the
repository; no claim of reviewing those unavailable documents is made.

## Prerequisites and sequence

Observed gates: prerequisite regression 129 passed (exit 0); implemented-scope
gate 31 passed (exit 0, one subsequently fixed ordering warning); final regression
160 passed (exit 0, no failures/skips/warnings). All five additive migrations are
applied on development Supabase. Remaining financial policy decisions below are
unanswered; Phase 5 is PARTIALLY COMPLETE and Phase 6 is NOT READY. See the
[verification report](phase-05-verification.md) for exact evidence and scope.

1. Rerun the complete 129-test prerequisite suite on Python 3.13 and the existing
   isolated remote PostgreSQL test database. Inspect development migration state.
   Stop financial implementation if critical prerequisites fail.
2. Add a modular personal-sharing domain with owned contacts, ledger-linked
   claims, shared bills/shares, monthly rent obligations/payments and reserve
   audit records. Keep all balances derived from the existing journal.
3. Extend the ledger with receivable/payable books and rigorously checked
   multi-leg financial events. Preserve historical immutability, owner locking,
   durable idempotency, exact money, correction order and fundability checks.
4. Verify contacts and personal lending, then shared expenses/settlements, then
   recurring rent/payment/reversal and reserves. Integrate approved FIFO policy
   in the same atomic financial transaction.
5. Review additive migrations and SQL before applying to authorized development
   Supabase. New tables must have RLS and revoked Supabase client-role privileges.
6. Run domain tests, real PostgreSQL concurrency/rollback/security tests, socket
   HTTP session flows, reconciliation, full regression, schema validation,
   migration checks and Ruff after the final implementation change.
7. Record actual commands, exits, counts and remaining blockers in
   phase-05-verification.md. Never substitute mocks for PostgreSQL evidence.

## Accounting decisions requiring user input

The existing ADRs intentionally defer Phase 5 accounting. Questions were submitted
before implementation; pending approval does not authorize dependent behavior.

- Friend-paid bill recognition: recommended recognition of the owner's share as
  expense plus payable on the bill date; subsequent settlement reduces payable
  and cash without another expense.
- FIFO v2: recommended retention of original source lineage in receivables,
  restoration on repayment, explicit liability-funded borrowing batches (never
  income), and separately classified principal-return allocation on debt repayment.

Rent obligations themselves never post financial movements or expenses. Only
confirmed payments recognize the appropriate expense and cash movement. Reserves
are earmarks, separate from both cash and unpaid obligations; linked payment
consumption must reverse with the payment so rent is never deducted twice.

Interest, EMI, credit decisions, payment processing, background infrastructure,
generic budgets/alerts/analytics and unapproved negative-balance or manual-writeoff
policies remain excluded.
