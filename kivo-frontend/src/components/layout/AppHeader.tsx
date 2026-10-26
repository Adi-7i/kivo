"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { SessionMenu } from "@/features/auth/session";
import { Button } from "@/components/ui/button";
import { useNavigation } from "./NavigationContext";

export function AppHeader() {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useNavigation();
  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            id="mobile-navigation-trigger"
            variant="ghost"
            size="icon"
            className="size-11 shrink-0 lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
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
          <Link href="/dashboard" prefetch={false} className="font-bold text-foreground lg:hidden">
            Kivo
          </Link>
          <span className="hidden text-sm text-muted-foreground lg:inline">
            Your money, clearly.
          </span>
        </div>
        <SessionMenu />
      </div>
    </header>
  );
}
