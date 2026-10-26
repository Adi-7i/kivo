"use client";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { decimalPaise } from "@/features/finance/api";
import { formatInr } from "@/lib/formatters/currency";
import { chartInrTick } from "../chart-format";
import type { SummaryDTO } from "../api";
export function IncomeExpenseChart({ summary }: { summary: SummaryDTO }) {
  const row = {
    period: summary.period.period_start + " – " + summary.period.period_end,
    income: decimalPaise(summary.external_income),
    expense: decimalPaise(summary.personal_expense),
  };
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
      <h2 className="font-heading font-bold text-base">Eligible Inflows vs Personal Expenses</h2>
      <p className="text-xs text-muted-foreground">
        Money received and personal spending for the selected period.
      </p>
      <div
        className="h-64 w-full min-w-0"
        role="img"
        aria-label="Selected period external income and personal expense in INR"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[row]} margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis
              allowDecimals={false}
              tickFormatter={chartInrTick}
              width={65}
              tick={{ fontSize: 10 }}
            />
            <Tooltip formatter={(v) => formatInr(Number(v))} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="income"
              name="Eligible external income"
              fill="#2D6A4F"
              maxBarSize={40}
              isAnimationActive={false}
            />
            <Bar
              dataKey="expense"
              name="Personal expense"
              fill="#B42318"
              maxBarSize={40}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Accounting Rule: borrowing and repayments are not eligible income; lending and transfers are
        not personal expense. Shared bills count your share as spending, rather than the whole bill.
      </p>
    </section>
  );
}
