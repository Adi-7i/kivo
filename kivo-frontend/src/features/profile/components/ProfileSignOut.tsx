"use client";

import * as React from "react";
import { LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLogout } from "@/features/auth/session";

export function ProfileSignOut() {
  const { logout, busy, error } = useLogout();

  return (
    <Card className="border-destructive/25 bg-card shadow-card">
      <CardHeader className="border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-4 text-destructive" />
          <CardTitle className="text-base font-bold font-heading">Account Session</CardTitle>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Sign out of your Kivo account on this device.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Signing out clears your local cache and securely terminates your active session. You can
          sign back in at any time.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <Button
            variant="destructive"
            onClick={() => void logout()}
            disabled={busy}
            className="gap-2 font-medium shadow-xs"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span>{busy ? "Signing out…" : "Sign out"}</span>
          </Button>

          {error && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {error}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
