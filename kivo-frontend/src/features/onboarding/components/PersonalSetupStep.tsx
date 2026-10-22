"use client";

import * as React from "react";
import { FormField } from "@/features/auth/components/FormField";
import { StepNavigation } from "./StepNavigation";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Globe, IndianRupee, Clock } from "lucide-react";
import type { OnboardingPersonalData } from "../types";

interface PersonalSetupStepProps {
  initialData: OnboardingPersonalData;
  onBack: () => void;
  onNext: (data: OnboardingPersonalData) => void;
}

export function PersonalSetupStep({ initialData, onBack, onNext }: PersonalSetupStepProps) {
  const displayName = initialData.displayName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext({
      displayName,
      currency: "INR",
      timezone: "Asia/Kolkata",
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left" noValidate>
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Personal Setup
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Confirm your display name and review the regional ledger standards.
        </p>
      </div>

      <div className="space-y-4">
        <FormField
          id="onboarding-displayName"
          label="Display Name"
          placeholder="e.g. Adarsh"
          readOnly
          value={displayName}
          helperText="Your registered identity. Profile editing is not currently supported."
        />

        {/* Currency Presentation */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-kivo-primary/10 text-kivo-primary">
                <IndianRupee className="size-4" />
              </div>
              <Label className="text-xs font-semibold text-foreground">Base Currency</Label>
            </div>
            <Badge
              variant="outline"
              className="text-xs font-bold border-kivo-sage text-kivo-brand-dark dark:text-kivo-sage"
            >
              INR (₹) &bull; Fixed
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            All monetary values are calculated in integer paise (1 INR = 100 paise) to eliminate
            floating-point drift.
          </p>
        </div>

        {/* Timezone Presentation */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-kivo-primary/10 text-kivo-primary">
                <Clock className="size-4" />
              </div>
              <Label className="text-xs font-semibold text-foreground">Workspace Timezone</Label>
            </div>
            <Badge variant="outline" className="text-xs font-medium border-border text-foreground">
              <Globe className="size-3 mr-1 text-kivo-secondary" />
              Asia/Kolkata (IST, UTC+05:30)
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Calendar-faithful transactions align to Indian Standard Time dates for precise daily
            spending summaries.
          </p>
        </div>
      </div>

      <StepNavigation type="submit" onBack={onBack} nextLabel="Continue to Account" />
    </form>
  );
}
