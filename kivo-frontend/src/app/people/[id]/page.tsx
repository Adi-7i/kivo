import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveContactDetail } from "@/features/relationships/components/LivePeople";
export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <PageContainer className="py-6 sm:py-8 space-y-6">
        <AppNav />
        <React.Suspense fallback={<p role="status">Loading owned relationships…</p>}>
          <LiveContactDetail />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
