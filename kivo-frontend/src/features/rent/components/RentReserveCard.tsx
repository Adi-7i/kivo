import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Edit2, Calendar } from "lucide-react";
import type { RentReserveEntity } from "../types";

interface RentReserveCardProps {
  reserve: RentReserveEntity;
  onAdjust?: (reserve: RentReserveEntity) => void;
}

export function RentReserveCard({ reserve, onAdjust }: RentReserveCardProps) {
  return (
    <div
      data-testid={"rent-reserve-" + reserve.id}
      className="rounded-xl border border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20 dark:border-amber-900/60 p-4 transition-all duration-200 space-y-3"
    >
      {/* Top: Label + Adjust Action */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-4" />
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground block">{reserve.label}</span>
            {reserve.reservedPaise === 0 && (
              <p className="text-xs text-muted-foreground">Released — no active earmark</p>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="size-3 text-muted-foreground" />
              <span>
                Obligation Cycle: {reserve.obligationMonth?.substring(0, 7) ?? "Unavailable"}
              </span>
            </div>
          </div>
        </div>

        {onAdjust && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAdjust(reserve)}
            className="text-xs h-7 px-2.5 border-amber-300 dark:border-amber-800"
          >
            <Edit2 className="size-3 mr-1 text-amber-700" />
            <span>Adjust</span>
          </Button>
        )}
      </div>

      {/* Amount and explanation */}
      <div className="flex items-baseline justify-between pt-1 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
        <span className="text-amber-900 dark:text-amber-300 font-medium">Ring-fenced Earmark:</span>
        <MoneyAmount paise={reserve.reservedPaise} size="base" variant="reserved" />
      </div>
    </div>
  );
}
