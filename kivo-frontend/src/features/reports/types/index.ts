export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_7_days"
  | "this_month"
  | "previous_month"
  | "this_year"
  | "custom";

export type TrendInterval = "daily" | "weekly" | "monthly";

export interface ReportFilterState {
  period: PeriodPreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  accountId?: string;
  category?: string;
  transactionType?: string;
  contactId?: string;
  merchant?: string;
  paymentMethod?: string;
}

export interface AnalyticsSummary {
  periodLabel: string;
  totalExpensesPaise: number;
  eligibleIncomePaise: number;
  netCashFlowPaise: number;
  avgDailySpendingPaise: number;
  highestSpendingDay: {
    date: string;
    amountPaise: number;
  };
  transactionCount: number;
}

export interface SpendingTrendPoint {
  date: string;
  label: string;
  expensesPaise: number;
  incomePaise: number;
}

export interface CategorySpendingItem {
  category: string;
  slug: string;
  amountPaise: number;
  percentage: number;
  transactionCount: number;
  color: string;
}

export interface IncomeVsExpenseItem {
  period: string;
  eligibleIncomePaise: number;
  personalExpensePaise: number;
  netSavingsPaise: number;
}

export interface DistributionItem {
  name: string;
  amountPaise: number;
  percentage: number;
  count: number;
}

export interface SpendingDistribution {
  byAccount: DistributionItem[];
  byPaymentMethod: DistributionItem[];
  byMerchant: DistributionItem[];
  byPerson: DistributionItem[];
}

export interface PeriodComparison {
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  currentExpensePaise: number;
  previousExpensePaise: number;
  changePaise: number;
  changePercent: number | null; // null if previous was 0 to avoid zero-denominator issues
  trendDirection: "increased" | "decreased" | "unchanged";
  currentIncomePaise: number;
  previousIncomePaise: number;
}

export interface CSVExportConfig {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  accountId?: string;
  category?: string;
  transactionType?: string;
  includeHeaders: boolean;
  exportEncoding: "utf-8" | "iso-8859-1";
}
