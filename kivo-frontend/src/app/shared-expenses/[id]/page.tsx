import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SharedBillDetailView } from "@/features/shared-expenses/components/SharedBillDetailView";
import { PREVIEW_SHARED_BILLS } from "@/features/shared-expenses/data/previewSharedBills";
import { ArrowLeft, Receipt } from "lucide-react";

export const metadata: Metadata = {
  title: "Shared Bill Detail — Kivo",
  description:
    "Examine participant split amounts, personal expense shares, and settlement status for this shared bill.",
};

export function generateStaticParams() {
  return PREVIEW_SHARED_BILLS.map((b) => ({ id: b.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SharedBillDetailPage({ params }: PageProps) {
  const { id } = await params;
  const bill = PREVIEW_SHARED_BILLS.find((b) => b.id === id);

  if (!bill) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <PageContainer className="py-12 text-center space-y-4">
          <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <Receipt className="size-6" />
          </div>
          <h1 className="text-xl font-heading font-bold text-foreground">Shared Bill Not Found</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No shared bill matching ID &quot;{id}&quot; exists in local preview data.
          </p>
          <Link
            href="/shared-expenses"
            className="inline-flex items-center gap-1.5 text-sm text-kivo-primary hover:underline font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Shared Expenses Overview</span>
          </Link>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer className="py-6 sm:py-8">
        <SharedBillDetailView initialBill={bill} />
      </PageContainer>
    </div>
  );
}
