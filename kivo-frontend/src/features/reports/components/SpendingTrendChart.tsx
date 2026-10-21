"use client";

import * as React from "react";
import { formatInr } from "@/lib/formatters/currency";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendingDown, Calendar } from "lucide-react";
import type { SpendingTrendPoint, TrendInterval } from "../types";

interface SpendingTrendChartProps {
  dailyData: SpendingTrendPoint[];
  weeklyData: SpendingTrendPoint[];
  monthlyData: SpendingTrendPoint[];
  defaultInterval?: TrendInterval;
  className?: string;
}

export function SpendingTrendChart({
  dailyData,
  weeklyData,
  monthlyData,
  defaultInterval = "daily",
  className,
}: SpendingTrendChartProps) {
  const [interval, setInterval] = React.useState<TrendInterval>(defaultInterval);

  const activeData = React.useMemo(() => {
    switch (interval) {
      case "weekly":
        return weeklyData;
      case "monthly":
        return monthlyData;
      case "daily":
      default:
        return dailyData;
    }
  }, [interval, dailyData, weeklyData, monthlyData]);

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className || ""}`}
    >
      {/* Header with Title and Interval Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
              <TrendingDown className="size-4" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-foreground tracking-tight">
                Spending Velocity & Trend
              </h3>
              <p className="text-xs text-muted-foreground">
                Actual personal expenses over time. Transfers and loans are excluded.
              </p>
            </div>
          </div>
        </div>

        {/* Interval Selector */}
        <div
          className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs self-start sm:self-auto border border-border/60"
          role="tablist"
          aria-label="Trend interval"
        >
          <button
            type="button"
            role="tab"
            onClick={() => setInterval("daily")}
            aria-selected={interval === "daily"}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              interval === "daily"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            role="tab"
            onClick={() => setInterval("weekly")}
            aria-selected={interval === "weekly"}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              interval === "weekly"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            role="tab"
            onClick={() => setInterval("monthly")}
            aria-selected={interval === "monthly"}
            className={`rounded-md px-2.5 py-1 font-medium transition-all ${
              interval === "monthly"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* Chart Canvas or Empty State */}
      {activeData.length === 0 ? (
        <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 space-y-2 bg-muted/10 rounded-xl border border-dashed border-border">
          <Calendar className="size-6 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">No trend points available</span>
          <p className="text-xs text-muted-foreground max-w-xs">
            Spending trends populate automatically as personal expense records are accumulated.
          </p>
        </div>
      ) : (
        <div className="h-68 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={activeData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A5A40" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3A5A40" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
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
                    const dataPoint = payload[0].payload as SpendingTrendPoint;
                    return (
                      <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs space-y-1">
                        <span className="font-semibold text-foreground block">{label}</span>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground">Personal Expenses:</span>
                          <span className="font-mono font-semibold text-destructive">
                            {formatInr(dataPoint.expensesPaise)}
                          </span>
                        </div>
                        {dataPoint.incomePaise > 0 && (
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Eligible Inflows:</span>
                            <span className="font-mono font-semibold text-emerald-600">
                              {formatInr(dataPoint.incomePaise)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="expensesPaise"
                stroke="#3A5A40"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#expenseTrendGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
