import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveReports } from "@/features/reports/components/LiveReports";
import { AnalyticsSkeleton } from "@/features/reports/components/AnalyticsSkeleton";
export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="border-b border-border bg-card/50">
        <PageContainer>
          <AppNav />
        </PageContainer>
      </div>
      <main className="py-6 sm:py-8">
        <PageContainer>
          <Suspense fallback={<AnalyticsSkeleton />}>
            <LiveReports />
          </Suspense>
        </PageContainer>
      </main>
    </div>
  );
}
