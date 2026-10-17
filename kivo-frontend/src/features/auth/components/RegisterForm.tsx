"use client";

import * as React from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import {
  registerSchema,
  type RegisterFormData,
  checkPasswordCriteria,
} from "../schemas/register.schema";
import { zodResolver } from "@/lib/utils/zodResolver";
import { FormField } from "./FormField";
import { PasswordField } from "./PasswordField";
import { Button } from "@/components/ui/button";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onBlur",
  });

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });
  const criteria = checkPasswordCriteria(passwordValue || "");

  const onSubmit = async () => {
    setIsSubmitting(true);
    // Showcase loading-ready state transition briefly without fake API or storage
    await new Promise((resolve) => setTimeout(resolve, 400));
    setIsSubmitting(false);
    setSubmitAttempted(true);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {submitAttempted && (
        <IntegrationPendingBadge
          variant="banner"
          message="Backend integration pending: Account registration API will be connected in Phase 3. No records were created."
        />
      )}

      <FormField
        id="register-fullName"
        label="Full name"
        type="text"
        placeholder="e.g. Adarsh Sharma"
        autoComplete="name"
        required
        error={errors.fullName?.message}
        disabled={isSubmitting}
        {...register("fullName")}
      />

      <FormField
        id="register-email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email?.message}
        disabled={isSubmitting}
        {...register("email")}
      />

      <div className="space-y-2">
        <PasswordField
          id="register-password"
          label="Password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          disabled={isSubmitting}
          {...register("password")}
        />

        {/* Live password requirement guidance */}
        <div className="rounded-lg border border-border/70 bg-muted/30 p-2.5 text-xs space-y-1">
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wider">
            Password Guidelines (Pre-Backend Verification)
          </p>
          <ul className="space-y-1 pt-1">
            {criteria.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  item.met
                    ? "text-finance-income font-medium"
                    : "text-muted-foreground"
                )}
              >
                {item.met ? (
                  <Check className="size-3.5 text-finance-income shrink-0" />
                ) : (
                  <X className="size-3.5 text-muted-foreground/60 shrink-0" />
                )}
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <PasswordField
        id="register-confirmPassword"
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        required
        error={errors.confirmPassword?.message}
        disabled={isSubmitting}
        {...register("confirmPassword")}
      />

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full font-medium"
          size="lg"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="sm" label="Creating account..." className="mr-2" />
              <span>Creating account...</span>
            </>
          ) : (
            <>
              <UserPlus className="size-4 mr-2" />
              <span>Create Account</span>
            </>
          )}
        </Button>
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-kivo-primary hover:underline hover:text-kivo-secondary dark:text-kivo-sage"
          >
            Sign in
          </Link>
        </p>
      </div>
    </form>
  );
}
