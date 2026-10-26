"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { financialError } from "./validation";
export function QueryState({
  query,
  loading,
}: {
  loading?: ReactNode;
  query: {
    isPending: boolean;
    isFetching?: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
}) {
  if (query.isError)
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-xs space-y-2">
        <p>{financialError(query.error)}</p>
        <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
          Retry loading
        </Button>
      </div>
    );
  if (query.isPending && query.isFetching !== false)
    return (
      <div role="status" aria-live="polite" className="text-xs text-muted-foreground">
        {loading ?? <p className="p-4">Loading your information…</p>}
      </div>
    );
  return null;
}
