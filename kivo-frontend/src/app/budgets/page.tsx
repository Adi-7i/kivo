import { PageContainer } from "@/components/layout/PageContainer";
import { LiveBudgets } from "@/features/budgets/components/LiveBudgets";
export default function BudgetsPage() {
  return (
    <div className="bg-background">
      <section className="py-6 sm:py-8">
        <PageContainer>
          <LiveBudgets />
        </PageContainer>
      </section>
    </div>
  );
}
