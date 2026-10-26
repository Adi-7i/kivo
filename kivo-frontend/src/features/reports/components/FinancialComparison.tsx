import { ServerMoney } from "@/features/shared-financial/ServerMoney";
import type { SummaryDTO } from "../api";
export function FinancialComparison({ summary }: { summary: SummaryDTO }) {
  const prior = summary.comparison;
  return (
    <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4">
      <h2 className="font-heading font-bold text-base">Cycle-over-Cycle Comparison</h2>
      {!prior ? (
        <p className="text-xs text-muted-foreground">
          Comparison is unavailable for these date bounds.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            Selected {summary.period.period_start}–{summary.period.period_end} · Previous{" "}
            {prior.period_start}–{prior.period_end}
          </p>
          <dl className="grid sm:grid-cols-3 gap-3">
            {(
              [
                ["Previous personal expense", prior.personal_expense],
                ["Current personal expense", summary.personal_expense],
                ["Spending Variance", prior.difference],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-muted/20 p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd>
                  <ServerMoney value={value} />
                </dd>
              </div>
            ))}
          </dl>
          {prior.comparable && prior.percentage_difference != null ? (
            <p data-testid="report-comparison" className="text-xs">
              Compared with: {prior.percentage_difference}%
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Percentage comparison is unavailable: the current period is incomplete or prior
              expense is not positive.
            </p>
          )}
        </>
      )}
    </section>
  );
}
