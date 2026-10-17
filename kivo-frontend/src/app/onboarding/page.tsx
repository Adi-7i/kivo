import * as React from "react";
import type { Metadata } from "next";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";

export const metadata: Metadata = {
  title: "First-Time Onboarding — Kivo",
  description: "Complete your personal profile and configure your primary ledger account in Kivo.",
};

export default function OnboardingPage() {
  return <OnboardingShell />;
}
