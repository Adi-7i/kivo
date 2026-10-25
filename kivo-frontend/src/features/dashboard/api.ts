import type { components } from "@/types/django.generated";
import { decimalPaise } from "@/features/finance/api";
import type { FinancialSummaryMetrics } from "./types";
export type DashboardDTO = components["schemas"]["Dashboard"];
export type TrendsDTO = components["schemas"]["Trends"];
export type BreakdownDTO = components["schemas"]["ReportBreakdown"];
/** Only boundary conversion; Django supplies every metric independently. */
export function dashboardMetrics(
  value: Pick<
    DashboardDTO,
    "liquid_balance" | "safe_to_spend" | "spending" | "receivables" | "payables" | "reserved"
  > & { selected_period: Pick<DashboardDTO["selected_period"], "external_income"> }
): FinancialSummaryMetrics {
  return {
    liquidBalancePaise: decimalPaise(value.liquid_balance),
    safeToSpendPaise: decimalPaise(value.safe_to_spend),
    todayExpensePaise: decimalPaise(value.spending.today),
    monthExpensePaise: decimalPaise(value.spending.month),
    monthReceivedPaise: decimalPaise(value.selected_period.external_income),
    moneyOwedToUserPaise: decimalPaise(value.receivables),
    moneyOwedByUserPaise: decimalPaise(value.payables),
    reservedFundsPaise: decimalPaise(value.reserved),
  };
}
