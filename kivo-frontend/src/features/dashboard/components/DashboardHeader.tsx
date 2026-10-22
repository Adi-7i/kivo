"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
  onQuickAdd: () => void;
  workspaceName?: string;
  dateContext?: string;
}

export function DashboardHeader({
  onQuickAdd,
  workspaceName = "Personal Workspace",
  dateContext = "Saturday, 17 October 2026",
}: DashboardHeaderProps) {
  const displayDate = dateContext;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/60">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-heading">
            {workspaceName}
          </h1>
          <Badge
            variant="outline"
            className="text-[11px] font-semibold border-kivo-sage text-kivo-brand-dark dark:text-kivo-sage"
          >
            Phase 3
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-3.5 text-kivo-primary" />
            <span>{displayDate}</span>
          </span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-finance-income" />
            <span>Integer Paise &bull; IST (UTC+05:30)</span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onQuickAdd}
          className="gap-2 font-medium bg-kivo-primary hover:bg-kivo-secondary text-white shadow-xs"
        >
          <PlusCircle className="size-4" />
          <span>Quick Add</span>
        </Button>
      </div>
    </div>
  );
}
