"""Pure deterministic account-aware FIFO. Attribution does not identify physical rupees."""

from __future__ import annotations

import heapq
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from uuid import UUID

POLICY_VERSION = "account-fifo-v1"


@dataclass(frozen=True, slots=True)
class Entry:
    event_id: int
    kind: str
    amount_paise: int
    effective_date: date
    sequence: int
    account_id: UUID
    destination_id: UUID | None = None
    original_expense_id: int | None = None


@dataclass(frozen=True, slots=True)
class Movement:
    event_id: int
    source_id: int
    kind: str
    amount_paise: int
    from_account_id: UUID | None
    to_account_id: UUID | None


@dataclass(frozen=True, slots=True)
class Gap:
    event_id: int | None
    account_id: UUID
    amount_paise: int
    code: str


@dataclass(frozen=True, slots=True)
class Capacity:
    source_id: int
    original_paise: int
    allocated_paise: int
    remaining_paise: int
    exhausted_on: date | None


@dataclass(frozen=True, slots=True)
class Result:
    capacities: list[Capacity]
    positions: dict[tuple[UUID, int], int]
    movements: list[Movement]
    gaps: list[Gap]


@dataclass(slots=True)
class ExpenseSlice:
    source_id: int
    remaining_paise: int


def allocate(entries: list[Entry]) -> Result:
    """Replay active economic events; reject unsupported future operation types.

    Transfers carry source holdings without consuming batch capacity. Partial
    refunds undo the original expense's last allocation slices first. A refund
    clears a prior exhaustion until subsequent net spending exhausts it again.
    Missing lineage is explicit and never filled by an invented funding source.
    """
    ordered = sorted(
        entries, key=lambda entry: (entry.effective_date, entry.sequence, entry.event_id)
    )
    if len({entry.event_id for entry in ordered}) != len(ordered):
        raise ValueError("Duplicate attribution event ID.")
    sources = {entry.event_id: entry for entry in ordered if entry.kind in ("opening", "receipt")}
    holdings: dict[UUID, dict[int, int]] = defaultdict(dict)
    heaps: dict[UUID, list[tuple[date, int, int]]] = defaultdict(list)
    allocated: dict[int, int] = defaultdict(int)
    exhausted: dict[int, date | None] = defaultdict(lambda: None)
    expenses: dict[int, list[ExpenseSlice]] = {}
    movements: list[Movement] = []
    gaps: list[Gap] = []

    def credit(account_id: UUID, source_id: int, amount: int) -> None:
        if not holdings[account_id].get(source_id, 0):
            source = sources[source_id]
            heapq.heappush(
                heaps[account_id], (source.effective_date, source.sequence, source.event_id)
            )
        holdings[account_id][source_id] = holdings[account_id].get(source_id, 0) + amount

    def take(account_id: UUID, amount: int) -> tuple[list[tuple[int, int]], int]:
        slices = []
        while amount and heaps[account_id]:
            rank = heapq.heappop(heaps[account_id])
            source_id = rank[2]
            available = holdings[account_id][source_id]
            used = min(available, amount)
            holdings[account_id][source_id] -= used
            amount -= used
            slices.append((source_id, used))
            if holdings[account_id][source_id]:
                heapq.heappush(heaps[account_id], rank)
        return slices, amount

    for entry in ordered:
        if type(entry.amount_paise) is not int or entry.amount_paise <= 0:
            raise ValueError("Attribution amounts must be positive integer paise.")
        amount = entry.amount_paise
        if entry.kind in ("opening", "receipt"):
            credit(entry.account_id, entry.event_id, amount)
        elif entry.kind in ("expense", "transfer"):
            if entry.kind == "transfer" and (
                not entry.destination_id or entry.destination_id == entry.account_id
            ):
                raise ValueError("Transfer requires a distinct destination.")
            slices, missing = take(entry.account_id, amount)
            if entry.kind == "expense":
                expenses[entry.event_id] = []
            for source_id, used in slices:
                destination = entry.destination_id if entry.kind == "transfer" else None
                movements.append(
                    Movement(
                        entry.event_id, source_id, entry.kind, used, entry.account_id, destination
                    )
                )
                if destination:
                    credit(destination, source_id, used)
                else:
                    allocated[source_id] += used
                    expenses[entry.event_id].append(ExpenseSlice(source_id, used))
                    if allocated[source_id] == sources[source_id].amount_paise:
                        exhausted[source_id] = entry.effective_date
            if missing:
                gaps.append(
                    Gap(entry.event_id, entry.account_id, missing, "insufficient_attributed_funds")
                )
        elif entry.kind == "refund":
            for allocation in reversed(expenses.get(entry.original_expense_id, [])):
                restored = min(amount, allocation.remaining_paise)
                if restored:
                    allocation.remaining_paise -= restored
                    allocated[allocation.source_id] -= restored
                    exhausted[allocation.source_id] = None
                    credit(entry.account_id, allocation.source_id, restored)
                    movements.append(
                        Movement(
                            entry.event_id,
                            allocation.source_id,
                            "refund",
                            restored,
                            None,
                            entry.account_id,
                        )
                    )
                    amount -= restored
                if not amount:
                    break
            if amount:
                gaps.append(
                    Gap(entry.event_id, entry.account_id, amount, "refund_without_eligible_lineage")
                )
        else:
            raise ValueError(f"Unsupported attribution operation: {entry.kind}")
    capacities = [
        Capacity(
            source_id,
            source.amount_paise,
            allocated[source_id],
            source.amount_paise - allocated[source_id],
            exhausted[source_id] if not gaps else None,
        )
        for source_id, source in sources.items()
    ]
    positions = {
        (account_id, source_id): amount
        for account_id, funds in holdings.items()
        for source_id, amount in funds.items()
        if amount
    }
    return Result(capacities, positions, movements, gaps)
