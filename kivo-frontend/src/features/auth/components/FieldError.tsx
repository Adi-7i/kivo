import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  error?: string;
}

export function FieldError({ error, className, id, ...props }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn(
        "mt-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive",
        className
      )}
      {...props}
    >
      <AlertCircle className="size-3.5 shrink-0" />
      <span>{error}</span>
    </p>
  );
}
