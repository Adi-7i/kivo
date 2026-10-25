"use client";
import { useOwnedList } from "@/features/finance/useOwnedQuery";
import type { BudgetDTO } from "./api";
export const useBudgets = (archived: string) =>
  useOwnedList<BudgetDTO>("budgets", "/api/v1/budgets/", archived === "all" ? {} : { archived });
