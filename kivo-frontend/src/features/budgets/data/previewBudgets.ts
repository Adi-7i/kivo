import type { BudgetEntity, BudgetSummary } from "../types";

export const PREVIEW_BUDGET_SUMMARY: BudgetSummary = {
  period: "2026-10",
  overallLimitPaise: 6500000, // ₹65,000.00
  overallSpentPaise: 4425000, // ₹44,250.00
  overallRemainingPaise: 2075000, // ₹20,750.00
  utilizationPercent: 68,
  status: "normal",
  categoryCount: 6,
  overBudgetCategoriesCount: 1,
};

export const PREVIEW_BUDGETS: BudgetEntity[] = [
  {
    id: "b-overall-oct",
    type: "overall",
    period: "2026-10",
    limitPaise: 6500000, // ₹65,000.00
    spentPaise: 4425000, // ₹44,250.00
    notes: "Total monthly personal spending cap across all categories",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "b-groceries-oct",
    type: "category",
    categoryName: "Food & Groceries",
    categorySlug: "groceries",
    period: "2026-10",
    limitPaise: 1800000, // ₹18,000.00
    spentPaise: 1620000, // ₹16,200.00 (90% - warning)
    notes: "Supermarket staples, organic supplies, milk and daily produce",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "b-living-oct",
    type: "category",
    categoryName: "Living Expenses",
    categorySlug: "living",
    period: "2026-10",
    limitPaise: 1000000, // ₹10,000.00
    spentPaise: 1050000, // ₹10,500.00 (105% - exceeded/over budget)
    notes: "Apartment maintenance, society fund, laundry & domestic aid",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "b-utilities-oct",
    type: "category",
    categoryName: "Utilities & Bills",
    categorySlug: "utilities",
    period: "2026-10",
    limitPaise: 500000, // ₹5,000.00
    spentPaise: 320000, // ₹3,200.00 (64% - normal)
    notes: "ACT fiber broadband, electricity meter, mobile postpaid",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "b-dining-oct",
    type: "category",
    categoryName: "Dining & Entertainment",
    categorySlug: "dining",
    period: "2026-10",
    limitPaise: 800000, // ₹8,000.00
    spentPaise: 800000, // ₹8,000.00 (100% - full)
    notes: "Cafes, weekend dining with friends, and streaming subscriptions",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "b-transit-oct",
    type: "category",
    categoryName: "Transit & Fuel",
    categorySlug: "transit",
    period: "2026-10",
    limitPaise: 400000, // ₹4,000.00
    spentPaise: 210000, // ₹2,100.00 (52% - normal)
    notes: "Metro card recharges, auto-rickshaw rides, occasional Uber",
    createdAt: "2026-10-01T00:00:00Z",
  },
  {
    id: "b-shopping-oct",
    type: "category",
    categoryName: "Shopping & Personal",
    categorySlug: "shopping",
    period: "2026-10",
    limitPaise: 600000, // ₹6,000.00
    spentPaise: 240000, // ₹2,400.00 (40% - normal)
    notes: "Clothing, books, personal care and household items",
    createdAt: "2026-10-01T00:00:00Z",
  },
];

export const EXPENSE_CATEGORIES = [
  "Food & Groceries",
  "Living Expenses",
  "Utilities & Bills",
  "Dining & Entertainment",
  "Transit & Fuel",
  "Shopping & Personal",
  "Healthcare & Medical",
  "Other Expenses",
];
