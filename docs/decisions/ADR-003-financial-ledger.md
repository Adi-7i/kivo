# ADR-003: Immutable ledger and conservative posting policy

Status: implemented for Phase 3; verification is recorded separately.

The `ledger` Django app owns accounts, expense categories, financial events,
postings and durable retry receipts. It uses the existing Django user and session
authentication. A later `funds` app may derive attribution from these events, but
must never maintain an independent liquid balance.

Money is INR integer paise in PostgreSQL `bigint` columns. API money must be JSON
strings with exactly two decimal places, such as `"1000.00"`. Numeric JSON money,
negative input, extra precision and scientific notation are rejected. Individual
positive amounts are capped at 9,000,000,000,000,000 paise. Opening funds may be
zero, in which case no zero-valued event is created.

Each event has exactly two signed, debit-positive postings. Opening funds debit a
liquid account and credit opening equity. External receipts credit the external
receipts book; this reports money received and is not a tax/income determination.
Expenses debit the expense book and credit liquid assets. Transfers debit one
owned liquid account and credit another. Refunds debit an explicit owned account
and credit expense, with a required original expense reference. A refund is
limited to the original expense's still-refundable amount and cannot predate it.

PostgreSQL deferred constraint triggers require two equal opposing legs at commit
and verify their financial meaning and owner references. Ordinary row UPDATE and
DELETE operations on events, postings and retry receipts are rejected by database
triggers. Account ownership, kind and opening date cannot be reassigned. The
application never offers delete APIs for accounts, categories or financial history.
Database administration and backups remain privileged operational boundaries;
table-owner credentials are not a substitute for a restricted production role.

Every financial operation locks the owning Django user row inside
`transaction.atomic()`. The single documented lock order avoids cross-account
deadlocks and serializes concurrent retries, overspending and future attribution
recomputation for the same owner. Different owners have independent locks.
Financial request fingerprints include the operation, target and validated input.
An identical `Idempotency-Key` returns the same public resource UUID with HTTP 200;
a first successful write returns 201. Conflicting reuse returns 409. Keys are
owner-wide, have no automatic expiry, and commit with the financial event. Failed
writes leave neither postings nor consumed keys.

Balances always sum actual liquid postings, including compensating reversals.
Net personal expense sums expense postings. Archived accounts remain included in
combined liquid assets, and only zero-balance accounts may be archived. Archived
accounts and categories cannot receive new postings. Categories support two
levels; active subcategories must be archived before their parent. Default
categories are seeded explicitly by an idempotent defaults endpoint and remain
customizable.

Financial corrections never change an existing event. A reversal negates every
original leg, takes the original effective date, and records a required reason.
A void is an explicitly marked historical cancellation using that same mechanism.
A correction atomically reverses and supersedes the original with the same
financial operation kind. A reversed event or reversal cannot be reversed again;
reverse dependent refunds first. Actual later merchant refunds use refund events,
not historical cancellation.

Effective date is the economic date; creation timestamp is the immutable recording
time. Normal same-date events order by internal sequence. Corrections inherit the
first event's ordering anchor, retaining same-day funding position. UUIDs are the
only public financial resource identifiers. Historical fundability is checked over
active economic events, excluding reversed originals and their compensating legs.
Every account must remain nonnegative throughout that ordering. Backdated writes
and corrections that violate this rule return an explicit 409 and roll back.
Opening funds cannot predate account opening, and no transaction may predate any
participating account. Balances describe all posted events; the API does not model
pending or scheduled transactions.

No overdraft, fabricated receipt, implicit transfer, provisional funding, manual
override or write-off is introduced. A product decision is required before such
recovery policies can be added. The safe implemented behavior is rejection with
an explicit insufficient-funds conflict. Lending, debt repayment and shared
expenses are deferred to Phase 5.

Owner-scoped selectors back all list and detail endpoints. Related UUIDs are
resolved within the authenticated owner. Missing and foreign-owned resources
both return 404. CSRF remains enforced by the existing session authentication.

The live privilege audit found that Supabase default grants exposed Django user,
session and financial tables to `anon` and `authenticated` while RLS was disabled.
Migration `ledger.0003_django_table_privacy` explicitly enables RLS and revokes
table/sequence privileges from PUBLIC and Supabase client roles (including
`service_role`) for Django-owned data. There are no client-role RLS policies:
identity and access are exclusively managed by Django. The database owner used
for the authorized development connection retains access. This migration depends
on the complete existing Django authentication/session migrations, so fresh
installations are protected too. It deliberately has no automatic downgrade that
would re-expose private data. This changes database privileges without replacing
or rewriting authentication.

Supabase's default grants were not changed globally for unrelated objects. New
Django-owned tables in future phases must receive the same explicit privacy
protection in their additive migrations.

Sources: [Django transactions](https://docs.djangoproject.com/en/6.1/topics/db/transactions/),
[Django row locking](https://docs.djangoproject.com/en/6.1/ref/models/querysets/#select-for-update),
[PostgreSQL deferred constraint triggers](https://www.postgresql.org/docs/17/sql-createtrigger.html).
