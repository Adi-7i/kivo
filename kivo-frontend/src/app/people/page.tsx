import * as React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { LivePeople } from "@/features/relationships/components/LivePeople";
export default function Page() {
  return (
    <div className="bg-background text-foreground">
      <PageContainer className="py-6 sm:py-8 space-y-6">
        <React.Suspense fallback={<p role="status">Loading your people and expenses…</p>}>
          <LivePeople />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
