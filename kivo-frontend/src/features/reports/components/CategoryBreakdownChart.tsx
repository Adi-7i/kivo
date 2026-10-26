"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { formatInr } from "@/lib/formatters/currency";
import { chartInrTick } from "../chart-format";
import { decimalPaise } from "@/features/finance/api";
import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import type { BreakdownDTO, BreakdownRow } from "../api";
const colors = ["#3A5A40", "#588157", "#A3B18A", "#2D6A4F", "#DAD7CD"];
export function CategoryBreakdownChart({
  data,
  total,
  onSelectCategory,
}: {
  data: BreakdownDTO;
  total: string;
  onSelectCategory: (row: BreakdownRow) => void;
}) {
  const [legendPage, setLegendPage] = useState(1);
  const rows = data.results.map((r) => ({
      ...r,
      name: r.label || "Unassigned",
      paise: decimalPaise(r.amount),
    })),
    signed = rows.some((r) => r.paise < 0);
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
      <h2 className="font-heading font-bold text-base">Expense Allocation by Category</h2>
      <p className="text-xs text-muted-foreground">
        Net personal expense: <ServerMoney value={total} />.
      </p>
      {!rows.length ? (
        <p className="h-56 grid place-items-center text-sm text-muted-foreground">
          No category expenses recorded
        </p>
      ) : (
        <>
          <div
            className="h-56 w-full min-w-0"
            role="img"
            aria-label={
              signed
                ? "Signed category expenses including refunds in INR"
                : "Category expenses in INR"
            }
          >
            <ResponsiveContainer width="100%" height="100%">
              {signed ? (
                <BarChart data={rows.slice(0, 20)}>
                  <XAxis dataKey="name" hide />
                  <YAxis
                    allowDecimals={false}
                    tickFormatter={chartInrTick}
                    width={75}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip formatter={(v) => formatInr(Number(v))} />
                  <Bar
                    dataKey="paise"
                    name="Net expense"
                    fill="#3A5A40"
                    isAnimationActive={false}
                  />
                </BarChart>
              ) : (
                <PieChart>
                  <Tooltip formatter={(v) => formatInr(Number(v))} />
                  <Pie
                    data={rows.slice(0, 20)}
                    dataKey="paise"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    isAnimationActive={false}
                  >
                    {rows.slice(0, 20).map((r, i) => (
                      <Cell key={r.key ?? "unassigned"} fill={colors[i % colors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
          {rows.length > 20 && (
            <p className="text-xs text-muted-foreground">
              Chart shows the first 20 groups. All groups are available in the detailed table.
            </p>
          )}
          <div className="max-h-48 overflow-auto space-y-1">
            {rows.slice((legendPage - 1) * 20, legendPage * 20).map((r, i) => (
              <button
                key={r.key ?? "unassigned"}
                type="button"
                disabled={!r.key}
                onClick={() => onSelectCategory(r)}
                aria-label={"Filter category: " + r.name}
                className="w-full flex gap-2 items-center justify-between text-left text-xs p-2 rounded-lg hover:bg-muted disabled:cursor-default"
              >
                <span className="flex gap-2 items-center min-w-0">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: colors[i % colors.length] }}
                  />
                  <span className="truncate">
                    {r.name} · {r.transaction_count} transactions
                  </span>
                </span>
                <ServerMoney value={r.amount} />
              </button>
            ))}
          </div>
          {rows.length > 20 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                disabled={legendPage <= 1}
                onClick={() => setLegendPage((p) => p - 1)}
              >
                Previous categories
              </button>
              <span>
                Page {legendPage} of {Math.ceil(rows.length / 20)}
              </span>
              <button
                type="button"
                disabled={legendPage * 20 >= rows.length}
                onClick={() => setLegendPage((p) => p + 1)}
              >
                Next categories
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
