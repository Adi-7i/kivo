"use client";

import * as React from "react";
import type { DatePreset } from "../types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DateRangeFilterProps {
  selectedPreset: DatePreset;
  onPresetChange: (preset: DatePreset) => void;
  startDate?: string;
  endDate?: string;
  onCustomDateChange?: (start: string, end: string) => void;
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_7_days", label: "Last 7 Days" },
  { id: "this_month", label: "This Month" },
  { id: "previous_month", label: "Previous Month" },
  { id: "this_year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

export function DateRangeFilter({
  selectedPreset,
  onPresetChange,
  startDate = "",
  endDate = "",
  onCustomDateChange,
}: DateRangeFilterProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 text-xs">
        {PRESETS.map((p) => {
          const isSelected = selectedPreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPresetChange(p.id)}
              className={`rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer ${
                isSelected
                  ? "bg-kivo-primary text-white shadow-2xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {selectedPreset === "custom" && onCustomDateChange && (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <div className="flex items-center gap-1.5 text-xs">
            <Label htmlFor="date-start" className="text-muted-foreground text-[11px]">
              From:
            </Label>
            <Input
              id="date-start"
              type="date"
              value={startDate}
              onChange={(e) => onCustomDateChange(e.target.value, endDate)}
              className="h-7 text-xs w-36"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Label htmlFor="date-end" className="text-muted-foreground text-[11px]">
              To:
            </Label>
            <Input
              id="date-end"
              type="date"
              value={endDate}
              onChange={(e) => onCustomDateChange(startDate, e.target.value)}
              className="h-7 text-xs w-36"
            />
          </div>
        </div>
      )}
    </div>
  );
}
