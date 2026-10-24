"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { TransactionDetailCard } from "@/features/transactions/components/TransactionDetailCard";
import { QueryState } from "@/features/finance/QueryState";
import { useAccounts, useCategories } from "@/features/finance/queries";
import { financeApi, transactionEntity } from "@/features/finance/api";
import { useSession } from "@/features/auth/session";
function Detail() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useSession();
  const accounts = useAccounts();
  const categories = useCategories();
  const query = useQuery({
    queryKey: ["transactions", user?.id, "detail", id],
    queryFn: ({ signal }) => financeApi.event(id, signal),
    enabled: !!user,
    retry: false,
  });
  return (
    <>
      <QueryState query={query} />
      <QueryState query={accounts} />
      <QueryState query={categories} />
      {query.data && accounts.data && categories.data && !query.isError && (
        <TransactionDetailCard
          key={query.data.id}
          transaction={transactionEntity(query.data, accounts.data, categories.data)}
        />
      )}
    </>
  );
}
export default function TransactionDetailPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer maxWidth="2xl" className="py-8">
        <React.Suspense fallback={<p role="status">Loading transaction…</p>}>
          <Detail />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
