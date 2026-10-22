import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { FundOverviewCard } from "@/features/funding/components/FundOverviewCard";
import { FundJourneyTimeline } from "@/features/funding/components/FundJourneyTimeline";
import { AllocationBreakdown } from "@/features/funding/components/AllocationBreakdown";
import { FundCategoryChart } from "@/features/funding/components/FundCategoryChart";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import {
  PREVIEW_SOURCES,
  PREVIEW_JOURNEY_EVENTS,
  PREVIEW_ALLOCATION_BREAKDOWNS,
} from "@/features/funding/data/previewSources";
import { ArrowLeft, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Fund Journey & Attribution Detail — Kivo",
  description:
    "Explore the chronological FIFO allocation, expenditures, lending, and exhaustion history of this money source.",
};

export function generateStaticParams() {
  return PREVIEW_SOURCES.map((src) => ({ id: src.id }));
}

async function FundDetailContent({ paramsPromise }: { paramsPromise: Promise<{ id: string }> }) {
  const { id } = await paramsPromise;
  const source = PREVIEW_SOURCES.find((s) => s.id === id);

  if (!source) {
    return (
      <FinancialEmptyState
        icon={<AlertCircle className="size-6 text-destructive" />}
        title="Money Source Not Found"
        description="The requested funding source identifier could not be located in this preview workspace."
        action={
          <Button asChild size="sm" variant="outline">
            <Link href="/money/sources">Return to Money Sources</Link>
          </Button>
        }
      />
    );
  }

  const events = PREVIEW_JOURNEY_EVENTS[source.id] || [];
  const breakdown = PREVIEW_ALLOCATION_BREAKDOWNS[source.id] || {
    originalAmountPaise: source.originalAmountPaise,
    spentPaise: source.attributedSpentPaise,
    spentPercentage: Math.round(
      (source.attributedSpentPaise / Math.max(1, source.originalAmountPaise)) * 100
    ),
    lentPaise: source.attributedLentPaise,
    lentPercentage: Math.round(
      (source.attributedLentPaise / Math.max(1, source.originalAmountPaise)) * 100
    ),
    remainingPaise: source.remainingPaise,
    remainingPercentage: Math.max(
      0,
      100 -
        Math.round(
          ((source.attributedSpentPaise + source.attributedLentPaise) /
            Math.max(1, source.originalAmountPaise)) *
            100
        )
    ),
    categories: [],
  };

  return (
    <div className="space-y-6">
      {/* Back Link & Quick Batch Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/money/sources"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Money Sources</span>
        </Link>

        {/* Quick Batch Switcher for Reviewing Exhausted / Active / Unresolved */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted p-1 rounded-lg overflow-x-auto">
          <span className="px-1 text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
            Preview batch:
          </span>
          {PREVIEW_SOURCES.map((s) => {
            const isCurrent = s.id === source.id;
            return (
              <Link
                key={s.id}
                href={`/money/sources/${s.id}`}
                className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  isCurrent
                    ? "bg-card text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.name.split(" ")[0]} ({s.status})
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Fund Overview Card */}
      <FundOverviewCard source={source} />

      {/* 2-Column Financial Story: Timeline + Allocation Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Chronological Fund Journey Timeline */}
        <div className="lg:col-span-7 space-y-4">
          <FundJourneyTimeline events={events} />
        </div>

        {/* Right Column (5 cols): Visual Allocation & Categories */}
        <div className="lg:col-span-5 space-y-6">
          <AllocationBreakdown breakdown={breakdown} />

          <FundCategoryChart categories={breakdown.categories} />

          <IntegrationPendingBadge
            variant="banner"
            message="Backend integration pending: Real-time FIFO attribution recalculations, historical adjustments, and dispute audits will sync with Django in subsequent phases."
          />
        </div>
      </div>
    </div>
  );
}

export default function FundDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <PageContainer maxWidth="7xl" className="py-8">
        <React.Suspense
          fallback={
            <div className="space-y-4">
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              <div className="h-64 w-full animate-pulse rounded-xl bg-card border border-border" />
            </div>
          }
        >
          <FundDetailContent paramsPromise={params} />
        </React.Suspense>
      </PageContainer>
    </div>
  );
}
