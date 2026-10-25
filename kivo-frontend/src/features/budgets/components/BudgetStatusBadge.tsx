import { Badge } from "@/components/ui/badge";
import type { BudgetDTO } from "../api";
export function BudgetStatusBadge({
  status,
  warningPercent,
  className,
}: {
  status: BudgetDTO["warning_state"];
  warningPercent?: number;
  className?: string;
}) {
  const labels = {
    ok: "On Track",
    warning: "Approaching Limit",
    at_limit: "100% Utilized",
    exceeded: "Over Budget",
  };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${status === "exceeded" ? "border-destructive/40 text-destructive bg-destructive/10" : status === "warning" ? "border-amber-400 text-amber-900 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300" : "border-kivo-primary/30 bg-kivo-primary/10 text-kivo-primary"} ${className ?? ""}`}
    >
      {labels[status]}
      {status === "warning" && warningPercent != null ? ` (${warningPercent}%+)` : ""}
    </Badge>
  );
}
