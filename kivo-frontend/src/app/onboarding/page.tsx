import * as React from "react";
import type { Metadata } from "next";
import { OnboardingShell } from "@/features/onboarding/components/OnboardingShell";

export const metadata: Metadata = {
  title: "First-Time Onboarding — Kivo",
  description: "Set up your first account and start tracking your money with Kivo.",
};

export default function OnboardingPage() {
  return <OnboardingShell />;
}
