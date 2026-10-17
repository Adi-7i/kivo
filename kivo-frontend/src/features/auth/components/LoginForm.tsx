"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import { zodResolver } from "@/lib/utils/zodResolver";
import { FormField } from "./FormField";
import { PasswordField } from "./PasswordField";
import { Button } from "@/components/ui/button";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitAttempted, setSubmitAttempted] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

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
          message="Backend integration pending: Authentication API will be connected in Phase 3. No credentials were sent or stored."
        />
      )}

      <FormField
        id="login-email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        error={errors.email?.message}
        disabled={isSubmitting}
        {...register("email")}
      />

      <PasswordField
        id="login-password"
        label="Password"
        placeholder="Enter your password"
        autoComplete="current-password"
        required
        error={errors.password?.message}
        disabled={isSubmitting}
        {...register("password")}
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
              <LoadingSpinner size="sm" label="Validating..." className="mr-2" />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <LogIn className="size-4 mr-2" />
              <span>Sign In</span>
            </>
          )}
        </Button>
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-kivo-primary hover:underline hover:text-kivo-secondary dark:text-kivo-sage"
          >
            Create an account
          </Link>
        </p>
      </div>
    </form>
  );
}
