"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigation } from "./NavigationContext";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/money": "Money Accounts",
  "/money/sources": "Funds & Attribution",
  "/transactions": "Transactions",
  "/people": "People & Friends",
  "/shared-expenses": "Shared Expenses",
  "/rent": "Rent & Reserves",
  "/budgets": "Budgets",
  "/reports": "Reports & Analytics",
  "/settings/categories": "Categories",
  "/settings/profile": "Account Profile",
};

function getPageTitle(pathname: string): string {
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];
  if (pathname.startsWith("/money/sources")) return "Funds & Attribution";
  if (pathname.startsWith("/money")) return "Money Accounts";
  if (pathname.startsWith("/transactions")) return "Transactions";
  if (pathname.startsWith("/people")) return "People & Friends";
  if (pathname.startsWith("/shared-expenses")) return "Shared Expenses";
  if (pathname.startsWith("/rent")) return "Rent & Reserves";
  if (pathname.startsWith("/budgets")) return "Budgets";
  if (pathname.startsWith("/reports")) return "Reports & Analytics";
  if (pathname.startsWith("/settings/categories")) return "Categories";
  if (pathname.startsWith("/settings/profile")) return "Account Profile";
  return "Overview";
}

export function AppHeader() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useNavigation();
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border/80 bg-card/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-full max-w-7xl min-w-0 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button
            id="mobile-navigation-trigger"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 text-muted-foreground hover:text-foreground lg:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </Button>
          <Link
            href="/dashboard"
            prefetch={false}
            className="flex items-center gap-2 font-bold text-foreground lg:hidden"
          >
            <span className="flex size-7 items-center justify-center rounded-lg bg-kivo-primary text-xs font-bold text-white">
              K
            </span>
            <span className="text-sm font-semibold">Kivo</span>
          </Link>
          <div className="hidden h-4 w-px bg-border/80 lg:block" />
          <h1 className="truncate text-xs font-semibold text-foreground tracking-tight sm:text-sm">
            {pageTitle}
          </h1>
        </div>
      </div>
    </header>
  );
}

