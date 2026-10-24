"use client";
import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { AccountCard } from "@/features/accounts/components/AccountCard";
import { AccountFormModal } from "@/features/accounts/components/AccountFormModal";
import { useSession } from "@/features/auth/session";
import { financeApi, accountEntity } from "@/features/finance/api";
import { QueryState } from "@/features/finance/QueryState";
import { Button } from "@/components/ui/button";
function Detail() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useSession();
  const [edit, setEdit] = React.useState(false);
  const query = useQuery({
    queryKey: ["accounts", user?.id, "detail", id],
    queryFn: ({ signal }) => financeApi.account(id, signal),
    enabled: !!user,
    retry: false,
  });
  return (
    <div className="space-y-5">
      <Link prefetch={false} href="/money" className="text-xs text-kivo-primary">
        Back to Money Accounts
      </Link>
      <QueryState query={query} />
      {query.data && !query.isError && (
        <>
          <AccountCard account={accountEntity(query.data)} onEdit={() => setEdit(true)} />
          <p className="text-xs text-muted-foreground">
            Opening balance: ₹{query.data.opening_balance}. This is equity, not income.
          </p>
          <Button asChild size="sm" variant="outline">
            <Link prefetch={false} href={`/transactions?account=${id}`}>
              Account transactions
            </Link>
          </Button>
          {edit && (
            <AccountFormModal
              open={edit}
              onOpenChange={setEdit}
              initialAccount={accountEntity(query.data)}
            />
          )}
        </>
      )}
    </div>
  );
}
export default function AccountDetailPage() {
  return (
    <>
      <AppHeader />
      <PageContainer maxWidth="2xl" className="py-8">
        <React.Suspense fallback={<p role="status">Loading account…</p>}>
          <Detail />
        </React.Suspense>
      </PageContainer>
    </>
  );
}
