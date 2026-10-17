import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldError } from "./FieldError";
import { cn } from "@/lib/utils";

interface FormFieldProps extends Omit<React.ComponentProps<"input">, "id"> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
}

export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      id,
      label,
      error,
      helperText,
      required,
      className,
      containerClassName,
      ...props
    },
    ref
  ) => {
    const errorId = error ? `${id}-error` : undefined;
    const helperId = helperText ? `${id}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    return (
      <div className={cn("space-y-1.5 text-left", containerClassName)}>
        <div className="flex items-center justify-between">
          <Label htmlFor={id} className="text-xs font-semibold text-foreground">
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </Label>
        </div>

        <Input
          id={id}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={cn(
            error && "border-destructive focus-visible:ring-destructive/20",
            className
          )}
          {...props}
        />

        {helperText && !error && (
          <p id={helperId} className="text-[11px] text-muted-foreground">
            {helperText}
          </p>
        )}

        <FieldError id={errorId} error={error} />
      </div>
    );
  }
);

FormField.displayName = "FormField";
