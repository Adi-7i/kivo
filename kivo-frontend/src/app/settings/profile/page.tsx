import * as React from "react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfilePage } from "@/features/profile/components/ProfilePage";

export const metadata: Metadata = {
  title: "User Profile & Settings — Kivo",
  description:
    "View and manage your personal user profile, regional defaults, and security preferences.",
};

export default function SettingsProfileRoute() {
  return (
    <div className="flex flex-col bg-background text-foreground">
      <PageContainer maxWidth="2xl" className="py-8">
        <ProfilePage />
      </PageContainer>
    </div>
  );
}
