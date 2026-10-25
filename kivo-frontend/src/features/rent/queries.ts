"use client";
import { useOwnedList, useOwnedQuery } from "@/features/finance/useOwnedQuery";
import type { PlanDTO, ObligationDTO, PaymentDTO, ReserveDTO, CapacityDTO } from "./api";
export const useRentPlans = () => useOwnedList<PlanDTO>("rent-plans", "/api/v1/rent/plans/");
export const useRentObligations = () =>
  useOwnedList<ObligationDTO>("rent-obligations", "/api/v1/rent/obligations/");
export const useRentReserves = () =>
  useOwnedList<ReserveDTO>("rent-reserves", "/api/v1/rent/reserves/");
export const useCapacity = () =>
  useOwnedQuery<CapacityDTO>("spending-capacity", "/api/v1/rent/spending-capacity/");
export const useRentPayments = (obligationId: string, enabled = true) =>
  useOwnedList<PaymentDTO>(
    "rent-payments",
    `/api/v1/rent/obligations/${obligationId}/payments/`,
    {},
    enabled
  );
