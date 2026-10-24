"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi, type UserProfile } from "./api";
import { isProtectedPath, navigate } from "./navigation";
import { KivoApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { clearOnboardingAttempts } from "@/features/onboarding/attempt";
import { clearFinancialAttempts } from "@/features/finance/recovery";

export const SESSION_KEY = ["session"] as const;

export function useSession() {
  const client = useQueryClient();
  return useQuery({
    queryKey: SESSION_KEY,
    queryFn: async ({ signal }): Promise<UserProfile | null> => {
      let user: UserProfile | null;
      try {
        user = await authApi.me(signal);
      } catch (error) {
        if (!(error instanceof KivoApiError) || error.status !== 401) throw error;
        user = null;
      }
      const previous = client.getQueryData<UserProfile | null>(SESSION_KEY);
      if (!user || previous?.id !== user.id) {
        await client.cancelQueries({ predicate: (query) => query.queryKey[0] !== "session" });
        client.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
      }
      return user;
    },
    // Reuse the just-verified identity across observers; server/API checks still run per request.
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });
}

export function notifySessionChange(): void {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel("kivo-session");
    channel.postMessage("changed");
    channel.close();
  }
}

/** Hide private content until Django confirms identity; the server also guards requests. */
export function SessionBoundary({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const session = useSession();
  const client = useQueryClient();
  const protectedPage = isProtectedPath(path);
  React.useEffect(() => {
    const refresh = () => {
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== "session" });
      void client.resetQueries({ queryKey: SESSION_KEY });
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    const channel =
      typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("kivo-session") : null;
    if (channel) channel.onmessage = refresh;
    window.addEventListener("kivo:session-expired", refresh);
    window.addEventListener("pageshow", restore);
    return () => {
      channel?.close();
      window.removeEventListener("kivo:session-expired", refresh);
      window.removeEventListener("pageshow", restore);
    };
  }, [client]);
  React.useEffect(() => {
    if (protectedPage && session.isSuccess && !session.data) {
      navigate(`/login?next=${encodeURIComponent(path + window.location.search)}`);
    }
  }, [protectedPage, session.isSuccess, session.data, path]);
  if (!protectedPage) return children;
  if (session.isError)
    return (
      <main className="mx-auto max-w-md p-8 space-y-4" role="alert">
        <p>We cannot verify your session right now. Please try again.</p>
        <Button onClick={() => void session.refetch()}>Retry session check</Button>
      </main>
    );
  if (!session.data)
    return (
      <main className="p-8 text-center" role="status">
        Checking your session…
      </main>
    );
  return children;
}

export function SessionMenu() {
  const { data: user } = useSession();
  const client = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const lock = React.useRef(false);
  if (!user) return null;
  const logout = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await authApi.logout();
      await client.cancelQueries();
      client.clear();
      clearOnboardingAttempts();
      clearFinancialAttempts();
      notifySessionChange();
      // A full navigation discards the Next.js router cache and all component state.
      navigate("/login");
    } catch {
      setError("Logout was not confirmed. Your session may still be active. Please try again.");
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="hidden max-w-40 truncate sm:inline-block">{user.name || user.email}</span>
      <Button size="sm" variant="outline" onClick={() => void logout()} disabled={busy}>
        {busy ? "Signing out…" : "Sign out"}
      </Button>
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
