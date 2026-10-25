export interface FinancialSummaryMetrics {
  liquidBalancePaise: number;
  safeToSpendPaise: number;
  todayExpensePaise: number;
  monthExpensePaise: number;
  monthReceivedPaise: number;
  moneyOwedToUserPaise: number;
  moneyOwedByUserPaise: number;
  reservedFundsPaise: number;
}

export interface SpendingChartDataPoint {
  date: string;
  displayDate: string;
  expensePaise: number;
  receiptPaise?: number;
}

export interface CategoryDistribution {
  categoryName: string;
  amountPaise: number;
  percentage?: number;
  color: string;
}
