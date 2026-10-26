import * as React from "react";
import { RentStatusBadge } from "./RentStatusBadge";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Calendar, CreditCard, Settings2, AlertTriangle, Info, Sparkles } from "lucide-react";
import { RentGenerateModal } from "./RentGenerateModal";
import type { RentPlanEntity, RentObligationEntity } from "../types";

interface RentOverviewCardProps {
  plan: RentPlanEntity;
  currentObligation?: RentObligationEntity;
  onRecordPayment?: (obligation: RentObligationEntity) => void;
  onConfigurePlan?: () => void;
  onSkipObligation?: (obligation: RentObligationEntity) => void;
}

export function RentOverviewCard({
  plan,
  currentObligation,
  onRecordPayment,
  onConfigurePlan,
  onSkipObligation,
}: RentOverviewCardProps) {
  const isOverdue = currentObligation?.overdue ?? false;
  const isPaid = currentObligation?.status === "paid";
  const isSkipped = currentObligation?.status === "skipped";
  const [generateModalOpen, setGenerateModalOpen] = React.useState(false);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-5">
      {/* Top row: Plan info + settings button */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="size-10 rounded-xl bg-kivo-sage/20 border border-kivo-sage/40 text-kivo-brand-dark dark:text-kivo-sage flex items-center justify-center shrink-0">
            <Home className="size-5" />
          </div>
          <div className="min-w-0 break-words">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground tracking-tight">
                {plan.title}
              </h1>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 border-kivo-sage/50 text-kivo-brand-dark dark:text-kivo-sage bg-kivo-sage/10 font-medium"
              >
                {plan.shares.length > 1
                  ? `${plan.shares.length} Roommates Shared`
                  : "Personal Rent"}
              </Badge>
              {plan.active ? (
                <Badge
                  variant="outline"
                  className="border-emerald-300 text-emerald-800 bg-emerald-50 text-[10px] py-0 px-1.5 font-normal"
                >
                  Active Plan
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 opacity-70">
                  Inactive
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1">
              Payee: <span className="font-semibold text-foreground">{plan.payee}</span> &bull; Due
              Day:{" "}
              <span className="font-semibold text-foreground">
                {plan.dueDay ? `${plan.dueDay}th of each month` : "Last day of month"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGenerateModalOpen(true)}
            className="text-xs gap-1.5 border-kivo-sage/60 text-kivo-brand-dark dark:text-kivo-sage hover:bg-kivo-sage/10"
          >
            <Sparkles className="size-3.5" />
            <span>Generate Obligations</span>
          </Button>

          {onConfigurePlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={onConfigurePlan}
              className="text-xs gap-1.5"
            >
              <Settings2 className="size-3.5" />
              <span>Configure Plan</span>
            </Button>
          )}
        </div>
      </div>

      {/* Current Obligation Highlight Banner */}
      {currentObligation ? (
        <div
          className={`rounded-xl border p-4 space-y-3 ${
            isOverdue
              ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10"
              : isPaid
                ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/20"
                : "border-border/80 bg-muted/20"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current Obligation ({currentObligation.month.substring(0, 7)})
                </span>
                <RentStatusBadge status={currentObligation.status} />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium pt-0.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                <span>Due Date: {currentObligation.dueDate}</span>
                {isOverdue && (
                  <span className="text-destructive font-semibold flex items-center gap-1 ml-1">
                    <AlertTriangle className="size-3" /> Overdue
                  </span>
                )}
              </div>
            </div>

            {/* Actions for this obligation */}
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              {!isPaid && !isSkipped && onRecordPayment && (
                <Button
                  size="sm"
                  onClick={() => onRecordPayment(currentObligation)}
                  className="bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 text-xs font-medium"
                >
                  <CreditCard className="size-3.5" />
                  <span>Record Rent Payment</span>
                </Button>
              )}

              {!isPaid && !isSkipped && onSkipObligation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSkipObligation(currentObligation)}
                  className="text-xs"
                >
                  Skip Month
                </Button>
              )}
            </div>
          </div>

          {currentObligation.friendPayablePaise > 0 && (
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Landlord payment is recorded; your outstanding payable to a friend is{" "}
              <MoneyAmount paise={currentObligation.friendPayablePaise} size="sm" />. Linked
              reserves remain protected until settlement.
            </p>
          )}
          {/* Amounts Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 border-t border-border/40 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Gross Landlord Rent</span>
              <MoneyAmount paise={currentObligation.amountPaise} size="base" variant="default" />
            </div>

            <div>
              <span className="text-muted-foreground block text-[11px]">Your Personal Share</span>
              <MoneyAmount paise={plan.userSharePaise} size="base" variant="expense" />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <span className="text-muted-foreground block text-[11px]">
                Outstanding to Landlord
              </span>
              <MoneyAmount
                paise={currentObligation.outstandingPaise}
                size="base"
                variant={currentObligation.outstandingPaise > 0 ? "reserved" : "neutral"}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground">
          No active rent obligation generated for this cycle.
        </div>
      )}

      {/* Non-Negotiable Invariant Callout */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs flex items-start gap-2.5">
        <Info className="size-4 text-kivo-secondary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-normal">
          <strong className="text-foreground">How rent payments work:</strong> Generating or viewing
          a rent obligation does not initiate a bank payment or post an expense. Cash leaves your
          account only for a payment you make or repayment to a friend. Friend-paid rent records
          your rent expense and the amount you owe without immediately changing your cash.
        </p>
      </div>

      {generateModalOpen && (
        <RentGenerateModal
          open={generateModalOpen}
          onOpenChange={setGenerateModalOpen}
          plan={plan}
        />
      )}
    </div>
  );
}
