"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface BudgetPeriodSelectorProps {
  currentPeriod: string; // e.g. "2026-10"
  onPeriodChange?: (period: string) => void;
}

export function BudgetPeriodSelector({ currentPeriod, onPeriodChange }: BudgetPeriodSelectorProps) {
  // Parse year and month
  const [yearStr, monthStr] = currentPeriod.split("-");
  const year = parseInt(yearStr || "2026", 10);
  const month = parseInt(monthStr || "10", 10);

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const currentLabel = `${monthNames[month - 1] || "October"} ${year}`;

  const handlePreviousMonth = () => {
    let nextMonth = month - 1;
    let nextYear = year;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    const formatted = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    onPeriodChange?.(formatted);
  };

  const handleNextMonth = () => {
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    const formatted = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    onPeriodChange?.(formatted);
  };

  return (
    <div className="flex items-center gap-1.5 bg-card border border-border/80 rounded-lg p-1 shadow-2xs">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePreviousMonth}
        aria-label="Previous month"
        className="size-7 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </Button>

      <div className="flex items-center gap-1.5 px-2 text-xs font-medium text-foreground select-none">
        <Calendar className="size-3.5 text-kivo-primary" />
        <span className="font-heading font-semibold tracking-tight">{currentLabel}</span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNextMonth}
        aria-label="Next month"
        className="size-7 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
