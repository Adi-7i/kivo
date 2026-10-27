import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { formatDateDisplay } from "@/lib/formatters/date";
import type { AccountEntity, AccountKind } from "../types";
import { Building2, Banknote, Wallet, Edit2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface AccountCardProps {
  account: AccountEntity;
  onEdit?: (account: AccountEntity) => void;
  className?: string;
}

const KIND_ICONS: Record<AccountKind, React.ReactNode> = {
  bank: <Building2 className="size-4 text-kivo-primary" />,
  cash: <Banknote className="size-4 text-emerald-600" />,
  wallet: <Wallet className="size-4 text-blue-600" />,
};

const KIND_BORDER: Record<AccountKind, string> = {
  bank: "border-kivo-primary/20 hover:border-kivo-primary/40",
  cash: "border-emerald-600/20 hover:border-emerald-600/40",
  wallet: "border-blue-600/20 hover:border-blue-600/40",
};

export function AccountCard({ account, onEdit, className }: AccountCardProps) {
  return (
    <Card
      className={cn(
        "card-hover-interactive rounded-2xl shadow-card bg-card border",
        KIND_BORDER[account.kind],
        className
      )}
    >
      <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 items-center justify-center rounded-xl bg-background border border-border/70 shadow-2xs">
              {KIND_ICONS[account.kind]}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-foreground leading-tight break-all font-heading">
                {account.name}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Opened {account.openedOn ? formatDateDisplay(account.openedOn) : "Recently"}
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-[10px] capitalize font-medium rounded-full px-2">
            {account.kind}
            {account.archived ? " · Archived" : ""}
          </Badge>
        </div>

        <div>
          <span className="text-[10px] text-muted-foreground/80 block font-bold uppercase tracking-wider">
            Current Balance
          </span>
          <MoneyAmount
            paise={account.balancePaise}
            size="2xl"
            className="mt-0.5 font-bold font-tabular text-xl sm:text-2xl"
          />
        </div>

        <div className="pt-2.5 border-t border-border/50 flex items-center justify-between text-xs">
          <Link
            prefetch={false}
            href={`/money/${account.id}`}
            className="inline-flex items-center gap-1 text-kivo-primary hover:text-kivo-secondary font-semibold transition-colors"
          >
            <span>View activity</span>
            <ArrowRight className="size-3" />
          </Link>

          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => onEdit(account)}
              className="text-muted-foreground hover:text-foreground gap-1"
            >
              <Edit2 className="size-3" />
              <span>Edit</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
