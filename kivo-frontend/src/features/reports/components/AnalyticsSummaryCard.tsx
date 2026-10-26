import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import type { SummaryDTO } from "../api";
export function AnalyticsSummaryCard({ summary }: { summary: SummaryDTO }) {
  const metrics = [
    ["Personal Expenses", summary.personal_expense, "report-expense"],
    ["Eligible Inflows", summary.external_income, "report-income"],
    ["Daily Average", summary.average_daily_expense, "report-average"],
    ["Peak Spending Day", summary.highest_spending_day?.amount, "report-peak"],
  ] as const;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
      {metrics.map(([label, value, id]) => (
        <div
          key={id}
          className="rounded-xl border border-border/80 bg-card p-3.5 space-y-1 shadow-2xs min-w-0"
        >
          <h2 className="text-[10px] uppercase font-semibold text-muted-foreground">{label}</h2>
          <div data-testid={id} className="font-heading font-bold break-words">
            <ServerMoney value={value} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {id === "report-peak"
              ? (summary.highest_spending_day?.date ?? "No positive expense day")
              : id === "report-average"
                ? "All inclusive calendar days"
                : id === "report-income"
                  ? "External receipts; excludes borrowing and repayments"
                  : "Your personal spending"}
          </p>
        </div>
      ))}
      <div className="rounded-xl border border-kivo-primary/20 bg-card p-3.5 space-y-1">
        <h2 className="text-[10px] uppercase font-semibold text-muted-foreground">
          Cash received / paid
        </h2>
        <div data-testid="report-cash-received">
          <ServerMoney value={summary.money_received} />
        </div>
        <div data-testid="report-cash-paid">
          <ServerMoney value={summary.money_paid} />
        </div>
        <p className="text-[10px] text-muted-foreground">
          Separate external cash movements; transfers excluded
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3.5">
        <h2 className="text-[10px] uppercase font-semibold text-muted-foreground">
          Total Transactions
        </h2>
        <p data-testid="report-count" className="text-xl font-heading font-bold">
          {summary.transaction_count}
        </p>
        <p className="text-[10px] text-muted-foreground">Active economic records</p>
      </div>
    </div>
  );
}
