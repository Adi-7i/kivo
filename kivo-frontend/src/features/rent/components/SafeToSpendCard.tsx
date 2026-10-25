import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, Info, PlusCircle } from "lucide-react";
import type { SpendingCapacityEntity } from "../types";

interface SafeToSpendCardProps {
  capacity: SpendingCapacityEntity;
  onAddReserve?: () => void;
}

export function SafeToSpendCard({ capacity, onAddReserve }: SafeToSpendCardProps) {
  const isShortfall = capacity.safeToSpendPaise < 0;

  return (
    <div className="rounded-2xl border border-kivo-primary/20 bg-linear-to-b from-kivo-primary/5 to-card p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top row: Header + Add Reserve Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-primary/10 text-kivo-primary flex items-center justify-center">
              <ShieldCheck className="size-4.5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-heading font-bold text-foreground tracking-tight">
                Spending Capacity & Safe-to-Spend
              </h2>
              <span className="text-xs text-muted-foreground">
                Actual liquid cash protected against upcoming rent obligations
              </span>
            </div>
          </div>
        </div>

        {onAddReserve && (
          <Button
            size="sm"
            onClick={onAddReserve}
            className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium self-start sm:self-auto"
          >
            <PlusCircle className="size-3.5" />
            <span>Add Reserve Earmark</span>
          </Button>
        )}
      </div>

      {/* 3 Metrics Grid: Liquid Cash, Active Reserves, Safe-to-Spend */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Liquid Balance */}
        <div
          data-testid="rent-liquid"
          className="rounded-xl border border-border/80 bg-card p-4 space-y-1"
        >
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
            Actual Liquid Cash
          </span>
          <MoneyAmount paise={capacity.liquidBalancePaise} size="2xl" variant="default" />
          <p className="text-[11px] text-muted-foreground">
            Total funds available across active bank & cash accounts
          </p>
        </div>

        {/* 2. Active Reserves */}
        <div
          data-testid="rent-reserved"
          className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60 p-4 space-y-1"
        >
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
            Active Rent Reserves
          </span>
          <MoneyAmount paise={capacity.activeReservesPaise} size="2xl" variant="reserved" />
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
            Funds ring-fenced to protect upcoming monthly rent dues
          </p>
        </div>

        {/* 3. Safe-to-Spend */}
        <div
          data-testid="rent-safe"
          className={`rounded-xl border p-4 space-y-1 ${
            isShortfall
              ? "border-destructive/40 bg-destructive/5 dark:bg-destructive/10"
              : "border-kivo-primary/30 bg-kivo-primary/5 dark:bg-kivo-primary/10"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider block ${
                isShortfall ? "text-destructive" : "text-kivo-brand-dark dark:text-kivo-sage"
              }`}
            >
              Safe-to-Spend
            </span>
            {isShortfall && <AlertTriangle className="size-4 text-destructive" />}
          </div>
          <MoneyAmount
            paise={capacity.safeToSpendPaise}
            size="2xl"
            variant={isShortfall ? "expense" : "income"}
            showSign={isShortfall}
          />
          <p className="text-[11px] text-muted-foreground">
            {isShortfall
              ? "Shortfall: Reserves exceed current liquid balance"
              : "Liquid cash safely disposable for discretionary spending"}
          </p>
        </div>
      </div>

      {/* Explanatory Formula Callout */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs flex items-start gap-2.5">
        <Info className="size-4 text-kivo-secondary shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-semibold text-foreground block">
            Safe-to-Spend = Liquid Cash − Active Rent Reserves
          </span>
          <p className="text-[11px] text-muted-foreground leading-normal">
            Rent reserves protect your liquidity from accidental overspending without initiating
            premature bank transfers or fabricating ledger entries.
          </p>
        </div>
      </div>
    </div>
  );
}
