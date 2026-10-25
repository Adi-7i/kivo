import { formatInr } from "@/lib/formatters/currency";
/** Recharts generates fractional axis coordinates even for integer-paise data.
 * Round only visual tick coordinates; financial points/tooltips retain exact server paise.
 */
export function chartInrTick(value: unknown): string {
  const tick = Math.round(Number(value));
  return Number.isSafeInteger(tick) ? formatInr(tick) : "";
}
