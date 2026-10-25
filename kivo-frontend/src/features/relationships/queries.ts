"use client";
import { useOwnedList } from "@/features/finance/useOwnedQuery";
import type { EventDTO } from "@/features/finance/api";
import type { ContactDTO, ClaimDTO, BillDTO } from "./api";
export const useContacts = (enabled = true) =>
  useOwnedList<ContactDTO>("contacts", "/api/v1/contacts/", {}, enabled);
export const useClaims = (enabled = true) =>
  useOwnedList<ClaimDTO>("claims", "/api/v1/claims/", {}, enabled);
export const useBills = (enabled = true) =>
  useOwnedList<BillDTO>("shared-bills", "/api/v1/shared-bills/", {}, enabled);
export const useLoans = (enabled = true) =>
  useOwnedList<EventDTO>("loans", "/api/v1/loans/", {}, enabled);
export const useSettlements = (enabled = true) =>
  useOwnedList<EventDTO>("settlements", "/api/v1/settlements/", {}, enabled);
