"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { decimalPaise } from "@/features/finance/api";
import { formatInr } from "@/lib/formatters/currency";
import { chartInrTick } from "../chart-format";
import type { BreakdownDTO, Dimension } from "../api";
export function SpendingDistributionChart({
  data,
  dimension,
  onDimension,
}: {
  data?: BreakdownDTO;
  dimension: Dimension;
  onDimension: (value: Dimension) => void;
}) {
  const choices = [
    ["account", "By Account"],
    ["payment_method", "By Method"],
    ["merchant", "By Merchant"],
    ["contact", "By Person"],
    ["kind", "By Type"],
  ] as const;
  const rows = (data?.results ?? [])
    .slice(0, 20)
    .map((r) => ({ name: r.label || "Unassigned", paise: decimalPaise(r.amount) }));
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 min-w-0">
      <h2 className="font-heading font-bold text-base">Spending Channels & Distribution</h2>
      <div role="group" aria-label="Distribution channel" className="flex flex-wrap gap-1">
        {choices.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={key === dimension}
            onClick={() => onDimension(key)}
            className={`rounded-md px-2 py-1 text-xs ${key === dimension ? "bg-kivo-primary text-white" : "bg-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {!data ? (
        <p className="text-xs text-muted-foreground">Loading selected breakdown…</p>
      ) : !rows.length ? (
        <p className="h-56 grid place-items-center text-sm text-muted-foreground">
          No spending for this breakdown.
        </p>
      ) : (
        <div
          className="h-64 w-full min-w-0"
          role="img"
          aria-label={dimension + " expense amounts in INR"}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ left: 10, right: 10 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} minTickGap={25} />
              <YAxis
                allowDecimals={false}
                tickFormatter={chartInrTick}
                width={65}
                tick={{ fontSize: 10 }}
              />
              <Tooltip formatter={(v) => formatInr(Number(v))} />
              <Bar
                dataKey="paise"
                name="Net personal expense"
                fill="#3A5A40"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        First 20 groups plotted; all server groups are in the detailed table. Unassigned people
        remain unassigned. Participant-filtered reports must not be added across people.
      </p>
    </section>
  );
}
