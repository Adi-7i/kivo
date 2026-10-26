"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { SessionBoundary } from "@/features/auth/session";
import { ApplicationShell } from "@/components/layout/ApplicationShell";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60 seconds
            gcTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error) => {
              // Never retry on 4xx client errors
              if (
                error &&
                typeof error === "object" &&
                "status" in error &&
                typeof (error as { status: unknown }).status === "number"
              ) {
                const status = (error as { status: number }).status;
                if (status >= 400 && status < 500) return false;
              }
              return failureCount < 1;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: false, // Never automatically retry financial mutations
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <React.Suspense
        fallback={
          <main className="p-8 text-center" role="status">
            Checking your session…
          </main>
        }
      >
        <SessionBoundary>
          <ApplicationShell>{children}</ApplicationShell>
        </SessionBoundary>
      </React.Suspense>
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
