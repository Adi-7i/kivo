import type { components } from "@/types/django.generated";
import { decimalPaise, type EventDTO } from "@/features/finance/api";
import type { ContactEntity } from "@/features/people/types";
import type { ClaimEntity } from "@/features/lending/types";
import type { SharedBillEntity } from "@/features/shared-expenses/types";
import type { CategoryDTO } from "@/features/finance/api";
export type ContactDTO = components["schemas"]["Contact"];
export type ContactInput = components["schemas"]["ContactWriteRequest"];
export type ClaimDTO = components["schemas"]["Claim"];
export type LoanInput = components["schemas"]["LoanWriteRequest"];
export type SettlementInput = components["schemas"]["SettlementWriteRequest"];
export type BillDTO = components["schemas"]["Bill"];
export type BillInput = components["schemas"]["BillWriteRequest"];
export const contactEntity = (c: ContactDTO): ContactEntity => ({
  id: c.id,
  displayName: c.display_name,
  notes: c.notes,
  isRoommate: c.is_roommate,
  archived: c.archived,
  createdAt: c.created_at,
  receivablePaise: decimalPaise(c.receivable),
  payablePaise: decimalPaise(c.payable),
});
export function claimEntity(
  c: ClaimDTO,
  contacts: ContactDTO[],
  events: EventDTO[] = []
): ClaimEntity {
  const origin = events.find((e) => e.id === c.source_event);
  return {
    id: c.id,
    contactId: c.contact,
    contactName: contacts.find((p) => p.id === c.contact)?.display_name ?? c.contact,
    direction: c.direction,
    title: origin?.title ?? `Claim ${c.id}`,
    principalPaise: decimalPaise(c.principal),
    outstandingPaise: decimalPaise(c.outstanding),
    status: c.status,
    createdAt: c.created_at,
    effectiveDate: origin?.effective_date,
    sourceEventId: c.source_event,
    notes: origin?.notes,
  };
}
export function billEntity(
  b: BillDTO,
  contacts: ContactDTO[],
  claims: ClaimDTO[],
  categories: CategoryDTO[]
): SharedBillEntity {
  const owner = b.shares.find((s) => s.contact === null);
  if (!owner) throw new Error("The server did not confirm the owner's bill share.");
  const related = b.shares.flatMap((s) => (s.claim ? claims.filter((c) => c.id === s.claim) : []));
  const missing = b.shares.some((s) => s.claim && !claims.some((c) => c.id === s.claim));
  const status =
    b.event.status !== "posted"
      ? b.event.status === "voided"
        ? "voided"
        : "reversed"
      : missing
        ? "not_verified"
        : related.every((c) => c.status === "settled" || c.status === "cancelled")
          ? "all_settled"
          : related.some((c) => c.status === "partial" || c.status === "settled")
            ? "partially_settled"
            : "unsettled";
  return {
    id: b.id,
    title: b.event.title,
    amountPaise: decimalPaise(b.event.amount),
    category:
      categories.find((c) => c.id === b.event.category)?.name ??
      b.event.category ??
      "Uncategorized",
    effectiveDate: b.event.effective_date,
    payerContactId: b.payer,
    payerName: b.payer ? (contacts.find((c) => c.id === b.payer)?.display_name ?? b.payer) : "You",
    splitMethod: b.split_method,
    userSharePaise: decimalPaise(owner.amount),
    shares: b.shares.map((s) => ({
      contactId: s.contact,
      displayName: s.contact
        ? (contacts.find((c) => c.id === s.contact)?.display_name ?? s.contact)
        : "You",
      amountPaise: decimalPaise(s.amount),
      claimId: s.claim ?? undefined,
    })),
    merchant: b.event.merchant,
    notes: b.event.notes,
    status,
    createdAt: b.created_at,
  };
}
