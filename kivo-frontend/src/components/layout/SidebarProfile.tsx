"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import { useSession, useLogout } from "@/features/auth/session";
import { Button } from "@/components/ui/button";

function getInitials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    return email.slice(0, 2).toUpperCase();
  }
  return "K";
}

export function SidebarProfile({
  compact = false,
  onNavigate,
}: {
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { data: user, isLoading } = useSession();
  const { logout, busy } = useLogout();

  const isProfileActive = pathname === "/settings/profile";
  const initials = getInitials(user?.name, user?.email);
  const displayName = user?.name || user?.email || "Account";

  if (isLoading) {
    return (
      <div className="border-t border-border/80 p-3">
        <div className={`flex items-center gap-3 ${compact ? "justify-center" : ""}`}>
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
          {!compact && (
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-muted" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="border-t border-border/80 bg-card/50 p-2.5">
      <div className={`flex items-center gap-2 ${compact ? "flex-col justify-center" : "justify-between"}`}>
        <Link
          href="/settings/profile"
          prefetch={false}
          onClick={onNavigate}
          title={compact ? "Profile" : undefined}
          aria-label="Profile"
          aria-current={isProfileActive ? "page" : undefined}
          className={`group flex min-w-0 items-center gap-3 rounded-lg p-1.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            compact ? "justify-center" : "flex-1"
          } ${
            isProfileActive
              ? "bg-kivo-primary/10 text-kivo-primary"
              : "hover:bg-muted/70 text-foreground"
          }`}
        >
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-kivo-primary/15 font-semibold text-kivo-primary text-xs ring-1 ring-kivo-primary/25 transition-transform duration-150 group-hover:scale-105">
            {initials || <UserIcon className="size-4" />}
          </div>
          {!compact && (
            <div className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-foreground group-hover:text-kivo-primary transition-colors">
                {displayName}
              </p>
              {user.email && (
                <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
              )}
            </div>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void logout()}
          disabled={busy}
          title="Sign out"
          aria-label="Sign out"
          className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive"
        >
          <LogOut className="size-4" aria-hidden="true" />
          <span className="sr-only">Sign out</span>
        </Button>
      </div>
    </div>
  );
}
