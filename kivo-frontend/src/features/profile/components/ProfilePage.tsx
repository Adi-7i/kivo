"use client";

import * as React from "react";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileInfoSection } from "./ProfileInfoSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Notice Alert */}
      <Alert className="border-amber-600/30 bg-amber-500/10 text-foreground">
        <Info className="size-4 text-amber-700 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
          User Profile UI Preview
        </AlertTitle>
        <AlertDescription className="text-muted-foreground mt-1 text-xs">
          This screen demonstrates the profile layout and configuration options. Because backend
          integration is deferred until later phases, fields are displayed in unconnected preview
          mode without synthetic user identities.
        </AlertDescription>
      </Alert>

      <ProfileHeader
        displayName="Unconnected Profile"
        email="No authenticated session"
        isBackendConnected={false}
      />

      <ProfileInfoSection />
    </div>
  );
}
