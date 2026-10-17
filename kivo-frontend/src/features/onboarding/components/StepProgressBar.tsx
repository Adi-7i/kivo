import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  steps: {
    number: number;
    title: string;
  }[];
  onStepClick?: (stepNumber: number) => void;
}

export function StepProgressBar({
  currentStep,
  steps,
  onStepClick,
}: StepProgressBarProps) {
  return (
    <nav aria-label="Onboarding Progress" className="w-full">
      <ol className="flex items-center justify-between w-full">
        {steps.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = isCompleted && onStepClick;

          return (
            <li
              key={step.number}
              className={cn(
                "flex flex-1 items-center",
                idx === steps.length - 1 ? "flex-none" : ""
              )}
            >
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(step.number)}
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Step ${step.number}: ${step.title}${isCompleted ? " (completed)" : isCurrent ? " (current)" : ""}`}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full text-xs font-semibold transition-all select-none",
                    isCompleted &&
                      "bg-kivo-primary text-white hover:bg-kivo-secondary cursor-pointer shadow-xs",
                    isCurrent &&
                      "border-2 border-kivo-primary bg-background text-kivo-primary font-bold shadow-xs ring-4 ring-kivo-primary/15",
                    !isCompleted &&
                      !isCurrent &&
                      "border border-border bg-muted/60 text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4 stroke-[2.5]" aria-hidden="true" />
                  ) : (
                    step.number
                  )}
                </button>
                <span
                  className={cn(
                    "mt-1.5 text-[11px] font-medium hidden sm:block text-center max-w-[80px] leading-tight",
                    isCurrent
                      ? "text-kivo-primary font-bold"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground/80"
                  )}
                >
                  {step.title}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 w-full mx-2 sm:mx-4 transition-colors",
                    isCompleted ? "bg-kivo-primary" : "bg-border"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
