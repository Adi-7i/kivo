import * as React from "react";
import type { Metadata } from "next";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { TransactionDetailCard } from "@/features/transactions/components/TransactionDetailCard";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import type { TransactionEntity } from "@/features/transactions/types";

export const metadata: Metadata = {
  title: "Transaction Detail — Kivo",
  description: "View detailed attributes, category attribution, and double-entry ledger impact.",
};

const SAMPLE_DATABASE: Record<string, TransactionEntity> = {
  "tx-1": {
    id: "tx-1",
    kind: "expense",
    title: "Zepto Quick Groceries",
    amountPaise: 45000,
    effectiveDate: "2026-10-17",
    createdAt: "2026-10-17T09:30:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    categoryName: "Food & Groceries",
    merchant: "Zepto",
    paymentMethod: "UPI",
    notes: "Breakfast fruits and almond milk",
  },
  "tx-2": {
    id: "tx-2",
    kind: "transfer",
    title: "ATM Cash Withdrawal",
    amountPaise: 200000,
    effectiveDate: "2026-10-16",
    createdAt: "2026-10-16T14:15:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    destinationId: "acc-cash-1",
    destinationName: "Physical Cash Stash",
    notes: "Pocket money replenishment",
  },
  "tx-3": {
    id: "tx-3",
    kind: "receipt",
    title: "Freelance Design Retainer",
    amountPaise: 500000,
    effectiveDate: "2026-10-15",
    createdAt: "2026-10-15T11:00:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    notes: "October UI sprint milestone payment",
  },
  "tx-4": {
    id: "tx-4",
    kind: "expense",
    title: "Electricity & Water Bill",
    amountPaise: 190000,
    effectiveDate: "2026-10-15",
    createdAt: "2026-10-15T16:20:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    categoryName: "Utilities & Bills",
    paymentMethod: "NetBanking",
  },
  "tx-5": {
    id: "tx-5",
    kind: "expense",
    title: "Metro Smart Card Recharge",
    amountPaise: 50000,
    effectiveDate: "2026-10-14",
    createdAt: "2026-10-14T08:15:00Z",
    status: "posted",
    accountId: "acc-wallet-1",
    accountName: "Amazon Pay Wallet",
    categoryName: "Transit & Fuel",
    merchant: "Delhi Metro DMRC",
    paymentMethod: "UPI",
  },
  "tx-6": {
    id: "tx-6",
    kind: "expense",
    title: "Weekend Team Dinner",
    amountPaise: 310000,
    effectiveDate: "2026-10-13",
    createdAt: "2026-10-13T20:45:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    categoryName: "Food & Groceries",
    merchant: "Toit Brewery",
    paymentMethod: "Credit Card",
  },
  "tx-7": {
    id: "tx-7",
    kind: "opening",
    title: "Initial Bank Balance",
    amountPaise: 2500000,
    effectiveDate: "2026-01-10",
    createdAt: "2026-01-10T10:00:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "HDFC Salary Account",
    notes: "Baseline equity initialization",
  },
};

export function generateStaticParams() {
  return Object.keys(SAMPLE_DATABASE).map((id) => ({ id }));
}

async function TransactionDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;
  const transaction = SAMPLE_DATABASE[id] || {
    id,
    kind: "expense",
    title: `Transaction #${id}`,
    amountPaise: 100000,
    effectiveDate: "2026-10-17",
    createdAt: "2026-10-17T12:00:00Z",
    status: "posted",
    accountId: "acc-bank-1",
    accountName: "Primary Bank Account",
    categoryName: "General Expense",
    notes: "Dynamic preview instance for UI verification.",
  };

  if (!transaction) {
    return (
      <FinancialEmptyState
        icon={<AlertCircle className="size-6 text-destructive" />}
        title="Transaction Not Found"
        description="The requested transaction identifier could not be located in this preview workspace."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/transactions">Return to Transactions</Link>
          </Button>
        }
      />
    );
  }

  return <TransactionDetailCard transaction={transaction} />;
}

export default function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer maxWidth="2xl" className="py-8">
        <React.Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="h-64 w-full animate-pulse rounded-xl bg-card border border-border" />
            </div>
          }
        >
          <TransactionDetailContent paramsPromise={params} />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
