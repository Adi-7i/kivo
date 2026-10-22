import * as React from "react";
import Link from "next/link";
import { ContactAvatar } from "./ContactAvatar";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Badge } from "@/components/ui/badge";
import { Home, ChevronRight, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { ContactEntity } from "../types";

interface ContactCardProps {
  contact: ContactEntity;
  onEdit?: (contact: ContactEntity) => void;
}

export function ContactCard({ contact }: ContactCardProps) {
  const hasReceivable = contact.receivablePaise > 0;
  const hasPayable = contact.payablePaise > 0;
  const isSettled = !hasReceivable && !hasPayable;

  return (
    <div className="group relative rounded-xl border border-border/70 bg-card p-4 transition-all duration-200 hover:border-kivo-sage hover:shadow-xs">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Avatar + Details */}
        <Link
          href={`/people/${contact.id}`}
          className="flex items-start gap-3 flex-1 min-w-0 group-hover:text-foreground"
        >
          <ContactAvatar name={contact.displayName} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-foreground text-sm tracking-tight truncate">
                {contact.displayName}
              </span>
              {contact.isRoommate && (
                <Badge
                  variant="outline"
                  className="text-[10px] py-0 px-1.5 gap-1 border-kivo-sage/50 text-kivo-brand-dark dark:text-kivo-sage bg-kivo-sage/10 font-normal"
                >
                  <Home className="size-2.5" />
                  Roommate
                </Badge>
              )}
              {contact.archived && (
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5 opacity-60">
                  Archived
                </Badge>
              )}
            </div>
            {contact.notes ? (
              <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-[280px]">
                {contact.notes}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/60 italic mt-0.5">No notes recorded</p>
            )}
          </div>
        </Link>

        {/* Right: Chevron link */}
        <Link
          href={`/people/${contact.id}`}
          aria-label={`View details for ${contact.displayName}`}
          className="text-muted-foreground group-hover:text-foreground transition-colors p-1"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>

      {/* Financial Status Summary */}
      <div className="mt-3.5 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        {hasReceivable && (
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-medium">
            <ArrowDownLeft className="size-3.5 text-emerald-600" />
            <span>Owes you</span>
            <MoneyAmount paise={contact.receivablePaise} size="sm" variant="income" />
          </div>
        )}

        {hasPayable && (
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 font-medium">
            <ArrowUpRight className="size-3.5 text-amber-700" />
            <span>You owe</span>
            <MoneyAmount paise={contact.payablePaise} size="sm" variant="reserved" />
          </div>
        )}

        {isSettled && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-kivo-sage" />
            <span>All settled up</span>
          </div>
        )}

        <Link
          href={`/people/${contact.id}`}
          className="text-[11px] font-medium text-kivo-secondary hover:text-kivo-brand-dark dark:hover:text-kivo-sage underline-offset-2 hover:underline ml-auto"
        >
          View Activity &rarr;
        </Link>
      </div>
    </div>
  );
}
