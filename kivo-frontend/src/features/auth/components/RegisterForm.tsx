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
import { authApi } from "../api";
import { navigate } from "../navigation";
import { ValidationError } from "@/lib/api/errors";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { UserPlus, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [registered, setRegistered] = React.useState(false);
  const submitLock = React.useRef(false);

  const {
    register,
    handleSubmit,
    control,
    setError,
    resetField,
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

  const onSubmit = async (data: RegisterFormData) => {
    if (submitLock.current || registered) return;
    submitLock.current = true;
    setIsSubmitting(true);
    setMessage("");
    try {
      await authApi.register({ name: data.fullName, email: data.email, password: data.password });
      resetField("password");
      resetField("confirmPassword");
      setRegistered(true);
      // Django registration creates a user, not a session. Login remains explicit.
      navigate("/login");
    } catch (error) {
      if (error instanceof ValidationError) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          const name = field === "name" ? "fullName" : field;
          if (["fullName", "email", "password"].includes(name))
            setError(name as keyof RegisterFormData, { message: messages.join(" ") });
        }
      }
      setMessage(
        error instanceof Error
          ? error.message
          : "Registration could not be confirmed. Try signing in before retrying."
      );
    } finally {
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
      {registered && (
        <div role="status" className="rounded-lg border border-kivo-sage p-3 text-sm">
          Your account was created.{" "}
          <Link href="/login" className="font-semibold underline">
            Sign in to continue to setup
          </Link>
          .
        </div>
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
            Password Requirements
          </p>
          <ul className="space-y-1 pt-1">
            {criteria.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-center gap-1.5 text-xs transition-colors",
                  item.met ? "text-finance-income font-medium" : "text-muted-foreground"
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
          <p>Django also rejects common passwords and passwords similar to your name or email.</p>
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
          disabled={isSubmitting || registered}
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
