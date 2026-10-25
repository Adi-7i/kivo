import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { LiveBudgets } from "@/features/budgets/components/LiveBudgets";
export default function BudgetsPage() {
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
          <LiveBudgets />
        </PageContainer>
      </main>
    </div>
  );
}
