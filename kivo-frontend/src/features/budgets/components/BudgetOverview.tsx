import { BudgetCard } from "./BudgetCard";
import type { BudgetDTO } from "../api";
export function BudgetOverview({
  budget,
  onEdit,
}: {
  budget: BudgetDTO;
  onEdit: (budget: BudgetDTO) => void;
}) {
  return (
    <div className="rounded-2xl border border-kivo-primary/20 bg-linear-to-b from-kivo-primary/5 to-card p-5 sm:p-6 space-y-3">
      <h2 className="font-heading font-bold text-lg">Overall Spending Budget</h2>
      <BudgetCard budget={budget} onEdit={onEdit} />
    </div>
  );
}
