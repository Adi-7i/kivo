"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatInr } from "@/lib/formatters/currency";
import type { SpendingChartDataPoint } from "../types";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface SpendingChartCardProps {
  data: SpendingChartDataPoint[];
  className?: string;
}

export function SpendingChartCard({ data, className }: SpendingChartCardProps) {
  const [interval, setInterval] = React.useState<"7d" | "30d">("7d");

  const displayData = React.useMemo(() => {
    if (interval === "7d") {
      return data.slice(-7);
    }
    return data;
  }, [data, interval]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
        <div>
          <CardTitle className="text-base font-bold font-heading">
            Daily Spending Trend
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Calendar-faithful expenditures across active ledger accounts.
          </CardDescription>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-muted p-1 text-xs">
          <button
            type="button"
            onClick={() => setInterval("7d")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              interval === "7d"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 7 Days
          </button>
          <button
            type="button"
            onClick={() => setInterval("30d")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              interval === "30d"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
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
                tickFormatter={(value) => `₹${Math.round(value / 100)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as SpendingChartDataPoint;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 text-xs shadow-md">
                        <p className="font-semibold text-foreground mb-1">{item.date}</p>
                        <p className="text-finance-expense font-medium font-tabular">
                          Expense: {formatInr(item.expensePaise)}
                        </p>
                        {item.receiptPaise > 0 && (
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
              <Bar dataKey="expensePaise" fill="var(--color-finance-expense)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

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
