"use client";

import * as React from "react";
import Link from "next/link";
import { StepProgressBar } from "./StepProgressBar";
import { WelcomeStep } from "./WelcomeStep";
import { PersonalSetupStep } from "./PersonalSetupStep";
import { FirstAccountStep } from "./FirstAccountStep";
import { SetupSummaryStep } from "./SetupSummaryStep";
import { Card, CardContent } from "@/components/ui/card";
import type {
  OnboardingState,
  OnboardingPersonalData,
  OnboardingAccountData,
} from "../types";

const STEPS = [
  { number: 1, title: "Welcome" },
  { number: 2, title: "Personal" },
  { number: 3, title: "Account" },
  { number: 4, title: "Summary" },
];

export function OnboardingShell() {
  const [state, setState] = React.useState<OnboardingState>({
    step: 1,
    personal: {
      displayName: "",
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
    account: {
      accountName: "",
      accountType: "bank",
      openingBalance: "0",
      openingDate: "",
    },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCompleteAttempted, setIsCompleteAttempted] = React.useState(false);

  const handleStep1Next = () => {
    setState((prev) => ({
      ...prev,
      step: 2,
      account: {
        ...prev.account,
        openingDate: prev.account.openingDate || new Date().toISOString().split("T")[0],
      },
    }));
  };

  const handleStep2Back = () => {
    setState((prev) => ({ ...prev, step: 1 }));
  };

  const handleStep2Next = (personalData: OnboardingPersonalData) => {
    setState((prev) => ({
      ...prev,
      step: 3,
      personal: personalData,
      account: {
        ...prev.account,
        openingDate: prev.account.openingDate || new Date().toISOString().split("T")[0],
      },
    }));
  };

  const handleStep3Back = () => {
    setState((prev) => ({ ...prev, step: 2 }));
  };

  const handleStep3Next = (accountData: OnboardingAccountData) => {
    setState((prev) => ({
      ...prev,
      step: 4,
      account: accountData,
    }));
  };

  const handleStep4Back = () => {
    setState((prev) => ({ ...prev, step: 3 }));
  };

  const handleEditStep = (targetStep: number) => {
    if (targetStep >= 1 && targetStep <= 4) {
      setState((prev) => ({ ...prev, step: targetStep as 1 | 2 | 3 | 4 }));
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    // Showcase loading-ready state transition briefly without fake API or storage
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSubmitting(false);
    setIsCompleteAttempted(true);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Top brand header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-kivo-primary text-white font-bold text-base shadow-xs transition-transform group-hover:scale-105">
              K
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-foreground leading-none">
                Kivo
              </span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                First-Time Setup
              </span>
            </div>
          </Link>

          <span className="text-xs font-semibold text-kivo-primary bg-kivo-primary/10 px-2.5 py-1 rounded-full">
            Step {state.step} of 4
          </span>
        </div>

        {/* Stepper progress bar */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <StepProgressBar
            currentStep={state.step}
            steps={STEPS}
            onStepClick={handleEditStep}
          />
        </div>

        {/* Dynamic step body card */}
        <Card className="border-border shadow-xs bg-card">
          <CardContent className="p-6 sm:p-8">
            {state.step === 1 && <WelcomeStep onNext={handleStep1Next} />}

            {state.step === 2 && (
              <PersonalSetupStep
                initialData={state.personal}
                onBack={handleStep2Back}
                onNext={handleStep2Next}
              />
            )}

            {state.step === 3 && (
              <FirstAccountStep
                initialData={state.account}
                onBack={handleStep3Back}
                onNext={handleStep3Next}
              />
            )}

            {state.step === 4 && (
              <SetupSummaryStep
                personal={state.personal}
                account={state.account}
                onBack={handleStep4Back}
                onEditStep={handleEditStep}
                onComplete={handleComplete}
                isSubmitting={isSubmitting}
                isCompleteAttempted={isCompleteAttempted}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
