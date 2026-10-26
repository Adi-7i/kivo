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
  UserRound,
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
    label: "Settings",
    items: [
      { label: "Categories", href: "/settings/categories", icon: Tags },
      { label: "Profile", href: "/settings/profile", icon: UserRound },
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
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={compact ? "sr-only" : "truncate"}>{item.label}</span>
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
    <nav aria-label="Application navigation" className="space-y-5 px-3 pb-6">
      {GROUPS.map((group) => (
        <div key={group.label}>
          <p
            className={
              compact
                ? "sr-only"
                : "px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            }
          >
            {group.label}
          </p>
          <ul className="space-y-1">
            {group.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  onNavigate={close}
                  title={compact ? item.label : undefined}
                  aria-current={isNavigationActive(path, item.href) ? "page" : undefined}
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isNavigationActive(path, item.href) ? "bg-kivo-primary text-white shadow-xs" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                >
                  <LinkLabel item={item} compact={compact} />
                </Link>
              </li>
            ))}
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
      className="flex h-16 shrink-0 items-center gap-3 px-6 font-bold text-kivo-brand-dark"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kivo-primary text-white">
        K
      </span>
      {!compact && <span className="text-xl tracking-tight">Kivo</span>}
    </Link>
  );
}

export function AppNav() {
  const { collapsed, mobileOpen, setMobileOpen } = useNavigation();
  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card lg:flex ${collapsed ? "w-20" : "w-64"}`}
        aria-label="Main sidebar"
      >
        <Brand compact={collapsed} />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <NavigationItems compact={collapsed} />
        </div>
      </aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent
          className="left-0 top-0 h-dvh max-h-dvh w-[min(20rem,calc(100vw-2rem))] max-w-none translate-x-0 translate-y-0 rounded-none p-0 sm:max-w-none"
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
          <NavigationItems close={() => setMobileOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
