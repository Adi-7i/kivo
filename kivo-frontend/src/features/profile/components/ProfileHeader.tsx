import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { User, Shield } from "lucide-react";

interface ProfileHeaderProps {
  displayName?: string;
  email?: string;
  isBackendConnected?: boolean;
}

export function ProfileHeader({
  displayName = "Unconnected User",
  email = "No authenticated session",
  isBackendConnected = false,
}: ProfileHeaderProps) {
  // Initials for avatar
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-2xs">
      <div className="flex items-center gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-kivo-primary/10 text-kivo-primary font-bold text-xl border border-kivo-primary/20">
          {initials}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              {displayName}
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-medium border-amber-600/30 text-amber-800 dark:text-amber-300 bg-amber-500/10"
            >
              {isBackendConnected ? "Connected" : "Preview Mode"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <User className="size-3.5" />
            <span>{email}</span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t sm:border-t-0 pt-3 sm:pt-0">
        <Shield className="size-4 text-kivo-primary" />
        <span>Django Identity & Auth Foundation</span>
      </div>
    </div>
  );
}
