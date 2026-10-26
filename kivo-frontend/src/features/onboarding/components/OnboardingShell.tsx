"use client";

import * as React from "react";
import Link from "next/link";
import { StepProgressBar } from "./StepProgressBar";
import { WelcomeStep } from "./WelcomeStep";
import { PersonalSetupStep } from "./PersonalSetupStep";
import { FirstAccountStep } from "./FirstAccountStep";
import { SetupSummaryStep } from "./SetupSummaryStep";
import { Card, CardContent } from "@/components/ui/card";
import type { OnboardingState, OnboardingPersonalData, OnboardingAccountData } from "../types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/features/auth/session";
import type { UserProfile } from "@/features/auth/api";
import { navigate, safeReturnPath } from "@/features/auth/navigation";
import { ACCOUNT_SETUP_STALE_MS, createInitialAccount, listAccounts } from "../api";
import { clearAttempt, readAttempt, saveAttempt, type AccountAttempt } from "../attempt";
import { normalizeOpeningBalance, todayInKolkata } from "../money";
import { KivoApiError } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";

const STEPS = [
  { number: 1, title: "Welcome" },
  { number: 2, title: "Personal" },
  { number: 3, title: "Account" },
  { number: 4, title: "Summary" },
];

export function OnboardingShell() {
  const { data: user } = useSession();
  const accounts = useQuery({
    queryKey: ["accounts", user?.id],
    queryFn: ({ signal }) => listAccounts(signal),
    enabled: !!user,
    staleTime: ACCOUNT_SETUP_STALE_MS,
    retry: false,
  });
  React.useEffect(() => {
    if (accounts.data && accounts.data.count > 0 && user) {
      clearAttempt(user.id);
      const target = safeReturnPath(new URLSearchParams(window.location.search).get("next"));
      navigate(target === "/onboarding" ? "/dashboard" : target);
    }
  }, [accounts.data, user]);
  if (accounts.isError)
    return (
      <main className="p-8 space-y-4" role="alert">
        <p>We cannot check your accounts right now. No account creation will be attempted.</p>
        <Button onClick={() => void accounts.refetch()}>Retry account check</Button>
      </main>
    );
  if (!user || !accounts.data || accounts.data.count > 0)
    return (
      <main className="p-8" role="status">
        Checking your accounts…
      </main>
    );
  return <OnboardingWizard key={user.id} user={user} />;
}

function OnboardingWizard({ user }: { user: UserProfile }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState<AccountAttempt | null>(() => readAttempt(user.id));
  const [canRetry, setCanRetry] = React.useState(false);
  const submitLock = React.useRef(false);
  const [state, setState] = React.useState<OnboardingState>(() => ({
    step: 1,
    personal: {
      displayName: user.name || user.email,
      currency: "INR",
      timezone: "Asia/Kolkata",
    },
    account: {
      accountName: "",
      accountType: "bank",
      openingBalance: "0",
      openingDate: todayInKolkata(),
    },
    ...(pending
      ? {
          step: 4,
          account: {
            accountName: pending.body.name,
            accountType: pending.body.kind,
            openingBalance: pending.body.opening_balance,
            openingDate: pending.body.opened_on,
          },
        }
      : {}),
  }));

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState(
    pending ? "An earlier account request was not confirmed. Check its status before retrying." : ""
  );

  const handleStep1Next = () => {
    setState((prev) => ({
      ...prev,
      step: 2,
      account: {
        ...prev.account,
        openingDate: prev.account.openingDate || todayInKolkata(),
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
        openingDate: prev.account.openingDate || todayInKolkata(),
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
    if (pending || submitLock.current) return;
    if (targetStep >= 1 && targetStep <= 4) {
      setState((prev) => ({ ...prev, step: targetStep as 1 | 2 | 3 | 4 }));
    }
  };

  const handleComplete = async () => {
    if (submitLock.current || (pending && !canRetry)) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setMessage("");
    let attempt = pending;
    let completed = false;
    try {
      const current = await listAccounts();
      if (current.count > 0) {
        completed = true;
        navigate("/dashboard");
        return;
      }
      if (!attempt) {
        attempt = {
          key: crypto.randomUUID(),
          body: {
            name: state.account.accountName!,
            kind: state.account.accountType!,
            opened_on: state.account.openingDate!,
            opening_balance: normalizeOpeningBalance(state.account.openingBalance!),
          },
        };
        // Persist before sending: a reload must not replace an ambiguous operation's key.
        saveAttempt(user.id, attempt);
        setPending(attempt);
      }
      const account = await createInitialAccount(attempt.body, attempt.key);
      if (!account.id) throw new Error("Account creation was not confirmed.");
      clearAttempt(user.id);
      completed = true;
      await queryClient.invalidateQueries({ queryKey: ["accounts", user.id] });
      navigate("/dashboard");
    } catch (error) {
      if (
        error instanceof KivoApiError &&
        error.status >= 400 &&
        error.status < 500 &&
        ![408, 409].includes(error.status)
      ) {
        clearAttempt(user.id);
        setPending(null);
        const details =
          "fieldErrors" in error && error.fieldErrors && typeof error.fieldErrors === "object"
            ? Object.values(error.fieldErrors).flat().join(" ")
            : "";
        setMessage(details || error.message);
      } else {
        setMessage(
          "Account creation was not confirmed. Check account status before deciding whether to retry the original request."
        );
      }
      setCanRetry(false);
    } finally {
      if (!completed) {
        submitLock.current = false;
        setIsSubmitting(false);
      }
    }
  };

  const checkStatus = async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    try {
      const accounts = await listAccounts();
      if (accounts.count > 0) {
        clearAttempt(user.id);
        navigate("/dashboard");
        return;
      }
      setCanRetry(true);
      setMessage(
        "No account is visible yet. You may deliberately retry the original request with its existing key."
      );
    } catch {
      setMessage("Account status is unavailable. Please check again later; no write was retried.");
    } finally {
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 sm:px-6">
      <div className="w-full max-w-2xl space-y-6">
        {message && (
          <div role="alert" className="rounded-lg border p-3 text-sm space-y-3">
            <p>{message}</p>
            {pending && (
              <Button onClick={() => void checkStatus()} disabled={isSubmitting}>
                Check account status
              </Button>
            )}
          </div>
        )}
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
          <StepProgressBar currentStep={state.step} steps={STEPS} onStepClick={handleEditStep} />
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
                onBack={() => {
                  if (!pending && !submitLock.current) handleStep4Back();
                }}
                onEditStep={handleEditStep}
                onComplete={handleComplete}
                isSubmitting={isSubmitting}
                recoveryPending={!!pending}
                canRetry={canRetry}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
