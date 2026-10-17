import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  phase: string;
  isAvailableInPhase1: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Design System", href: "/", phase: "Phase 1", isAvailableInPhase1: true },
  { label: "Accounts & Ledger", href: "#", phase: "Phase 3", isAvailableInPhase1: false },
  { label: "Funds & Attribution", href: "#", phase: "Phase 4", isAvailableInPhase1: false },
  { label: "Sharing & Rent", href: "#", phase: "Phase 5", isAvailableInPhase1: false },
  { label: "Budgets & Analytics", href: "#", phase: "Phase 6", isAvailableInPhase1: false },
];

export function AppNav() {
  return (
    <nav
      aria-label="Application navigation"
      className="flex items-center gap-1 overflow-x-auto py-2 border-b border-border bg-card/40 text-sm"
    >
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          if (item.isAvailableInPhase1) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md bg-kivo-primary/10 text-kivo-primary text-xs"
              >
                {item.label}
              </Link>
            );
          }

          return (
            <span
              key={item.label}
              aria-disabled="true"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground/60 cursor-not-allowed select-none"
            >
              <span>{item.label}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1 font-normal opacity-70">
                {item.phase}
              </Badge>
            </span>
          );
        })}
      </div>
    </nav>
  );
}
