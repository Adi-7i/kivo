"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldError } from "./FieldError";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface PasswordFieldProps extends Omit<React.ComponentProps<"input">, "id" | "type"> {
  id: string;
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  containerClassName?: string;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ id, label, error, helperText, required, className, containerClassName, ...props }, ref) => {
    const [isVisible, setIsVisible] = React.useState(false);
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

        <div className="relative">
          <Input
            id={id}
            ref={ref}
            type={isVisible ? "text" : "password"}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={cn(
              "pr-10",
              error && "border-destructive focus-visible:ring-destructive/20",
              className
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setIsVisible((prev) => !prev)}
            aria-label={isVisible ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isVisible ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>

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

PasswordField.displayName = "PasswordField";
