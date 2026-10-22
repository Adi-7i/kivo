"use client";

import * as React from "react";
import { AccountCard } from "./AccountCard";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { Button } from "@/components/ui/button";
import type { AccountEntity, AccountKind } from "../types";
import { Plus, WalletCards } from "lucide-react";

interface AccountListProps {
  accounts: AccountEntity[];
  onAddAccount: () => void;
  onEditAccount?: (account: AccountEntity) => void;
  filterKind?: AccountKind | "all";
}

export function AccountList({
  accounts,
  onAddAccount,
  onEditAccount,
  filterKind = "all",
}: AccountListProps) {
  const filtered = React.useMemo(() => {
    if (filterKind === "all") return accounts;
    return accounts.filter((a) => a.kind === filterKind);
  }, [accounts, filterKind]);

  if (filtered.length === 0) {
    return (
      <FinancialEmptyState
        icon={<WalletCards className="size-6" />}
        title="No Money Accounts Registered"
        description="Register your bank checking/savings accounts, cash stash, or digital wallets to begin recording cashflows."
        action={
          <Button size="sm" onClick={onAddAccount} className="gap-1.5 font-medium">
            <Plus className="size-3.5" />
            <span>Add First Account</span>
          </Button>
        }
        secondaryNotice="Opening balances establish your baseline and are never classified as income."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((account) => (
        <AccountCard key={account.id} account={account} onEdit={onEditAccount} />
      ))}
    </div>
  );
}
