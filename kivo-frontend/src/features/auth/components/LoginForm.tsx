"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { loginSchema, type LoginFormData } from "../schemas/login.schema";
import { zodResolver } from "@/lib/utils/zodResolver";
import { FormField } from "./FormField";
import { PasswordField } from "./PasswordField";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { authApi } from "../api";
import { notifySessionChange, SESSION_KEY } from "../session";
import { navigate, safeReturnPath } from "../navigation";
import { listAccounts } from "@/features/onboarding/api";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { LogIn } from "lucide-react";

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const submitLock = React.useRef(false);
  const queryClient = useQueryClient();

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

  const onSubmit = async (data: LoginFormData) => {
    if (submitLock.current) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setMessage("");
    try {
      const user = await authApi.login(data);
      await queryClient.cancelQueries();
      queryClient.clear();
      const next = safeReturnPath(new URLSearchParams(window.location.search).get("next"));
      let accounts;
      try {
        accounts = await listAccounts();
      } catch {
        queryClient.setQueryData(SESSION_KEY, user);
        notifySessionChange();
        navigate(`/onboarding?next=${encodeURIComponent(next)}`);
        return;
      }
      queryClient.setQueryData(["accounts", user.id], accounts);
      queryClient.setQueryData(SESSION_KEY, user);
      notifySessionChange();
      navigate(accounts.count === 0 ? "/onboarding" : next === "/onboarding" ? "/dashboard" : next);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Sign in could not be confirmed. Please try again."
      );
      submitLock.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4" noValidate>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
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
        <Button type="submit" className="w-full font-medium" size="lg" disabled={isSubmitting}>
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
