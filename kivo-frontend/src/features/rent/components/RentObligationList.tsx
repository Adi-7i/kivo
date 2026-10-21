"use client";

import * as React from "react";
import { RentStatusBadge } from "./RentStatusBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { CreditCard, RotateCcw } from "lucide-react";
import type { RentObligationEntity } from "../types";

interface RentObligationListProps {
  obligations: RentObligationEntity[];
  onRecordPayment?: (obligation: RentObligationEntity) => void;
  onSkip?: (obligation: RentObligationEntity) => void;
  onReopen?: (obligation: RentObligationEntity) => void;
}

type FilterOption = "all" | "pending" | "paid" | "skipped";

export function RentObligationList({
  obligations,
  onRecordPayment,
  onSkip,
  onReopen,
}: RentObligationListProps) {
  const [filter, setFilter] = React.useState<FilterOption>("all");

  const filtered = React.useMemo(() => {
    return obligations.filter((ob) => {
      switch (filter) {
        case "pending":
          return (
            ob.status === "upcoming" ||
            ob.status === "due" ||
            ob.status === "overdue" ||
            ob.status === "partial"
          );
        case "paid":
          return ob.status === "paid";
        case "skipped":
          return ob.status === "skipped";
        case "all":
        default:
          return true;
      }
    });
  }, [obligations, filter]);

  return (
    <div className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-heading font-semibold text-foreground">
            Monthly Rent Obligations
          </h3>
          <p className="text-xs text-muted-foreground">
            History of generated rent dues, landlord payments, and skipped cycles
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {(
            [
              { id: "all", label: "All Months" },
              { id: "pending", label: "Pending Dues" },
              { id: "paid", label: "Paid" },
              { id: "skipped", label: "Skipped" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                filter === tab.id
                  ? "bg-kivo-primary text-white"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Obligations Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Cycle Month</th>
              <th className="py-3 px-4">Due Date</th>
              <th className="py-3 px-4 text-right">Gross Rent</th>
              <th className="py-3 px-4 text-right">Paid</th>
              <th className="py-3 px-4 text-right">Outstanding</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filtered.map((ob) => {
              const isPaid = ob.status === "paid";
              const isSkipped = ob.status === "skipped";

              return (
                <tr key={ob.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-foreground">
                    {ob.month.substring(0, 7)}
                  </td>

                  <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                    {ob.dueDate}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <MoneyAmount paise={ob.amountPaise} size="sm" variant="default" />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <MoneyAmount
                      paise={ob.paidPaise}
                      size="sm"
                      variant={ob.paidPaise > 0 ? "income" : "neutral"}
                    />
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {ob.outstandingPaise > 0 ? (
                      <MoneyAmount paise={ob.outstandingPaise} size="sm" variant="reserved" />
                    ) : (
                      <span className="text-muted-foreground/60">₹0.00</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-0.5">
                      <RentStatusBadge status={ob.status} />
                      {ob.reason && (
                        <p className="text-[10px] text-muted-foreground italic truncate max-w-[180px]">
                          {ob.reason}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {!isPaid && !isSkipped && onRecordPayment && (
                        <Button
                          size="sm"
                          onClick={() => onRecordPayment(ob)}
                          className="h-7 px-2 text-xs bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1"
                        >
                          <CreditCard className="size-3" />
                          <span>Pay</span>
                        </Button>
                      )}

                      {!isPaid && !isSkipped && onSkip && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSkip(ob)}
                          className="h-7 px-2 text-xs"
                        >
                          Skip
                        </Button>
                      )}

                      {isSkipped && onReopen && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReopen(ob)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          <RotateCcw className="size-3" />
                          <span>Reopen</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
