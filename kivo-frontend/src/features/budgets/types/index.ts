export type BudgetType = "overall" | "category";

export type BudgetStatus = "normal" | "warning" | "full" | "exceeded";

export interface BudgetEntity {
  id: string;
  type: BudgetType;
  categoryName?: string;
  categorySlug?: string;
  period: string; // e.g. "2026-10"
  limitPaise: number;
  spentPaise: number;
  notes?: string;
  createdAt: string;
}

export interface BudgetSummary {
  period: string;
  overallLimitPaise: number;
  overallSpentPaise: number;
  overallRemainingPaise: number;
  utilizationPercent: number;
  status: BudgetStatus;
  categoryCount: number;
  overBudgetCategoriesCount: number;
}
