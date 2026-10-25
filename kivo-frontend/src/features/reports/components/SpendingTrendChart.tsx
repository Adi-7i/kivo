"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { formatInr } from "@/lib/formatters/currency";
import { chartInrTick } from "../chart-format";
import { decimalPaise } from "@/features/finance/api";
import type { TrendsDTO, Interval } from "../api";
export function SpendingTrendChart({
  data,
  interval,
  onInterval,
}: {
  data: TrendsDTO;
  interval: Interval;
  onInterval: (value: Interval) => void;
}) {
  const [tablePage, setTablePage] = useState(1);
  const rows = data.results.slice(-366).map((r) => ({ ...r, paise: decimalPaise(r.amount) }));
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="font-heading font-bold text-base">Spending Velocity & Trend</h2>
        <div role="group" aria-label="Trend interval" className="flex gap-1">
          {(["day", "week", "month"] as const).map((v, i) => (
            <button
              key={v}
              type="button"
              aria-pressed={interval === v}
              onClick={() => onInterval(v)}
              className={`rounded-md px-2 py-1 text-xs ${interval === v ? "bg-kivo-primary text-white" : "bg-muted"}`}
            >
              {["Daily", "Weekly", "Monthly"][i]}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Signed personal expenses by effective date. Weekly buckets begin Monday; empty dates are not
        invented.
      </p>
      {!rows.length ? (
        <p className="h-64 grid place-items-center text-sm text-muted-foreground">
          No trend points available
        </p>
      ) : (
        <div
          className="h-68 w-full min-w-0"
          role="img"
          aria-label={interval + " personal expense trend in INR"}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="expenseTrendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3A5A40" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3A5A40" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis
                tick={{ fontSize: 10 }}
                allowDecimals={false}
                tickFormatter={chartInrTick}
                width={65}
              />
              <Tooltip formatter={(v) => formatInr(Number(v))} />
              <Area
                type="linear"
                dataKey="paise"
                name="Personal expense"
                stroke="#3A5A40"
                fill="url(#expenseTrendGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      {data.results.length > 366 && (
        <p className="text-xs text-muted-foreground">
          Chart shows the latest 366 buckets. Narrow the date range for more detail.
        </p>
      )}
      <details className="text-xs">
        <summary>Accessible trend data ({data.results.length} buckets)</summary>
        <div className="max-h-64 overflow-auto">
          <table className="w-full">
            <caption className="sr-only">Server expense trend values in INR</caption>
            <thead>
              <tr>
                <th scope="col">Bucket start</th>
                <th scope="col">Expense (INR)</th>
                <th scope="col">Transactions</th>
              </tr>
            </thead>
            <tbody>
              {data.results.slice((tablePage - 1) * 20, tablePage * 20).map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.amount}</td>
                  <td>{r.transaction_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 py-2">
            <button
              type="button"
              disabled={tablePage <= 1}
              onClick={() => setTablePage((p) => p - 1)}
            >
              Previous trend rows
            </button>
            <span>
              Page {tablePage} of {Math.max(1, Math.ceil(data.results.length / 20))}
            </span>
            <button
              type="button"
              disabled={tablePage * 20 >= data.results.length}
              onClick={() => setTablePage((p) => p + 1)}
            >
              Next trend rows
            </button>
          </div>
        </div>
      </details>
    </section>
  );
}
