# ADR-004: Account-aware FIFO attribution with immutable revisions

Status: implemented; verification is recorded in the Phase 4 report.

The `funds` app derives source attribution from `ledger` events and never changes
ledger postings or stores an authoritative cash balance. Its pure `Entry` port
separates the deterministic engine from persistence and HTTP. Unsupported future
operation kinds fail explicitly; lending, repayments and shared expenses remain
Phase 5 work requiring explicit adapters and an approved attribution policy.

## Policy account-fifo-v1

Each positive opening-equity or external-receipt event identifies one permanent
funding batch. Separately received installments remain separate. Refunds and own
transfers do not create new source funds. All historical eligible sources retain
batch identities, including sources later reversed or superseded. Inactive
sources have no current capacity and return null capacity/exhaustion figures,
rather than pretending that cancellation is exhaustion. The source type is an
accounting classification, not an assertion that all received money is income.

Replay active economic events by effective date, then the stable root ordering
anchor documented in ADR-003, then event sequence. Within the paying account,
consume the oldest eligible source holdings first. Split an outgoing allocation
across batches when necessary. The engine uses per-account priority queues; no
money from another account can be implicitly spent. Transfers move attributed
holdings to the explicit destination, retain original source rank and lineage,
and consume zero global batch capacity. A transfer of an entire batch does not
exhaust it.

An expense increases its batches' allocated amount. A partial merchant refund
restores the original expense's last allocated slices first, back to the explicit
refund account. It cannot create a new batch or restore more than that expense
consumed. This deterministic refund rule is part of policy version v1; changing
it requires a new recorded policy version and recomputation. Net allocated plus
remaining attributed capacity always equals the source's original amount.

Exhaustion is the effective date on which the batch's net remaining capacity
reaches zero through expense allocation. A later refund that restores capacity
clears the current exhaustion date. A later complete depletion records its new
date. Duration counts inclusive calendar dates: October 16 through October 21
is six dates. A partial batch has no exhaustion date or elapsed exhaustion
duration. Incomplete attribution never supplies an exhaustion date, even when a
partially computed capacity happens to be zero.

FIFO is an accounting attribution model, not evidence identifying physical rupees.

## Transactions, recomputation and audit

Ledger posting orchestration explicitly invokes the funds service after checking
historical fundability, in the same PostgreSQL transaction and owner lock. All
financial event, posting, idempotency, batch and allocation records therefore
commit or roll back together. Duplicate financial requests reuse the existing
event and do not create new allocation runs.

Every changed journal produces a new immutable run with a public UUID, policy
version, input hash, recording timestamp, triggering event and previous-run
reference. The hash includes active ordered inputs and the immutable journal tip.
Old runs, capacities, holdings and allocations are retained. Backdated receipts,
transfers, expenses, reversals and corrections replay the complete active history,
so downstream reports use the corrected data. Replay holdings must match actual
liquid postings per account. The ledger remains the financial authority.

PostgreSQL guards enforce immutable snapshots, owner references, positive
allocations/holdings, capacity conservation, source amounts, per-event allocation
limits, explicit incomplete states and reconciliation of each batch's net
expenses with its holdings. Fund tables are private from Supabase client roles,
with RLS enabled and all client-role table/sequence privileges revoked.

Reports pin one run per request. `?run=<owned UUID>` retrieves a retained snapshot.
A batch absent from the chosen snapshot reports no computed capacity; it never
inherits amounts from a different run. Lists and journeys are paginated; related
source/event data is joined or prefetched, avoiding one query per response row.

Full replay is deliberate for correctness at this stage: computation uses
priority queues and bulk persistence, but retained snapshots grow with history
and write count. No throughput benchmark or unbounded-scale claim is made.
Checkpointing/retention requires a later design that preserves audit provenance.

## Incomplete legacy history and deferred decisions

Normal financial writes require complete attribution and reject conflicts with
409, rolling back the entire write. No automatic receipt, implicit transfer,
negative source capacity, write-off, manual override or invented exhaustion date
is permitted.

`rebuild_funds --all` (or `--user-id`) is an explicit backfill/audit operation.
For preexisting inconsistent history it may retain an `incomplete` run with
positive, named gaps and exits with an error. It does not change financial truth.
`--check` compares persisted attribution to a fresh replay without writing.
The API exposes `not_computed`, `complete`, `incomplete` and inactive source states.

Product approval is needed to define provisional/unexplained funding, cleared
overdrafts, manual reassignment precedence, recovery write-offs and conflict
resolution policy. None is invented here. New actual financial records and
auditable corrections continue to use the approved ledger services.

## Phase 7 review

The subsequently approved v2 policy in ADR-005 governs lending and recovery;
remaining source capacity includes receivable custody. Liquid exhaustion in older
illustrative scenarios is not substituted for v2 capacity exhaustion. Phase 7
verifies retained v1 and current v2 without changing that approved policy.
See [verification](../phases/phase-07-verification.md) for executed scenarios and
the separate production role/deployment gates.
