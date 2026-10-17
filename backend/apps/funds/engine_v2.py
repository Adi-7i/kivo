"""FIFO v2: liquid and receivable custody with separately classified consumption.

See ADR-005 for ordering, partial recovery and recognition-date semantics. V1 is
retained in engine.py so its historical policy remains explicit and testable.
"""

from __future__ import annotations

import heapq
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from uuid import UUID

from apps.funds.engine import Capacity, ExpenseSlice, Gap

POLICY_VERSION = "account-fifo-v2"


@dataclass(frozen=True, slots=True)
class Portion:
    claim_id: UUID | None
    amount_paise: int


@dataclass(frozen=True, slots=True)
class Entry:
    event_id: int
    kind: str
    amount_paise: int
    effective_date: date
    sequence: int
    account_id: UUID | None
    destination_id: UUID | None = None
    original_expense_id: int | None = None
    portions: tuple[Portion, ...] = ()
    claim_id: UUID | None = None
    expense_event_id: int | None = None


@dataclass(frozen=True, slots=True)
class Movement:
    event_id: int
    source_id: int
    kind: str
    amount_paise: int
    from_account_id: UUID | None
    to_account_id: UUID | None
    claim_id: UUID | None = None
    expense_event_id: int | None = None


@dataclass(frozen=True, slots=True)
class Result:
    capacities: list[Capacity]
    positions: dict[tuple[UUID, int], int]
    movements: list[Movement]
    gaps: list[Gap]
    claim_positions: dict[tuple[UUID, int], int]


def allocate(entries: list[Entry]) -> Result:
    ordered = sorted(entries, key=lambda row: (row.effective_date, row.sequence, row.event_id))
    if len({row.event_id for row in ordered}) != len(ordered):
        raise ValueError("Duplicate attribution event ID.")
    sources = {row.event_id: row for row in ordered if row.kind in ("opening", "receipt", "borrow")}
    holdings: dict[tuple[str, UUID], dict[int, int]] = defaultdict(dict)
    heaps: dict[tuple[str, UUID], list[tuple[date, int, int]]] = defaultdict(list)
    consumed: dict[int, int] = defaultdict(int)
    exhausted: dict[int, date | None] = defaultdict(lambda: None)
    expenses: dict[int, list[ExpenseSlice]] = defaultdict(list)
    movements: list[Movement] = []
    gaps: list[Gap] = []

    def credit(pocket: tuple[str, UUID], source_id: int, amount: int) -> None:
        if not holdings[pocket].get(source_id, 0):
            source = sources[source_id]
            heapq.heappush(heaps[pocket], (source.effective_date, source.sequence, source_id))
        holdings[pocket][source_id] = holdings[pocket].get(source_id, 0) + amount

    def take(pocket: tuple[str, UUID], amount: int) -> tuple[list[tuple[int, int]], int]:
        slices = []
        while amount and heaps[pocket]:
            rank = heapq.heappop(heaps[pocket])
            source_id = rank[2]
            available = holdings[pocket][source_id]
            used = min(amount, available)
            if used:
                slices.append((source_id, used))
            holdings[pocket][source_id] -= used
            amount -= used
            if holdings[pocket][source_id]:
                heapq.heappush(heaps[pocket], rank)
        return slices, amount

    for row in ordered:
        if type(row.amount_paise) is not int or row.amount_paise <= 0:
            raise ValueError("Attribution amounts must be positive integer paise.")
        if row.kind == "shared_due":
            continue  # Expense/payable recognition; cash attribution happens at settlement.
        if row.account_id is None:
            raise ValueError("Cash movements require an account.")
        account = ("account", row.account_id)
        if row.kind in ("opening", "receipt", "borrow"):
            credit(account, row.event_id, row.amount_paise)
            continue
        if row.kind == "repay_in":
            if row.claim_id is None:
                raise ValueError("Recovery requires a specific claim.")
            slices, missing = take(("claim", row.claim_id), row.amount_paise)
            for source_id, amount in slices:
                credit(account, source_id, amount)
                movements.append(
                    Movement(
                        row.event_id,
                        source_id,
                        "recover",
                        amount,
                        None,
                        row.account_id,
                        row.claim_id,
                    )
                )
            if missing:
                gaps.append(Gap(row.event_id, row.account_id, missing, "recovery_without_lineage"))
            continue
        if row.kind == "refund":
            missing = row.amount_paise
            for allocation in reversed(expenses.get(row.original_expense_id, [])):
                restored = min(missing, allocation.remaining_paise)
                if restored:
                    allocation.remaining_paise -= restored
                    consumed[allocation.source_id] -= restored
                    exhausted[allocation.source_id] = None
                    credit(account, allocation.source_id, restored)
                    movements.append(
                        Movement(
                            row.event_id,
                            allocation.source_id,
                            "refund",
                            restored,
                            None,
                            row.account_id,
                            expense_event_id=row.original_expense_id,
                        )
                    )
                    missing -= restored
                if not missing:
                    break
            if missing:
                gaps.append(
                    Gap(row.event_id, row.account_id, missing, "refund_without_eligible_lineage")
                )
            continue
        if row.kind == "transfer":
            if not row.destination_id or row.destination_id == row.account_id:
                raise ValueError("Transfer requires a distinct destination.")
            parts = [("transfer", None, row.amount_paise)]
        elif row.kind == "expense":
            parts = [("expense", None, row.amount_paise)]
        elif row.kind == "lend":
            if row.claim_id is None:
                raise ValueError("Lending requires a receivable claim.")
            parts = [("advance", row.claim_id, row.amount_paise)]
        elif row.kind == "shared_paid":
            if sum(part.amount_paise for part in row.portions) != row.amount_paise:
                raise ValueError("Shared portions must conserve gross cash.")
            if any(
                type(part.amount_paise) is not int or part.amount_paise < 0 for part in row.portions
            ):
                raise ValueError("Invalid shared portion.")
            parts = [
                ("advance" if part.claim_id else "expense", part.claim_id, part.amount_paise)
                for part in row.portions
                if part.amount_paise
            ]
        elif row.kind == "repay_out":
            if row.claim_id is None:
                raise ValueError("Settlement requires a payable claim.")
            parts = [
                ("expense" if row.expense_event_id else "principal", row.claim_id, row.amount_paise)
            ]
        else:
            raise ValueError(f"Unsupported attribution operation: {row.kind}")
        for kind, claim_id, amount in parts:
            slices, missing = take(account, amount)
            for source_id, used in slices:
                expense_id = (row.expense_event_id or row.event_id) if kind == "expense" else None
                movements.append(
                    Movement(
                        row.event_id,
                        source_id,
                        kind,
                        used,
                        row.account_id,
                        row.destination_id if kind == "transfer" else None,
                        claim_id,
                        expense_id,
                    )
                )
                if kind == "transfer":
                    credit(("account", row.destination_id), source_id, used)
                elif kind == "advance":
                    credit(("claim", claim_id), source_id, used)
                else:
                    consumed[source_id] += used
                    if kind == "expense":
                        expenses[expense_id].append(ExpenseSlice(source_id, used))
                    if consumed[source_id] == sources[source_id].amount_paise:
                        exhausted[source_id] = row.effective_date
            if missing:
                gaps.append(
                    Gap(row.event_id, row.account_id, missing, "insufficient_attributed_funds")
                )
    capacities = [
        Capacity(
            source_id,
            source.amount_paise,
            consumed[source_id],
            source.amount_paise - consumed[source_id],
            exhausted[source_id] if not gaps else None,
        )
        for source_id, source in sources.items()
    ]
    positions = {
        (pocket[1], source_id): amount
        for pocket, funds in holdings.items()
        for source_id, amount in funds.items()
        if amount and pocket[0] == "account"
    }
    claims = {
        (pocket[1], source_id): amount
        for pocket, funds in holdings.items()
        for source_id, amount in funds.items()
        if amount and pocket[0] == "claim"
    }
    return Result(capacities, positions, movements, gaps, claims)
