"use client";

import * as React from "react";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileInfoSection } from "./ProfileInfoSection";
import { ProfileSignOut } from "./ProfileSignOut";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useSession } from "@/features/auth/session";

export function ProfilePage() {
  const { data: user, isPending, isError } = useSession();
  if (isPending) return <p role="status">Loading your profile…</p>;
  if (isError || !user) return <p role="alert">Your profile is unavailable. Please try again.</p>;
  return (
    <div className="space-y-6">
      {/* Notice Alert */}
      <Alert className="border-amber-600/30 bg-amber-500/10 text-foreground">
        <Info className="size-4 text-amber-700 dark:text-amber-400" />
        <AlertTitle className="font-semibold text-amber-900 dark:text-amber-200">
          Your Profile
        </AlertTitle>
        <AlertDescription className="text-muted-foreground mt-1 text-xs">
          Your account details are shown below. Profile changes and password changes are not
          currently supported.
        </AlertDescription>
      </Alert>

      <ProfileHeader displayName={user.name || user.email} email={user.email} />

      <ProfileInfoSection user={user} />

      <ProfileSignOut />
    </div>
  );
}

