"use client";
import { Button } from "@/components/ui/button";
import { financialError } from "./validation";
export function QueryState({
  query,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown };
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
  if (query.isPending)
    return (
      <p role="status" className="p-4 text-xs text-muted-foreground">
        Loading from Django…
      </p>
    );
  return null;
}
