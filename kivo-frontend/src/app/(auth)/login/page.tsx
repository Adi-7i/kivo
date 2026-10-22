import * as React from "react";
import type { Metadata } from "next";
import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { AuthFormContainer } from "@/features/auth/components/AuthFormContainer";
import { LoginForm } from "@/features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — Kivo",
  description: "Sign in to your Kivo personal money & expense management workspace.",
};

export default function LoginPage() {
  return (
    <AuthPageLayout
      title="Welcome back to Kivo"
      subtitle="Access your personal ledgers, track cashflows with integer precision, and keep your finances crystal clear."
    >
      <AuthFormContainer
        title="Sign in to your account"
        description="Enter your email and password to access your financial records."
      >
        <LoginForm />
      </AuthFormContainer>
    </AuthPageLayout>
  );
}
