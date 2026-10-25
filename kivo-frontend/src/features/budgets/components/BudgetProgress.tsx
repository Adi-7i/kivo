import type { BudgetDTO } from "../api";
export function BudgetProgress({
  utilization,
  className,
  showLabel = false,
}: {
  utilization: BudgetDTO["utilization_percent"];
  className?: string;
  showLabel?: boolean;
}) {
  // Geometry only: retain the exact server percentage as the accessible value text.
  const width = utilization == null ? 0 : Math.min(100, Math.max(0, Number(utilization)));
  const label = utilization == null ? "Not defined for a zero limit" : utilization + "%";
  return (
    <div className={className}>
      {showLabel && <p className="text-xs text-muted-foreground mb-1">Utilization: {label}</p>}
      <div
        role="progressbar"
        aria-label="Budget utilization"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={utilization == null ? undefined : width}
        aria-valuetext={label}
        className="h-2 rounded-full bg-muted overflow-hidden"
      >
        <div
          className="h-full rounded-full bg-kivo-primary transition-all"
          style={{ width: width + "%" }}
        />
      </div>
    </div>
  );
}
