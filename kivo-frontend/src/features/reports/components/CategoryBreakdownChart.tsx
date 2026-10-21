"use client";

import * as React from "react";
import { formatInr } from "@/lib/formatters/currency";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { PieChart as PieIcon, Layers } from "lucide-react";
import type { CategorySpendingItem } from "../types";

interface CategoryBreakdownChartProps {
  data: CategorySpendingItem[];
  className?: string;
  onSelectCategory?: (category: CategorySpendingItem) => void;
}

export function CategoryBreakdownChart({
  data,
  className,
  onSelectCategory,
}: CategoryBreakdownChartProps) {
  const [hoveredSlug, setHoveredSlug] = React.useState<string | null>(null);

  const totalPaise = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.amountPaise, 0);
  }, [data]);

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className || ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
            <PieIcon className="size-4" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-foreground tracking-tight">
              Expense Allocation by Category
            </h3>
            <p className="text-xs text-muted-foreground">
              Relative expenditure distribution across categorized personal spending
            </p>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-64 w-full flex flex-col items-center justify-center text-center p-6 space-y-2 bg-muted/10 rounded-xl border border-dashed border-border">
          <Layers className="size-6 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">
            No category expenses recorded
          </span>
          <p className="text-xs text-muted-foreground max-w-xs">
            Categorized personal expenses will appear here once transactions are recorded.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Donut Chart Canvas */}
          <div className="md:col-span-5 h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload as CategorySpendingItem;
                      return (
                        <div className="rounded-lg border border-border bg-card p-2.5 shadow-md text-xs space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.category}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Amount:</span>
                            <span className="font-mono font-semibold text-destructive">
                              {formatInr(item.amountPaise)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-muted-foreground">Share:</span>
                            <span className="font-mono font-medium text-foreground">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="amountPaise"
                  nameKey="category"
                  onMouseEnter={(_, index) => {
                    if (data[index]) setHoveredSlug(data[index].slug);
                  }}
                  onMouseLeave={() => setHoveredSlug(null)}
                >
                  {data.map((entry) => (
                    <Cell
                      key={`cell-${entry.slug}`}
                      fill={entry.color}
                      stroke="var(--card)"
                      strokeWidth={2}
                      className="cursor-pointer transition-opacity"
                      opacity={hoveredSlug && hoveredSlug !== entry.slug ? 0.6 : 1}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label in Donut Hole */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                Total Expenses
              </span>
              <MoneyAmount paise={totalPaise} size="base" variant="expense" />
            </div>
          </div>

          {/* Category List & Legend */}
          <div className="md:col-span-7 space-y-2">
            <div className="max-h-56 overflow-y-auto pr-1 space-y-1.5 divide-y divide-border/40">
              {data.map((item) => (
                <div
                  key={item.slug}
                  onClick={() => onSelectCategory?.(item)}
                  onMouseEnter={() => setHoveredSlug(item.slug)}
                  onMouseLeave={() => setHoveredSlug(null)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                    hoveredSlug === item.slug ? "bg-muted/80 shadow-2xs" : "hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="size-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <span className="text-xs font-medium text-foreground block truncate">
                        {item.category}
                      </span>
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {item.transactionCount} transactions • {item.percentage}% of total
                      </span>
                    </div>
                  </div>

                  <MoneyAmount paise={item.amountPaise} size="sm" variant="expense" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
