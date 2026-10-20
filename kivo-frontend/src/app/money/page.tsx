"use client";

import * as React from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/features/shared-financial/SectionHeader";
import { AccountList } from "@/features/accounts/components/AccountList";
import { AccountFormModal } from "@/features/accounts/components/AccountFormModal";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Plus, Info, Building2, Banknote, Wallet, Layers, Landmark } from "lucide-react";
import type { AccountEntity, AccountKind } from "@/features/accounts/types";

// Default proposal accounts for design presentation prior to Django integration
const PREVIEW_ACCOUNTS: AccountEntity[] = [
  {
    id: "acc-bank-1",
    name: "HDFC Salary Account",
    kind: "bank",
    balancePaise: 4850000, // ₹48,500.00
    openingBalancePaise: 2500000,
    openedOn: "2026-01-10",
    archived: false,
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "acc-cash-1",
    name: "Physical Cash Stash",
    kind: "cash",
    balancePaise: 350000, // ₹3,500.00
    openingBalancePaise: 500000,
    openedOn: "2026-01-10",
    archived: false,
    createdAt: "2026-01-10T10:05:00Z",
  },
  {
    id: "acc-wallet-1",
    name: "Amazon Pay Wallet",
    kind: "wallet",
    balancePaise: 125000, // ₹1,250.00
    openingBalancePaise: 0,
    openedOn: "2026-02-01",
    archived: false,
    createdAt: "2026-02-01T12:00:00Z",
  },
];

export default function MoneyAccountsPage() {
  const [accounts] = React.useState<AccountEntity[]>(PREVIEW_ACCOUNTS);
  const [filterKind, setFilterKind] = React.useState<AccountKind | "all">("all");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<AccountEntity | null>(null);

  const totalLiquidPaise = React.useMemo(() => {
    return accounts.reduce((acc, curr) => acc + curr.balancePaise, 0);
  }, [accounts]);

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (account: AccountEntity) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer>
        <AppNav />

        <main className="py-8 space-y-6">
          {/* Notice Alert */}
          <Alert className="border-amber-600/30 bg-amber-500/10 text-foreground">
            <Info className="size-4 text-amber-700 dark:text-amber-400" />
            <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
              Money Accounts UI Architecture
            </AlertTitle>
            <AlertDescription className="text-muted-foreground mt-1 text-xs">
              This screen displays the account presentation layout, balance cards, and interactive
              modal dialog. Real financial transactions and backend ledger state will sync with
              Django in Phase 4.
            </AlertDescription>
          </Alert>

          {/* Sub-Navigation between Money Accounts and Money Sources */}
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Link
              href="/money"
              className="inline-flex items-center gap-1.5 rounded-lg bg-kivo-primary px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
            >
              <Landmark className="size-3.5" />
              <span>Money Accounts</span>
            </Link>
            <Link
              href="/money/sources"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Layers className="size-3.5" />
              <span>Money Sources & Journeys</span>
            </Link>
          </div>

          {/* Section Header with Total Liquid Balance & CTA */}
          <SectionHeader
            title="Money Accounts"
            description="Manage your bank checking, physical cash, and digital wallets. Each account tracks exact ledger postings."
            actions={
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    Total Liquid Funds
                  </span>
                  <MoneyAmount paise={totalLiquidPaise} size="lg" />
                </div>
                <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 font-medium">
                  <Plus className="size-4" />
                  <span>Add Account</span>
                </Button>
              </div>
            }
          />

          {/* Account Type Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterKind("all")}
              className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
                filterKind === "all"
                  ? "bg-kivo-primary text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              All ({accounts.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterKind("bank")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                filterKind === "bank"
                  ? "bg-kivo-primary text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Building2 className="size-3.5" />
              <span>Banks</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterKind("cash")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                filterKind === "cash"
                  ? "bg-kivo-primary text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Banknote className="size-3.5" />
              <span>Cash</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterKind("wallet")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
                filterKind === "wallet"
                  ? "bg-kivo-primary text-white"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Wallet className="size-3.5" />
              <span>Wallets</span>
            </button>
          </div>

          {/* Accounts Grid */}
          <AccountList
            accounts={accounts}
            onAddAccount={handleOpenAdd}
            onEditAccount={handleOpenEdit}
            filterKind={filterKind}
          />
        </main>
      </PageContainer>

      <AccountFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        initialAccount={editingAccount}
      />
    </div>
  );
}
