"use client";

import * as React from "react";
import { ContactAvatar } from "./ContactAvatar";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  ArrowLeftRight,
  Calendar,
  Home,
  Edit2,
  CheckCircle2,
} from "lucide-react";
import type { ContactEntity } from "../types";

interface ContactDetailHeaderProps {
  contact: ContactEntity;
  onLend?: () => void;
  onBorrow?: () => void;
  onRepay?: () => void;
  onEdit?: () => void;
}

export function ContactDetailHeader({
  contact,
  onLend,
  onBorrow,
  onRepay,
  onEdit,
}: ContactDetailHeaderProps) {
  const hasReceivable = contact.receivablePaise > 0;
  const hasPayable = contact.payablePaise > 0;
  const isSettled = !hasReceivable && !hasPayable;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-6">
      {/* Top row: Avatar + info + Edit action */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <ContactAvatar name={contact.displayName} size="lg" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground tracking-tight">
                {contact.displayName}
              </h1>
              {contact.isRoommate && (
                <Badge
                  variant="outline"
                  className="gap-1 border-kivo-sage/60 text-kivo-brand-dark dark:text-kivo-sage bg-kivo-sage/10 text-xs py-0.5"
                >
                  <Home className="size-3" />
                  Roommate
                </Badge>
              )}
              {contact.archived && (
                <Badge variant="secondary" className="text-xs py-0.5 opacity-70">
                  Archived
                </Badge>
              )}
            </div>

            {contact.notes ? (
              <p className="text-sm text-muted-foreground max-w-xl">{contact.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">No notes added</p>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
              <Calendar className="size-3.5" />
              <span>Contact record added {new Date(contact.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="text-xs gap-1.5 self-start sm:self-auto"
          >
            <Edit2 className="size-3.5" />
            <span>Edit Contact</span>
          </Button>
        )}
      </div>

      {/* Financial Position Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        {/* Receivable */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300">
            <span>Money Owed to You (Receivable)</span>
            <ArrowDownLeft className="size-4 text-emerald-600" />
          </div>
          <MoneyAmount paise={contact.receivablePaise} size="xl" variant="income" />
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
            {hasReceivable
              ? "Recoverable personal asset owed to you"
              : "No outstanding money owed to you"}
          </p>
        </div>

        {/* Payable */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-amber-900 dark:text-amber-300">
            <span>Money You Owe (Payable)</span>
            <ArrowUpRight className="size-4 text-amber-700" />
          </div>
          <MoneyAmount paise={contact.payablePaise} size="xl" variant="reserved" />
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400">
            {hasPayable
              ? "Personal liability you owe to contact"
              : "No outstanding liability to contact"}
          </p>
        </div>

        {/* Relationship Status */}
        <div className="rounded-xl border border-border/80 bg-card p-4 space-y-1 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Account Status</span>
            {isSettled ? (
              <CheckCircle2 className="size-4 text-kivo-sage" />
            ) : (
              <ArrowLeftRight className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="text-sm font-semibold text-foreground pt-1">
            {isSettled
              ? "All Clear & Settled"
              : hasReceivable && hasPayable
                ? "Mutual Active Claims"
                : hasReceivable
                  ? "Awaiting Repayment"
                  : "Repayment Pending"}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Claims are tracked individually per event and not netted automatically.
          </p>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
        {onLend && (
          <Button
            size="sm"
            onClick={onLend}
            className="bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5 text-xs font-medium"
          >
            <HandCoins className="size-3.5" />
            <span>Lend Money</span>
          </Button>
        )}

        {onBorrow && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBorrow}
            className="border-amber-600/40 text-amber-900 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 gap-1.5 text-xs font-medium"
          >
            <ArrowDownLeft className="size-3.5 text-amber-700" />
            <span>Borrow Money</span>
          </Button>
        )}

        {onRepay && (hasReceivable || hasPayable) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={onRepay}
            className="gap-1.5 text-xs font-medium"
          >
            <ArrowLeftRight className="size-3.5" />
            <span>Record Repayment</span>
          </Button>
        )}
      </div>
    </div>
  );
}
