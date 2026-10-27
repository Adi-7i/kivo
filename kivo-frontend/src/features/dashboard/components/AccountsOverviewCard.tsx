import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import type { AccountEntity } from "@/features/accounts/types";
import { Building2, Banknote, Wallet, ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface AccountsOverviewCardProps {
  accounts: AccountEntity[];
  className?: string;
}

const KIND_ICON = {
  bank: <Building2 className="size-4 text-kivo-primary" />,
  cash: <Banknote className="size-4 text-emerald-600 dark:text-emerald-400" />,
  wallet: <Wallet className="size-4 text-blue-600 dark:text-blue-400" />,
};

export function AccountsOverviewCard({ accounts, className }: AccountsOverviewCardProps) {
  return (
    <Card className={`card-hover-interactive border-border/80 shadow-card ${className ?? ""}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-bold font-heading">Your Accounts</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Current balances across your accounts.
          </CardDescription>
        </div>
        <Link
          href="/money"
          className="inline-flex items-center gap-1 text-xs font-semibold text-kivo-primary hover:text-kivo-secondary transition-colors"
        >
          <span>Manage</span>
          <ArrowRight className="size-3" />
        </Link>
      </CardHeader>

      <CardContent className="space-y-2 pt-1">
        {accounts.length === 0 ? (
          <FinancialEmptyState
            icon={<Building2 className="size-5 text-muted-foreground" />}
            title="No Accounts"
            description="Add an account to view balance distributions."
            className="border-none bg-transparent p-4"
            action={
              <Button asChild size="xs" variant="outline" className="gap-1">
                <Link href="/money">
                  <Plus className="size-3" />
                  <span>Add Account</span>
                </Link>
              </Button>
            }
          />
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              className="group flex flex-wrap min-w-0 items-center justify-between gap-2 p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors text-xs"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-background border border-border/60 shadow-2xs group-hover:scale-105 transition-transform">
                  {KIND_ICON[acc.kind] || KIND_ICON.bank}
                </div>
                <span className="min-w-0 break-words font-semibold text-foreground">
                  {acc.name}
                </span>
              </div>
              <MoneyAmount paise={acc.balancePaise} size="sm" tabular />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

