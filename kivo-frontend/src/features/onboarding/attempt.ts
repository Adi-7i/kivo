import type { CreateAccountInput } from "./api";

export interface AccountAttempt {
  key: string;
  body: CreateAccountInput;
}
const prefix = "kivo:onboarding:";

export function readAttempt(userId: number): AccountAttempt | null {
  const raw = sessionStorage.getItem(`${prefix}${userId}`);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object" || !("key" in value) || !("body" in value)) return null;
    const attempt = value as AccountAttempt;
    return typeof attempt.key === "string" &&
      typeof attempt.body?.name === "string" &&
      ["cash", "bank", "wallet"].includes(attempt.body.kind) &&
      typeof attempt.body.opened_on === "string" &&
      typeof attempt.body.opening_balance === "string"
      ? attempt
      : null;
  } catch {
    return null;
  }
}

/** Tab-local recovery data only: no password, session cookie or authentication token. */
export function saveAttempt(userId: number, attempt: AccountAttempt): void {
  sessionStorage.setItem(`${prefix}${userId}`, JSON.stringify(attempt));
}

export function clearAttempt(userId: number): void {
  sessionStorage.removeItem(`${prefix}${userId}`);
}

export function clearOnboardingAttempts(): void {
  for (const key of Object.keys(sessionStorage))
    if (key.startsWith(prefix)) sessionStorage.removeItem(key);
}
