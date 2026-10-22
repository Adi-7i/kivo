"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, CheckCircle2 } from "lucide-react";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";

interface CategorySeedBannerProps {
  onSeedDefaults?: () => void;
}

export function CategorySeedBanner({ onSeedDefaults }: CategorySeedBannerProps) {
  const [triggered, setTriggered] = React.useState(false);

  const handleSeed = () => {
    setTriggered(true);
    onSeedDefaults?.();
  };

  return (
    <div className="space-y-3">
      {triggered && (
        <IntegrationPendingBadge
          variant="banner"
          message="Backend integration pending: POST /api/v1/categories/defaults/ will idempotently seed standard categories in the remote Django database."
        />
      )}

      <div className="rounded-xl border border-kivo-sage/40 bg-kivo-sage/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
        <div className="flex items-start gap-3">
          <div className="size-8 rounded-lg bg-kivo-primary text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Seed Default Categories
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instantly provision standard categories (Food, Groceries, Transport, Housing, Utilities, Social) matching the backend ledger defaults.
            </p>
          </div>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleSeed}
          className="text-xs shrink-0 self-start sm:self-auto gap-1.5 border-kivo-primary/30 text-kivo-primary hover:bg-kivo-primary/10"
        >
          <CheckCircle2 className="size-3.5" />
          <span>Seed Defaults</span>
        </Button>
      </div>
    </div>
  );
}
