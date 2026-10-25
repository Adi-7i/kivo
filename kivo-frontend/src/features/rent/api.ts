import type { components } from "@/types/django.generated";
import { decimalPaise } from "@/features/finance/api";
import type { ContactDTO } from "@/features/relationships/api";
import type {
  RentPlanEntity,
  RentObligationEntity,
  RentReserveEntity,
  SpendingCapacityEntity,
} from "./types";
type S = components["schemas"];
export type PlanDTO = S["RentPlan"];
export type PlanInput = S["RentPlanCreateRequest"];
export type ObligationDTO = S["Obligation"];
export type PaymentDTO = S["RentPayment"];
export type PaymentInput = S["RentPaymentCreateRequest"];
export type ReserveDTO = S["Reserve"];
export type ReserveHistoryDTO = S["ReserveChange"];
export type ObligationHistoryDTO = S["ObligationHistory"];
export type CapacityDTO = S["SpendingCapacity"];
export function planEntity(p: PlanDTO, contacts: ContactDTO[]): RentPlanEntity {
  const owner = p.shares.find((s) => s.contact === null);
  if (!owner) throw new Error("The rent response did not confirm your share.");
  return {
    id: p.id,
    title: p.title,
    payee: p.payee,
    startDate: p.start_date,
    dueDay: p.due_day,
    amountPaise: decimalPaise(p.amount),
    category: p.category,
    active: p.active,
    createdAt: p.created_at,
    userSharePaise: decimalPaise(owner.amount),
    shares: p.shares.map((s) => ({
      contactId: s.contact,
      displayName: s.contact
        ? (contacts.find((c) => c.id === s.contact)?.display_name ?? s.contact)
        : "You",
      amountPaise: decimalPaise(s.amount),
    })),
  };
}
export const obligationEntity = (o: ObligationDTO): RentObligationEntity => ({
  id: o.id,
  planId: o.plan,
  month: o.month,
  dueDate: o.due_date,
  amountPaise: decimalPaise(o.amount),
  paidPaise: decimalPaise(o.paid),
  friendPayablePaise: decimalPaise(o.friend_payable),
  outstandingPaise: decimalPaise(o.outstanding),
  status: o.status,
  overdue: o.overdue,
  reason: o.reason ?? undefined,
  createdAt: o.created_at,
});
export const reserveEntity = (r: ReserveDTO, obligations: ObligationDTO[]): RentReserveEntity => ({
  id: r.id,
  obligationId: r.obligation,
  obligationMonth: obligations.find((o) => o.id === r.obligation)?.month,
  label: r.label,
  reservedPaise: decimalPaise(r.reserved),
  createdAt: r.created_at,
});
export const capacityEntity = (c: CapacityDTO): SpendingCapacityEntity => ({
  liquidBalancePaise: decimalPaise(c.liquid_balance),
  activeReservesPaise: decimalPaise(c.active_reserves),
  safeToSpendPaise: decimalPaise(c.safe_to_spend),
});
