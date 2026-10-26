"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isProtectedPath } from "@/features/auth/navigation";
import { NavigationProvider, useNavigation } from "./NavigationContext";
import { AppHeader } from "./AppHeader";
import { AppNav } from "./AppNav";

function Shell({ children }: { children: ReactNode }) {
  const { collapsed } = useNavigation();
  return (
    <div className="min-h-dvh min-w-0 bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppNav />
      <div className={collapsed ? "min-w-0 lg:pl-20" : "min-w-0 lg:pl-64"}>
        <AppHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 outline-none"
          data-testid="page-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/** A persistent shell; page changes preserve navigation and authenticated query state. */
export function ApplicationShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (!isProtectedPath(path) || path === "/onboarding") return children;
  return (
    <NavigationProvider>
      <Shell>{children}</Shell>
    </NavigationProvider>
  );
}
