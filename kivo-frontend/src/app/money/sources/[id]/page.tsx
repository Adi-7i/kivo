import * as React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveFundDetail } from "@/features/funding/components/LiveFunding";
export default function Page() {
  return (
    <div className="bg-background text-foreground">
      <PageContainer maxWidth="7xl" className="py-8">
        <React.Suspense fallback={<p role="status">Loading money sources…</p>}>
          <LiveFundDetail />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
