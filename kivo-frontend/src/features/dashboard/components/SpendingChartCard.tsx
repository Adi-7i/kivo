"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatInr } from "@/lib/formatters/currency";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { TrendingDown } from "lucide-react";
import type { SpendingChartDataPoint } from "../types";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface SpendingChartCardProps {
  data: SpendingChartDataPoint[];
  className?: string;
  range?: "last_seven_days" | "month";
  onRangeChange?: (range: "last_seven_days" | "month") => void;
}

export function SpendingChartCard({
  data,
  className,
  range = "last_seven_days",
  onRangeChange,
}: SpendingChartCardProps) {
  const displayData = data;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
        <div>
          <CardTitle className="text-base font-bold font-heading">Daily Spending Trend</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Your daily spending across active accounts.
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => onRangeChange?.("last_seven_days")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              range === "last_seven_days"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => onRangeChange?.("month")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              range === "month"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Month to Date
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {displayData.length === 0 ? (
          <div className="h-64 w-full flex items-center justify-center">
            <FinancialEmptyState
              icon={<TrendingDown className="size-6 text-muted-foreground" />}
              title="No Spending Recorded"
              description="Record your daily expenses via Quick Add to track spending trends."
              className="w-full border-none bg-transparent"
            />
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="displayDate"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val: number) => (Number.isSafeInteger(val) ? formatInr(val) : "")}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0]!.payload as SpendingChartDataPoint;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
                          <p className="font-semibold text-foreground mb-1">{item.date}</p>
                          <p className="text-finance-expense font-medium font-tabular">
                            Expense: {formatInr(item.expensePaise)}
                          </p>
                          {item.receiptPaise !== undefined && item.receiptPaise > 0 && (
                            <p className="text-finance-income font-medium font-tabular mt-0.5">
                              Received: {formatInr(item.receiptPaise)}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  isAnimationActive={false}
                  dataKey="expensePaise"
                  fill="var(--color-finance-expense)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Screen-reader accessible table fallback */}
        <div className="sr-only">
          <table>
            <caption>Daily Spending Summary</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Expense Amount</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{formatInr(d.expensePaise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
