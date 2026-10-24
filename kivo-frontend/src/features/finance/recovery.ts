export const FINANCIAL_ATTEMPT_PREFIX = "kivo:financial-write:";
export const FINANCIAL_ATTEMPT_CHANGED = "kivo:financial-write-changed";
export function clearFinancialAttempts() {
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith(FINANCIAL_ATTEMPT_PREFIX)) sessionStorage.removeItem(key);
  window.dispatchEvent(new Event(FINANCIAL_ATTEMPT_CHANGED));
}
