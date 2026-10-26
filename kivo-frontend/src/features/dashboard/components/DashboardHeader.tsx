"use client";

import { Button } from "@/components/ui/button";
import { PlusCircle, Calendar } from "lucide-react";

interface DashboardHeaderProps {
  onQuickAdd: () => void;
  workspaceName?: string;
  dateContext?: string;
}

export function DashboardHeader({
  onQuickAdd,
  workspaceName = "Overview",
  dateContext = "Checking report date…",
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col justify-between gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{workspaceName}</h1>
        <p className="flex min-h-4 items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span>{dateContext}</span>
        </p>
      </div>
      <Button size="sm" onClick={onQuickAdd} className="gap-2 self-start font-medium sm:self-auto">
        <PlusCircle className="size-4" />
        Quick Add
      </Button>
    </div>
  );
}
