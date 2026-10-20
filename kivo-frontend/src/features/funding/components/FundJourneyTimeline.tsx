import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FundJourneyEventItem } from "./FundJourneyEventItem";
import { FinancialEmptyState } from "@/features/shared-financial/FinancialEmptyState";
import { GitCommit, History } from "lucide-react";
import type { FundJourneyEvent } from "../types";

interface FundJourneyTimelineProps {
  events: FundJourneyEvent[];
  className?: string;
}

type TimelineFilter = "all" | "expense" | "lent" | "inflow";

export function FundJourneyTimeline({ events, className }: FundJourneyTimelineProps) {
  const [filter, setFilter] = React.useState<TimelineFilter>("all");

  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => {
      if (filter === "expense") return ev.eventType === "expense";
      if (filter === "lent")
        return ev.eventType === "lent" || ev.eventType === "repayment_received";
      if (filter === "inflow") return ev.eventType === "received" || ev.eventType === "refund";
      return true;
    });
  }, [events, filter]);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <History className="size-4 text-kivo-primary" />
            <CardTitle className="text-base font-bold font-heading">Visual Fund Journey</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Chronological FIFO attribution of how this specific inflow was allocated across
            expenses, loans, and transfers.
          </CardDescription>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
              filter === "all"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("expense")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
              filter === "expense"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setFilter("lent")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
              filter === "lent"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Lending
          </button>
          <button
            type="button"
            onClick={() => setFilter("inflow")}
            className={`rounded-md px-2.5 py-1 font-medium transition-all cursor-pointer ${
              filter === "inflow"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Inflow
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {filteredEvents.length === 0 ? (
          <FinancialEmptyState
            title="No Journey Events Recorded"
            description="No matching chronological attribution events found for this filter selection."
            icon={<GitCommit className="size-8 text-muted-foreground" />}
          />
        ) : (
          <div className="relative pt-2 pl-1">
            {filteredEvents.map((event, index) => (
              <FundJourneyEventItem
                key={event.id}
                event={event}
                isLast={index === filteredEvents.length - 1}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
