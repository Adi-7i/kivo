import { decimalPaise } from "@/features/finance/api";
import { MoneyAmount } from "./MoneyAmount";

/** Representation only. Never derive a missing financial figure. */
export function ServerMoney({ value }: { value: string | null | undefined }) {
  return value == null ? (
    <span className="text-xs text-muted-foreground">Not computed</span>
  ) : (
    <MoneyAmount paise={decimalPaise(value)} size="sm" tabular />
  );
}
