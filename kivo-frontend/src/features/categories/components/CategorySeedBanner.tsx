"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { financialError } from "@/features/finance/validation";
export function CategorySeedBanner() {
  const client = useQueryClient();
  const mutation = useMutation({
    retry: false,
    mutationFn: () => apiClient("/api/v1/categories/defaults/", { method: "POST", body: {} }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["categories"] });
    },
  });
  return (
    <div className="rounded-xl border border-kivo-sage/40 bg-kivo-sage/10 p-4 space-y-3 text-left text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 text-kivo-primary" />
          <div>
            <h4 className="font-bold uppercase tracking-wider">Seed Default Categories</h4>
            <p className="text-muted-foreground">
              Add standard categories without duplicating ones you already have.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Seeding…" : "Seed Defaults"}
        </Button>
      </div>
      {mutation.isSuccess && <p role="status">Your default categories are ready.</p>}
      {mutation.isError && (
        <p role="alert" className="text-destructive">
          {financialError(mutation.error)}
        </p>
      )}
    </div>
  );
}
