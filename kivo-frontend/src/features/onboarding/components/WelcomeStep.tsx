import * as React from "react";
import { StepNavigation } from "./StepNavigation";
import { Coins, ArrowRightLeft, ShieldCheck, Sparkles } from "lucide-react";

interface WelcomeStepProps {
  onNext: () => void;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-kivo-primary/10 text-kivo-primary mb-1">
          <Sparkles className="size-6 text-kivo-primary" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Welcome to Kivo
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          See your money clearly and build habits that work for you.
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid gap-3 sm:grid-cols-3 pt-2">
        <div className="rounded-xl border border-border bg-card p-4 text-left shadow-2xs space-y-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-kivo-primary/10 text-kivo-primary">
            <Coins className="size-4" />
          </div>
          <h3 className="text-xs font-bold text-foreground">Accurate to the paisa</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Keep track of every rupee and paisa with precise amounts.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-left shadow-2xs space-y-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-kivo-primary/10 text-kivo-primary">
            <ArrowRightLeft className="size-4" />
          </div>
          <h3 className="text-xs font-bold text-foreground">Movement ≠ Expense</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Transfers, loans given, and repayments change account balances, but are not expenses.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 text-left shadow-2xs space-y-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-kivo-primary/10 text-kivo-primary">
            <ShieldCheck className="size-4" />
          </div>
          <h3 className="text-xs font-bold text-foreground">Total Ownership</h3>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Record your money yourself. Kivo does not connect to your bank or move money for you.
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-kivo-sage/40 bg-kivo-sage/10 p-3.5 text-xs text-muted-foreground text-left">
        <p className="font-semibold text-kivo-brand-dark dark:text-kivo-sage">
          First-Time Setup Guide
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Over the next 3 brief steps, you&apos;ll configure your display profile, confirm your
          currency and timezone, and register your first money account.
        </p>
      </div>

      <StepNavigation onNext={onNext} nextLabel="Begin Setup" />
    </div>
  );
}
