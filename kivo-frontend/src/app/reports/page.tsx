import { Suspense } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveReports } from "@/features/reports/components/LiveReports";
import { AnalyticsSkeleton } from "@/features/reports/components/AnalyticsSkeleton";
export default function ReportsPage() {
  return (
    <div className="bg-background">
      <section className="py-6 sm:py-8">
        <PageContainer>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <LiveReports />
          </Suspense>
        </PageContainer>
      </section>
    </div>
  );
}
