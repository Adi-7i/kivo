# ADR-005: Personal relationships, rent obligations and earmarks

Status: implementation in progress. Financial policy questions below are pending
explicit user answers; this document does not approve them on the user's behalf.

## Boundaries and financial authority

The `sharing` app owns personal contacts and the metadata linking claims, shared
bills, rent and reserves to the existing ledger. Contacts need no Kivo account.
Archival preserves historical references; financial foreign keys use PROTECT.
Receivable/payable balances must derive from signed ledger postings. Claim rows
identify the person, direction and originating event; they store no mutable
outstanding balance. Repayment limits must use actual posted outstanding amounts.

Every mutation uses the existing owner-row lock, atomic transaction and durable
owner-wide idempotency namespace. Reuse with different input is a conflict.
Posted financial history, claim links, shares and reserve changes remain
append-only. Corrections append reversals and replacement records. Configuration
and contact changes retain metadata audit records.

## Shared amounts and pending recognition decision

Both equal and custom splits must conserve every paisa. Participants include the
owner exactly once and each contact at most once, with a maximum of 100. Equal
split remainders go first to the owner, then ascending contact UUIDs. Custom
shares are nonnegative and must sum exactly to the gross bill. This rule is
independent of financial recognition and is tested using the actual calculation.

A user-paid bill must credit liquid assets by the gross amount and debit expense
only by the owner's share; other shares debit linked receivables. Reimbursement
credits the receivable and debits cash, without income.

**Pending user decision:** recognize a friend-paid bill's owner share immediately
as expense plus payable, or recognize expense on settlement? The latest Phase 5
prompt requires asking before implementing this unresolved behavior. Recommended:
immediate expense/payable recognition, with settlement reducing cash and payable.

## Pending FIFO v2 decision

ADR-004 v1 cannot attribute lending/borrowing/shared principal. A proposed v2
keeps original source capacity in receivables while lent, restores it to cash on
repayment, creates explicitly liability-funded borrowing batches without income,
and separately classifies principal returns when debt is repaid. Personal expense
and principal-return totals must remain distinguishable. Historic v1 runs stay
available. **User approval is pending; dependent posting is not authorized by this
proposal.** Existing v1 financial behavior is preserved until that decision.

## Rent calendar and recognition

A plan fixes the gross monthly amount, payee, category, participants, start date
and due-day rule. Null due day means last day of month; days 29–31 clamp to the
actual last day, including leap years. Generation includes due dates on or after
the plan's start, through the requested date. It does not prorate or create an
earlier first due date. Generation is explicit, deterministic and idempotent;
there are no workers. Unique `(plan, month)` prevents duplicate obligations.
Requests cover at most 120 new months at a time to bound synchronous work;
subsequent calls continue after the last generated month.

Generation posts neither cash nor expense. Unpaid obligations remain separate
from both the ledger and reserves. Configuration terms are immutable after
creation; deactivate and replace a plan to change future terms. Deactivation
stops generation without cancelling already issued obligations. An unpaid
obligation may be skipped with a recorded reason and reopened explicitly.

Actual confirmed payments alone recognize rent expense and cash movement.
Shared-rent payments must use the same shared-bill recognition and claim paths
and never book a second full personal expense. Partial shared-rent payments use
integer proportional allocation of remaining contractual shares, distributing
spare paise by largest remainder and stable participant order. Reversed payments
reopen the relevant outstanding amounts; excess payments are rejected.

## Rent reserves

Reserves earmark funds against an existing rent obligation and never post a
ledger movement. Signed, immutable reserve changes describe creation, adjustment,
release and payment consumption. A change linked to a payment is active only
while that payment remains posted. Reversing a payment therefore restores the
consumed reserve at the same time as cash, without a second cash deduction.
Skipping an unpaid obligation releases its reserves with an auditable reason.

Active reserves for an obligation cannot exceed its unpaid gross rent. Distinct
reserves can earmark multiple future rent obligations. `safe_to_spend` is exactly
actual liquid postings minus active earmarks. It is signed: earmarking future
rent beyond today's cash exposes a shortfall without inventing money or a cleared
overdraft. This phase adds no generic budgeting, alerts or analytics.

## Security and verification

Owned querysets and owned foreign-key resolution return the same 404 for missing
and foreign resources. Session/CSRF authentication is preserved. New tables must
receive RLS and explicit revocation of Supabase client-role table/sequence grants.
Additive migrations are inspected before authorized development application;
destructive tests remain on the isolated remote test database. Actual results and
remaining blockers belong in phase-05-verification.md, not inferred from code.
