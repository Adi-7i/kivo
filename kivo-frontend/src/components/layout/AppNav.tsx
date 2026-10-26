"use client";

import Link from "next/link";
import { useSession } from "@/features/auth/session";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Money Accounts", href: "/money" },
  { label: "Transactions", href: "/transactions" },
  { label: "Funds & Attribution", href: "/money/sources" },
  { label: "People & Friends", href: "/people" },
  { label: "Shared Expenses", href: "/shared-expenses" },
  { label: "Rent & Reserves", href: "/rent" },
  { label: "Budgets", href: "/budgets" },
  { label: "Reports & Analytics", href: "/reports" },
  { label: "Categories", href: "/settings/categories" },
  { label: "Profile", href: "/settings/profile" },
];

export function AppNav() {
  const { data: user } = useSession();
  const items = user
    ? NAV_ITEMS
    : [
        { label: "Register", href: "/register" },
        { label: "Sign In", href: "/login" },
      ];
  return (
    <nav
      aria-label="Application navigation"
      className="flex items-center gap-1 overflow-x-auto py-2 border-b border-border bg-card/40 text-sm"
    >
      <div className="flex items-center gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 font-medium rounded-md hover:bg-muted text-foreground text-xs transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
