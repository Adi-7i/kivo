"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/features/auth/session";

interface NavItem {
  label: string;
  href: string;
  phase: string;
  isAvailable: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", phase: "Phase 3", isAvailable: true },
  { label: "Money Accounts", href: "/money", phase: "Phase 3", isAvailable: true },
  { label: "Transactions", href: "/transactions", phase: "Phase 3", isAvailable: true },
  { label: "Design System", href: "/", phase: "Phase 1", isAvailable: true },
  { label: "Sign In", href: "/login", phase: "Phase 2", isAvailable: true },
  { label: "Register", href: "/register", phase: "Phase 2", isAvailable: true },
  { label: "Onboarding", href: "/onboarding", phase: "Phase 2", isAvailable: true },
  { label: "Profile", href: "/settings/profile", phase: "Phase 2", isAvailable: true },
  { label: "Funds & Attribution", href: "/money/sources", phase: "Phase 4", isAvailable: true },
  { label: "People & Friends", href: "/people", phase: "Phase 5", isAvailable: true },
  { label: "Shared Expenses", href: "/shared-expenses", phase: "Phase 5", isAvailable: true },
  { label: "Rent & Reserves", href: "/rent", phase: "Phase 5", isAvailable: true },
  { label: "Budgets", href: "/budgets", phase: "Phase 6", isAvailable: true },
  { label: "Reports & Analytics", href: "/reports", phase: "Phase 6", isAvailable: true },
  { label: "Categories", href: "/settings/categories", phase: "Phase 7", isAvailable: true },
];

export function AppNav() {
  const { data: user } = useSession();
  return (
    <nav
      aria-label="Application navigation"
      className="flex items-center gap-1 overflow-x-auto py-2 border-b border-border bg-card/40 text-sm"
    >
      <div className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          if (user && ["/login", "/register"].includes(item.href)) return null;
          if (item.isAvailable) {
            return (
              <Link
                key={item.label}
                href={item.href}
                prefetch={false}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md hover:bg-muted text-foreground text-xs transition-colors"
              >
                <span>{item.label}</span>
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1 font-semibold border-kivo-sage text-kivo-brand-dark dark:text-kivo-sage"
                >
                  {item.phase}
                </Badge>
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
