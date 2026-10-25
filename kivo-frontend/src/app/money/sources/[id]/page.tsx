import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveFundDetail } from "@/features/funding/components/LiveFunding";
export default function Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppHeader />
      <PageContainer maxWidth="7xl" className="py-8">
        <React.Suspense fallback={<p role="status">Loading funding snapshot…</p>}>
          <LiveFundDetail />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
