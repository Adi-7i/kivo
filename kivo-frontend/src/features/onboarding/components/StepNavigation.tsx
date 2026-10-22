import * as React from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

interface StepNavigationProps {
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  backLabel?: string;
  isNextDisabled?: boolean;
  isBackDisabled?: boolean;
  isLoading?: boolean;
  isFinalStep?: boolean;
  type?: "button" | "submit";
}

export function StepNavigation({
  onBack,
  onNext,
  nextLabel = "Continue",
  backLabel = "Back",
  isNextDisabled = false,
  isBackDisabled = false,
  isLoading = false,
  isFinalStep = false,
  type = "button",
}: StepNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
      {onBack ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          disabled={isBackDisabled || isLoading}
          className="gap-1.5"
        >
          <ArrowLeft className="size-3.5" />
          <span>{backLabel}</span>
        </Button>
      ) : (
        <div />
      )}

      <Button
        type={type}
        size="sm"
        onClick={type === "button" ? onNext : undefined}
        disabled={isNextDisabled || isLoading}
        className="gap-1.5 font-medium min-w-[100px]"
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" className="mr-1.5" />
            <span>Processing...</span>
          </>
        ) : isFinalStep ? (
          <>
            <CheckCircle2 className="size-3.5" />
            <span>{nextLabel}</span>
          </>
        ) : (
          <>
            <span>{nextLabel}</span>
            <ArrowRight className="size-3.5" />
          </>
        )}
      </Button>
    </div>
  );
}
