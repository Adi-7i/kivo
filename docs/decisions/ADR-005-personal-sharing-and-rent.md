# ADR-005: Personal relationships, rent obligations and earmarks

Status: architecture and recognition decisions approved by the user on
2026-10-17, subject to actual tests. Implementation/verification is in progress.
The FIFO v2 rules below document the deterministic interpretation before code.

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

## Approved shared-bill recognition

Both equal and custom splits must conserve every paisa. Participants include the
owner exactly once and each contact at most once, with a maximum of 100. Equal
split remainders go first to the owner, then ascending contact UUIDs. Custom
shares are nonnegative and must sum exactly to the gross bill. This rule is
independent of financial recognition and is tested using the actual calculation.

A user-paid bill must credit liquid assets by the gross amount and debit expense
only by the owner's share; other shares debit linked receivables. Reimbursement
credits the receivable and debits cash, without income.

Friend-paid bills recognize the owner's share immediately as expense plus payable
to the payer. Settlement reduces cash/payable without another expense. The other
contacts' shares are metadata, not the owner's assets/liabilities. The payer must
be a participant. A zero owner share creates no payable or expense. The event's
face amount is the gross bill; signed postings describe its actual owner effects.

## Approved FIFO v2 and deterministic replay rules

The user approved v2 conditionally on explicit deterministic rules. V2 extends
source attribution; the ledger remains the authority for money and claims.
Historic v1 snapshots and the v1 algorithm remain immutable and readable.

1. **Order:** replay active economic events by effective date, correction-root
   event ID, then event ID. Reversal pairs are excluded from economic replay;
   both remain in the journal. Source rank uses that same tuple. Within a bill,
   allocate the owner share first, then contact shares by ascending contact UUID.
2. **Liquid FIFO:** consume only capacity held in the selected account, oldest
   source rank first. Owned transfers relocate capacity with its original rank.
   No cross-account fallback or unexplained funding is allowed.
3. **Lending/shared advances:** move source portions into a specific receivable
   claim rather than consuming them as personal expense. A user-paid shared bill
   removes gross cash: the owner portion consumes expense capacity, other portions
   enter their individual receivable claims. Each installment keeps its identity.
4. **Partial/multi-batch recovery:** every repayment identifies exactly one claim;
   there is no implicit distribution between people or claims. Recover that
   claim's oldest original-source portions first, including partial portions,
   into the explicitly selected destination account. Preserve original source
   IDs/rank; never create income or a new receipt batch. Later spending resumes
   ordinary account FIFO. Excess or pre-origin repayments are rejected.
5. **Borrowing:** each separately posted borrowing creates a liability-funded
   source batch and a payable, never external income. Borrowing repayment consumes
   ordinary account FIFO and is classified as principal return, never expense.
   It need not use the batch from the original borrowing: attribution identifies
   the capacity actually held in the selected account, not physical rupees.
6. **Friend-paid settlements:** the bill date recognizes expense/payable but has
   no liquid source allocation. Actual settlement consumes account FIFO as an
   expense attribution linked to the original bill/claim, without another expense
   journal posting. Reports must distinguish expense recognition date from cash
   allocation date. Borrowing principal return uses a separate allocation kind.
7. **Capacity/exhaustion:** original capacity equals consumed capacity plus liquid
   holdings plus receivable holdings. Remaining attribution includes recoverable
   receivables and is not a cash balance. Lending alone does not exhaust a source.
   Expense and principal return consume capacity; recovery relocates it. Exhaustion
   is the date remaining attributable capacity reaches zero. Incomplete runs never
   assert exhaustion. Refunds retain v1's reverse-slice restoration rule.
8. **Backdating/corrections:** rebuild a new immutable snapshot from the complete
   active history under the owner lock. Recompute source and claim portions from
   the deterministic order; prior snapshots retain their historical interpretation.
   A correction preserves operation kind and root order. Reject writes that make
   any historic liquid or claim balance invalid. No write-off, manual remapping,
   automatic netting or unexplained recovery is supported.
9. **Reversals/dependencies:** append exact opposite postings including claim IDs.
   Reverse all active settlements before reversing/correcting their originating
   claim/bill. Reversing a settlement reopens the same claim and replays recovered
   capacity; reject it if later spending would become unfunded. Corrected origins
   create new claims; cancelled old claims remain traceable. Refund eligibility
   remains the existing personal-expense workflow; shared bills use their linked
   correction/reversal workflows rather than an unclassified shared refund.
10. **Concurrency:** the existing per-owner PostgreSQL row lock serializes financial
    writes, durable retry receipts, obligation payments, claim caps and FIFO replay
    in one atomic transaction. Database constraints independently enforce ownership,
    exact balanced postings, nonnegative claim outstanding and snapshot conservation.
    Conflicting retries/overpayments roll back every related record.

These rules define the approved FIFO implementation. Recovery after write-off,
forgiveness, interest, manual allocation overrides, negative cleared balances and
automatic claim netting remain unsupported and require a future explicit decision;
their absence does not permit fabricated funds.

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

Actual owner payments recognize rent expense and cash movement. Confirmed
friend payments recognize the owner's rent expense and payable immediately,
without any owner cash posting.
Shared-rent payments must use the same shared-bill recognition and claim paths
and never book a second full personal expense. Partial shared-rent payments use
integer proportional allocation of remaining contractual shares, distributing
spare paise by largest remainder and stable participant order. Reversed payments
reopen the relevant outstanding amounts; excess payments are rejected.

Unpaid rent generation stays unrecognized. The rent payment endpoint confirms an
actual owner or friend payment; for shared rent it creates exactly one shared bill/event,
one rent-payment link and the same claim portions. Generic shared-bill creation
cannot attach itself to rent or mark an obligation paid; use the rent workflow.
Friend-paid shared bills recognize the approved payable; recording a landlord
payment by a friend against a generated rent obligation is not inferred from a
bill title or date. Such cross-workflow matching is not automatic. Rent-payment
correction/reversal uses the linked endpoint and never duplicates recognition.

**Approved friend-paid rent policy (2026-10-17):** retain the reserve protecting
the owner's share until repayment to the friend. Partial settlements release it
proportionally; final settlement releases all remaining protected capacity.
This closes the previously pending decision. No title/date matching is inferred.
POST to the existing obligation `/payments/` endpoint with exactly one of `payer`
(owned contact; friend paid the landlord) or `account` (owner paid). A friend may
pay personal rent without a contractual share; the generated bill includes that
payer with a zero share. `amount` is the gross landlord installment and the fixed
plan's remaining split determines the owner's recognized amount. Ordinary unpaid
obligations still have no financial recognition. `paid`/`outstanding` describe
landlord payments; `friend_payable` separately exposes the owner's remaining debt.

## Rent reserves

Reserves earmark funds against an existing rent obligation and never post a
ledger movement. Signed, immutable reserve changes describe creation, adjustment,
release and payment consumption. A change linked to a payment is active only
while that payment remains posted. Reversing a payment therefore restores the
consumed reserve at the same time as cash, without a second cash deduction.
Skipping an unpaid obligation releases its reserves with an auditable reason.

Active reserves cannot exceed unpaid gross landlord rent plus the owner's
outstanding payables from explicitly linked friend-paid rent. Distinct
reserves can earmark multiple future rent obligations. `safe_to_spend` is exactly
actual liquid postings minus active earmarks. It is signed: earmarking future
rent beyond today's cash exposes a shortfall without inventing money or a cleared
overdraft. This phase adds no generic budgeting, alerts or analytics.

### Deterministic protected portions and settlements

The existing `ReserveChange` audit journal carries optional claim and settlement
references; no separate cash or claim balance is introduced. A claim assignment
appends a negative unassigned change and an equal positive protected change,
both linked to the originating `RentPayment`. Its net reserve/cash effect is zero.

1. On friend payment or reserve creation/increase, assign available unassigned
   capacity to linked active payables by source effective date, source event ID,
   then claim UUID. Assign reserves in `(created_at, UUID)` order, up to each
   payable's actual outstanding amount. Previously protected portions stay with
   their claim. Partial landlord installments remain separate events/claims.
2. Owner rent payments consume only unassigned portions in reserve creation
   order. Explicit reserve adjustments cannot drop below protected portions.
   Friend payment never releases the owner's protected amount. For shared gross
   rent, unassigned excess beyond remaining landlord rent plus owner payables
   belongs to other participants' shares and is released with the original
   friend-payment link and an explicit reason. This is not owner-debt consumption.
3. Let `C` be this claim's currently protected paise, `O` its outstanding paise
   immediately before settlement, and `S` the actual repayment. Release
   `floor(C*S/O)` paise. Allocate that release proportionally across this claim's
   reserve portions, using integer largest remainders and creation-time/UUID ties.
   Floor rounding retains a residual earmark rather than releasing it early;
   when `S=O`, all `C` is released. Other claims' portions are untouched. A partially
   backed claim releases only its proportional backing; its unreserved remainder
   still reduces cash on settlement.
4. Consumption references the original rent payment, payable claim and actual
   settlement event. It is active only while both events remain unreversed.
   Reversal restores the exact consumed portions and cash/payable; it does not
   append a second cash movement or recompute an unrelated claim's earmark.
   Reverse active settlements before correcting/reversing their originating rent
   payment. Corrections append opposite postings and replacement records through
   the existing endpoints; reserve assignment is recalculated for the replacement.
   Corrections preserve owner-paid versus friend-paid operation kind; reverse and
   explicitly post a new payment to change that classification.
5. Reserves follow audited operation order and current outstanding amounts, not
   a fabricated historic cash movement. A backdated financial write still uses
   the existing complete ledger/claim validation and FIFO replay. Historic
   reserve changes are never rewritten; out-of-order settlement reversal restores
   its original signed portions. The owner lock makes concurrent release,
   outstanding checks, idempotency and source attribution one atomic operation.
6. PostgreSQL independently checks reference ownership, positive assignments,
   negative settlement consumption, nonnegative portions, protected capacity
   bounded by both the reserve and payable, assignments unable to create capacity, and total
   settlement consumption no larger than the repayment. Existing immutable
   audit triggers and private-table grants remain in force.

For cash INR 3000/reserve INR 2000, friend payment INR 2000 leaves both unchanged,
recognizes expense/payable INR 2000, and leaves safe-to-spend INR 1000. Repayment
INR 800 gives cash INR 2200/payable and reserve INR 1200. Final INR 1200 gives
cash INR 1000/payable and reserve zero. Expense stays INR 2000 and safe-to-spend
INR 1000 throughout. Actual execution evidence belongs in the phase reports.

## Security and verification

Owned querysets and owned foreign-key resolution return the same 404 for missing
and foreign resources. Session/CSRF authentication is preserved. New tables must
receive RLS and explicit revocation of Supabase client-role table/sequence grants.
Additive migrations are inspected before authorized development application;
destructive tests remain on the isolated remote test database. Actual results and
remaining blockers belong in phase-05-verification.md, not inferred from code.
