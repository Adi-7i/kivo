"use client";

import * as React from "react";
import { formatInr } from "@/lib/formatters/currency";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { Scale, Info } from "lucide-react";
import type { IncomeVsExpenseItem } from "../types";

interface IncomeExpenseChartProps {
  data: IncomeVsExpenseItem[];
  className?: string;
}

export function IncomeExpenseChart({ data, className }: IncomeExpenseChartProps) {
  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className || ""}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
            <Scale className="size-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-foreground tracking-tight">
              Earned Inflows vs Personal Expenses
            </h3>
            <p className="text-xs text-muted-foreground">
              Direct comparison between eligible incoming money and recorded personal expenditures
            </p>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 space-y-2 bg-muted/10 rounded-xl border border-dashed border-border">
          <Scale className="size-6 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            No comparison periods available
          </span>
          <p className="text-xs text-muted-foreground max-w-xs">
            Income vs expense comparisons will appear once multiple monthly periods are active.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="period"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(val: number) => `₹${Math.round(val / 100000)}k`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as IncomeVsExpenseItem;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs space-y-1.5 min-w-44">
                          <span className="font-semibold text-foreground block border-b border-border/60 pb-1">
                            {label}
                          </span>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-emerald-600" />
                              <span>Eligible Inflows:</span>
                            </span>
                            <span className="font-mono font-semibold text-emerald-600">
                              {formatInr(item.eligibleIncomePaise)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <span className="size-2 rounded-full bg-destructive" />
                              <span>Personal Expenses:</span>
                            </span>
                            <span className="font-mono font-semibold text-destructive">
                              {formatInr(item.personalExpensePaise)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 pt-1 border-t border-border/40 font-medium">
                            <span className="text-foreground">Net Savings:</span>
                            <span
                              className={`font-mono font-semibold ${
                                item.netSavingsPaise >= 0 ? "text-emerald-600" : "text-destructive"
                              }`}
                            >
                              {formatInr(item.netSavingsPaise)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar
                  dataKey="eligibleIncomePaise"
                  name="Eligible Inflow"
                  fill="#2D6A4F"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
                <Bar
                  dataKey="personalExpensePaise"
                  name="Personal Expense"
                  fill="#B42318"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Financial Clarification Banner */}
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-[11px] text-muted-foreground flex items-start gap-2">
            <Info className="size-3.5 text-kivo-secondary shrink-0 mt-0.5" />
            <span>
              <strong>Accounting Rule:</strong> Account transfers, loan disbursements to friends,
              and borrowing receipts are excluded from this comparison because they represent asset
              swaps or liability changes, not personal spending or income.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
