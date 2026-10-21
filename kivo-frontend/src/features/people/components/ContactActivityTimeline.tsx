import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import {
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Users,
  CheckCircle2,
  Clock,
} from "lucide-react";
import type { ContactActivityEvent } from "../types";

interface ContactActivityTimelineProps {
  events: ContactActivityEvent[];
  contactName: string;
}

export function ContactActivityTimeline({ events, contactName }: ContactActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-8 text-center space-y-2">
        <Receipt className="size-8 text-muted-foreground/50 mx-auto" />
        <h4 className="text-sm font-semibold text-foreground">No activity recorded</h4>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          No loans, shared expenses, or repayments have been recorded with {contactName} yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
        <span>Activity History with {contactName}</span>
        <span>
          {events.length} event{events.length === 1 ? "" : "s"} recorded
        </span>
      </div>

      <div className="relative border-l-2 border-border/80 ml-3.5 space-y-4 py-1">
        {events.map((event) => {
          const isBorrow = event.type === "loan_borrowed";
          const isRepayReceived = event.type === "repayment_received";
          const isRepayPaid = event.type === "repayment_paid";
          const isSharedUser = event.type === "shared_bill_paid_by_user";
          const isSharedFriend = event.type === "shared_bill_paid_by_friend";

          let icon = <HandCoins className="size-3.5 text-emerald-600" />;
          let eventTypeLabel = "Money Lent";
          const badgeVariant: "default" | "secondary" | "outline" = "outline";

          if (isBorrow) {
            icon = <ArrowDownLeft className="size-3.5 text-amber-700" />;
            eventTypeLabel = "Money Borrowed";
          } else if (isRepayReceived) {
            icon = <CheckCircle2 className="size-3.5 text-emerald-600" />;
            eventTypeLabel = "Repayment Received";
          } else if (isRepayPaid) {
            icon = <ArrowUpRight className="size-3.5 text-amber-700" />;
            eventTypeLabel = "Repayment Paid";
          } else if (isSharedUser) {
            icon = <Users className="size-3.5 text-blue-600" />;
            eventTypeLabel = "Shared Bill (You Paid)";
          } else if (isSharedFriend) {
            icon = <Users className="size-3.5 text-purple-600" />;
            eventTypeLabel = `Shared Bill (${contactName} Paid)`;
          }

          return (
            <div key={event.id} className="relative pl-6 group">
              {/* Timeline Node Icon */}
              <div className="absolute -left-[17px] top-1 size-7 rounded-full bg-card border border-border flex items-center justify-center shadow-xs">
                {icon}
              </div>

              {/* Event Card */}
              <div className="rounded-xl border border-border/70 bg-card p-3.5 hover:border-kivo-sage/60 transition-colors space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground text-sm">{event.title}</span>
                    <Badge variant={badgeVariant} className="text-[10px] py-0 px-1.5 font-normal">
                      {eventTypeLabel}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground font-mono text-[11px]">{event.date}</span>
                </div>

                {event.notes && <p className="text-xs text-muted-foreground">{event.notes}</p>}

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Amount:</span>
                    <MoneyAmount
                      paise={event.amountPaise}
                      size="sm"
                      variant={isBorrow || isRepayPaid ? "reserved" : "income"}
                    />
                    {event.contactSharePaise && (
                      <span className="text-[11px] text-muted-foreground">
                        ({contactName}&apos;s share:{" "}
                        <MoneyAmount paise={event.contactSharePaise} size="xs" />)
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] capitalize">
                    {event.status === "settled" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="size-3" /> Settled
                      </span>
                    ) : event.status === "partial" ? (
                      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                        <Clock className="size-3" /> Partially Settled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="size-3" /> Open Claim
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
