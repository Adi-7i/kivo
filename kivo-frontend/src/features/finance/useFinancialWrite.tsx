"use client";
import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import { apiClient } from "@/lib/api/client";
import { KivoApiError } from "@/lib/api/errors";
import { invalidateFinance } from "./queries";
import { financialError } from "./validation";
import { Button } from "@/components/ui/button";
import {
  FINANCIAL_ATTEMPT_PREFIX as PREFIX,
  FINANCIAL_ATTEMPT_CHANGED as CHANGED,
} from "./recovery";

interface Attempt {
  endpoint: string;
  method: "POST" | "PATCH";
  key: string;
  body: unknown;
}
const subscribe = (callback: () => void) => {
  window.addEventListener(CHANGED, callback);
  return () => window.removeEventListener(CHANGED, callback);
};
function useStoredAttempt(slot: string) {
  const { data: user } = useSession();
  const storageKey = `${PREFIX}${user?.id}:${slot}`;
  const raw = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return user ? sessionStorage.getItem(storageKey) : null;
      } catch {
        return null;
      }
    },
    () => null
  );
  return { user, storageKey, raw };
}

/** A committed original may already be reversed; its pending recovery must remain accessible. */
export function usePendingFinancialWrite(slot: string): boolean {
  return !!useStoredAttempt(slot).raw;
}

/** Persist intent before sending. Never automatically repeat a financial write. */
export function useFinancialWrite(slot: string, singleUse = false) {
  const { user, storageKey, raw } = useStoredAttempt(slot);
  const client = useQueryClient();
  const attempt: Attempt | null = React.useMemo(() => {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Attempt;
      if (
        typeof parsed.key !== "string" ||
        !/^\/api\/v1\/(accounts|transactions|contacts|loans|settlements|shared-bills|budgets|rent\/(?:plans|obligations|payments|reserves))\//.test(
          parsed.endpoint
        ) ||
        !["POST", "PATCH"].includes(parsed.method)
      )
        throw new Error();
      return parsed;
    } catch {
      return null;
    }
  }, [raw]);
  const lock = React.useRef(false);
  const confirmed = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [checked, setChecked] = React.useState(false);
  const persist = (value: Attempt | null) => {
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
    window.dispatchEvent(new Event(CHANGED));
  };
  const perform = async <T extends { id: string }>(value: Attempt): Promise<T | null> => {
    if (lock.current || !user) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    setChecked(false);
    try {
      const result = await apiClient<T>(value.endpoint, {
        method: value.method,
        body: value.body,
        idempotencyKey: value.key,
      });
      if (
        typeof result?.id !== "string" ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.id)
      )
        throw new Error("The server did not confirm a valid financial resource identifier.");
      persist(null);
      confirmed.current = true;
      // Cache refresh errors must not turn a confirmed write into a retryable write.
      void invalidateFinance(client);
      return result;
    } catch (failure) {
      if (
        failure instanceof KivoApiError &&
        failure.status >= 400 &&
        failure.status < 500 &&
        failure.status !== 408 &&
        !(failure.status === 409 && /idempotency/i.test(failure.message))
      )
        persist(null);
      setError(financialError(failure));
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const run = async <T extends { id: string }>(
    endpoint: string,
    body: unknown,
    method: "POST" | "PATCH" = "POST"
  ): Promise<T | null> => {
    if (!user || lock.current || (singleUse && confirmed.current)) return null;
    // Synchronous storage check also prevents a second mounted form replacing a pending intent.
    try {
      if (sessionStorage.getItem(storageKey)) {
        setError("Resolve the pending request before starting another.");
        return null;
      }
      const value: Attempt = { endpoint, method, body, key: crypto.randomUUID() };
      persist(value);
      return await perform<T>(value);
    } catch {
      setError("Recovery storage is unavailable. No request was sent.");
      return null;
    }
  };
  const check = async () => {
    if (lock.current || !attempt) return;
    lock.current = true;
    setBusy(true);
    setChecked(false);
    setError("");
    try {
      // A matching amount/title is not proof of this operation. Only an idempotent replay can confirm it.
      const resource = attempt.endpoint.match(
        /^(\/api\/v1\/(?:accounts|transactions|contacts|loans|settlements|shared-bills|budgets|rent\/(?:plans|obligations|payments|reserves))\/[^/]+\/)/
      )?.[1];
      await apiClient(
        resource ||
          attempt.endpoint.match(
            /^\/api\/v1\/(?:accounts|transactions|contacts|loans|settlements|shared-bills|budgets|rent\/(?:plans|obligations|payments|reserves))\//
          )![0]
      );
      await invalidateFinance(client);
      setChecked(true);
    } catch (failure) {
      setError(financialError(failure));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return {
    run,
    busy,
    error,
    pending: !!raw,
    attempt,
    checked,
    check,
    retry: <T extends { id: string }>() =>
      attempt && checked ? perform<T>(attempt) : Promise.resolve(null),
  };
}

export function FinancialWriteStatus({
  write,
  onConfirmed,
}: {
  write: ReturnType<typeof useFinancialWrite>;
  onConfirmed?: (result: { id: string }) => void;
}) {
  return (
    <div className="space-y-2 text-xs">
      {write.error && (
        <p role="alert" className="text-destructive">
          {write.error}
        </p>
      )}
      {write.pending && !write.busy && (
        <div
          role="status"
          className="rounded-lg border border-amber-600/30 bg-amber-500/10 p-3 space-y-2"
        >
          <p>
            A request is pending confirmation. Do not submit a new operation. Refresh server state
            before a deliberate retry of the original request.
          </p>
          {write.attempt && (
            <details>
              <summary>Original request</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all text-[10px]">
                {JSON.stringify(
                  { endpoint: write.attempt.endpoint, body: write.attempt.body },
                  null,
                  2
                )}
              </pre>
            </details>
          )}
          <Button type="button" size="sm" variant="outline" onClick={() => void write.check()}>
            Check server status
          </Button>
          {write.checked && (
            <>
              <p>
                Server state refreshed. Similar records do not uniquely identify this request.
                Confirm using its original key and unchanged payload.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  void write.retry().then((result) => {
                    if (result) onConfirmed?.(result);
                  })
                }
              >
                Retry original request
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
