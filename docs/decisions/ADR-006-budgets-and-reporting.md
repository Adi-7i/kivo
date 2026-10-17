# ADR-006: Derived budgets, reporting periods and safe exports

Status: implemented, subject to the executed verification gates in
[Phase 6 verification](../phases/phase-06-verification.md). Authorized by the
user's renewed Phase 6 directive on 2026-10-17. Phase 7 is excluded.

## Financial authority and scope

The `reports` app owns budget configuration and selectors. It stores no cash,
expense, dashboard or report totals. Budgets never post money or reject an
otherwise valid financial transaction. Current account balances and claim totals
are signed ledger postings. Reported economic history excludes reversed/voided
origins and technical reversal events; replacements and refunds contribute their
actual signed expense postings on their own effective dates. This reconciles
with compensating journal legs, while preserving all original audit records.

Receipt postings are external income; borrowing and recoveries are separate cash
inflow classifications. Opening equity is excluded from external cash flow.
Transfers are reported separately and excluded from gross external cash in/out.
Lending reduces cash and creates receivables, with no expense. Shared bills use
only the owner's expense posting. Friend-paid bills recognize that posting on
the bill date; later settlement affects cash/payable without another expense.
Unpaid ordinary rent contributes no recognized expense. Existing active rent
reserves reduce safe-to-spend, never actual liquid funds.

The new reporting paths do not implement or infer the pending friend-paid
landlord-bill/rent-obligation link in ADR-005. They report approved posted effects
and the existing reserve lifecycle. No reserve disposition rule is invented.

## Budget periods and warning semantics

An overall budget has no category. A category budget covers exactly that
category, including its linked refunds, rather than implicitly combining child
categories. Clients may configure a separate child category budget. Budget
figures must not be added together: an overall limit and category limits can
cover the same expenses.

Monthly budgets cover the first through last inclusive dates of one month.
Custom periods accept arbitrary inclusive boundaries, including multi-year
periods. Active periods cannot overlap within the same owner/category scope;
overall and different-category budgets may overlap. The owner lock and a
PostgreSQL trigger enforce this for concurrent writes. Archive rather than
delete; identities/ownership are immutable. PostgreSQL automatically appends
before/after configuration snapshots, including direct SQL updates. Audit rows
cannot be updated/deleted. Writes reuse the durable owner-wide retry namespace.

Limits are nonnegative integer paise. Warning percentages are configurable
integers from 1 through 100, default 80. States are `ok`, `warning`, `at_limit`
and `exceeded`; exceeding a limit never blocks spending. Remaining can be
negative. Overspending is max(spent minus limit, zero). Percentages use Decimal
and round half up to two places. With a zero limit, utilization is null; zero
or negative net spending is `ok`, and positive spending is `exceeded`. Refunds
can make net spending negative; it is not silently clamped to zero.

Budget pages use one conditional expense aggregate for the entire page.
Dashboard budget details are limited to 20 current active budgets, accompanied
by `budget_count`; the paginated budgets endpoint exposes the rest.

## Effective dates, averages and comparisons

Financial periods use DateField effective dates. Audit timestamps are never
substituted. The current user-local calendar uses the existing configured
`Asia/Kolkata` timezone and INR currency; there is no new user timezone preference
model. Responses identify timezone, currency, selected bounds and local as-of
date. Dashboard balance/reserves/claims are current posted values, not historic
balances inferred from a selected report period.

`week` means Monday through Sunday. `last_seven_days` means today minus six days
through today. Month/year presets cover full calendar periods; `previous_month`
handles variable month lengths and leap years. `date` selects exactly one day;
`date_from`/`date_to` are inclusive and may span years. Presets and explicit dates
cannot be combined. Unknown, repeated, malformed or conflicting query parameters
are rejected. History defaults to all retained records; reports and CSV default
to the current calendar month. Explicit filters are shared by all three paths.

Selected full periods include any posted future-effective records in their
bounds. `incomplete_period` is true when the selected end has not finished as of
the local date. Dashboard today/week/month/year spending is separately measured
from the relevant calendar start through today. `average_daily_expense` is net
selected expense divided by every inclusive calendar day in the selected range,
including zero-spending dates, rounded to two INR decimal places. Empty trends
are empty arrays; no dates or activity are invented.

A full calendar month compares to the prior calendar month. Other ranges compare
to the immediately preceding range of equal calendar-day length. Absolute
differences remain meaningful with a zero prior amount. Percentage differences
are null when prior expense is nonpositive or the current period is incomplete;
`comparable` is false. This avoids dividing by zero or presenting an incomplete
month as a completed month comparison. At the earliest representable dates, an
unrepresentable prior range returns null comparison.

Category, merchant, account, payment-method and primary-contact expense breakdowns
are additive over actual signed expense legs. Missing refund category/contact
comes from the original expense; blank refund merchant/payment method falls
back to its original metadata. Unknown dimensions remain explicit null/blank
groups. A multi-contact owner-paid bill has no single primary contact and falls
in the unassigned contact group. Filtering/searching by a participant returns its
associated bills and settlements without duplicating an expense across people;
such per-person filtered reports must not be summed across shared participants.

## Source analysis and consistency

Fund reports pin one existing immutable FIFO run, including historical v1 runs.
They reuse batch capacities, liquid/receivable positions, journeys and exhaustion
rules. Separate movement totals expose expense attribution, restored refunds,
principal returns, advances, recoveries and transfers. Advances/recoveries are
cumulative movement, not additional consumed capacity. Receivable holdings are
recoverable attribution, not liquid cash. No computed run gives null figures;
incomplete attribution never invents an exhaustion date.

Multi-query reports and budget progress execute in an atomic transaction holding
the existing owner row lock. Financial writes, reserve changes and budget changes
use that same protocol. Reads therefore observe one committed financial state
and temporarily serialize with that owner's writes. No mutable cache, independent
balance, worker or new infrastructure is introduced. Existing owner/effective-date
and foreign-key indexes support selection. Query counts are measured in tests;
no unmeasured throughput or dataset-size guarantee is claimed.

## CSV security and reconciliation

CSV is streamed as UTF-8 with BOM and exact two-place INR strings. The database
iterator uses chunks of 200 and preloads relationships per chunk, rather than
materializing all events. A stream holds the owner lock until completion or
closure to preserve reversal/filter consistency; slow clients can delay that
owner's writes. Deployment request timeouts/stream closure remain important.

All user-controlled text columns are escaped with a leading apostrophe if they
can begin a spreadsheet formula, including whitespace/control-prefixed `=`, `+`,
`-` and `@`. Generated numeric money values remain numeric decimal strings.
Responses use attachment, private/no-store and nosniff headers.

Exports retain original, reversed/voided and technical reversal records with
explicit status. Face `amount_inr` is an audit amount and must not be summed as
spending. `net_expense_inr` and `net_external_cash_inr` contribute zero for
inactive origins and technical reversals; active records use actual signed
postings. Summing these contribution columns under the same filters reconciles
with report net expense and external cash in minus cash out. A transfer's
external cash contribution is zero. The shared-bill face amount can be gross
while its expense contribution is only the owner's recognized share.
