"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Route,
  Users,
  Receipt,
  House,
  Target,
  ChartNoAxesCombined,
  Tags,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigation } from "./NavigationContext";
import { SidebarProfile } from "./SidebarProfile";

type Item = { label: string; href: string; icon: LucideIcon };
const GROUPS: { label: string; items: Item[] }[] = [
  { label: "Overview", items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }] },
  {
    label: "Money & transactions",
    items: [
      { label: "Money Accounts", href: "/money", icon: Wallet },
      { label: "Transactions", href: "/transactions", icon: ArrowLeftRight },
      { label: "Funds & Attribution", href: "/money/sources", icon: Route },
    ],
  },
  {
    label: "People & shared expenses",
    items: [
      { label: "People & Friends", href: "/people", icon: Users },
      { label: "Shared Expenses", href: "/shared-expenses", icon: Receipt },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "Rent & Reserves", href: "/rent", icon: House },
      { label: "Budgets", href: "/budgets", icon: Target },
      { label: "Reports & Analytics", href: "/reports", icon: ChartNoAxesCombined },
    ],
  },
  {
    label: "Manage",
    items: [
      { label: "Categories", href: "/settings/categories", icon: Tags },
    ],
  },
];

export function isNavigationActive(path: string, href: string): boolean {
  if (href === "/money" && (path === "/money/sources" || path.startsWith("/money/sources/")))
    return false;
  return path === href || path.startsWith(href + "/");
}

function LinkLabel({ item, compact }: { item: Item; compact: boolean }) {
  const { pending } = useLinkStatus();
  const Icon = item.icon;
  return (
    <span
      data-navigation-pending={pending ? "true" : undefined}
      className={`flex min-w-0 items-center gap-3 ${pending ? "opacity-60" : ""}`}
    >
      <Icon className="size-4 shrink-0 transition-transform duration-150 group-hover:scale-105" aria-hidden="true" />
      <span className={compact ? "sr-only" : "truncate text-xs font-medium"}>{item.label}</span>
      {pending && (
        <span className="sr-only" role="status">
          Opening {item.label}…
        </span>
      )}
    </span>
  );
}

function NavigationItems({ compact = false, close }: { compact?: boolean; close?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Application navigation" className="space-y-4 px-2.5 py-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <p
            className={
              compact
                ? "sr-only"
                : "px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/75"
            }
          >
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavigationActive(path, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onNavigate={close}
                    title={compact ? item.label : undefined}
                    aria-current={active ? "page" : undefined}
                    className={`group relative block rounded-lg px-3 py-2 text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active
                        ? "bg-kivo-primary/10 font-semibold text-kivo-primary dark:bg-kivo-primary/20 dark:text-kivo-sage shadow-2xs before:absolute before:inset-y-1.5 before:left-0 before:w-1 before:rounded-r-full before:bg-kivo-primary"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    }`}
                  >
                    <LinkLabel item={item} compact={compact} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/dashboard"
      prefetch={false}
      aria-label="Kivo dashboard"
      className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-4 font-bold text-foreground transition-opacity hover:opacity-90"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kivo-primary font-bold text-white shadow-xs">
        K
      </span>
      {!compact && (
        <div className="flex flex-col">
          <span className="text-base tracking-tight font-bold">Kivo</span>
          <span className="text-[10px] -mt-0.5 font-normal text-muted-foreground">Finance OS</span>
        </div>
      )}
    </Link>
  );
}

export function AppNav() {
  const { collapsed, mobileOpen, setMobileOpen } = useNavigation();
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out lg:flex ${
          collapsed ? "w-[76px]" : "w-64"
        }`}
        aria-label="Main sidebar"
      >
        <Brand compact={collapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <NavigationItems compact={collapsed} />
        </div>
        <SidebarProfile compact={collapsed} />
      </aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          className="left-0 top-0 h-dvh max-h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-none flex flex-col"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            document.getElementById("mobile-navigation-trigger")?.focus();
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription>Choose a page in your Kivo account.</DialogDescription>
          </DialogHeader>
          <Brand />
          <div className="flex-1 overflow-y-auto">
            <NavigationItems close={() => setMobileOpen(false)} />
          </div>
          <SidebarProfile onNavigate={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

