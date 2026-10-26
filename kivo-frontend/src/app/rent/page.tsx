import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveRent } from "@/features/rent/components/LiveRent";
export default function RentPage() {
  return (
    <div className="bg-background">
      <PageContainer className="py-6 sm:py-8">
        <Suspense fallback={<p role="status">Loading rent management…</p>}>
          <LiveRent />
        </Suspense>
      </PageContainer>
    </div>
  );
}
