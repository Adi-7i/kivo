import * as React from "react";
import type { Metadata } from "next";
import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { AuthFormContainer } from "@/features/auth/components/AuthFormContainer";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account — Kivo",
  description: "Create your personal Kivo expense and money management account.",
};

export default function RegisterPage() {
  return (
    <AuthPageLayout
      title="Start your financial clarity journey"
      subtitle="Join Kivo for private, reliable, and mathematically accurate personal money management."
    >
      <AuthFormContainer
        title="Create your account"
        description="Set up your profile credentials to start tracking your finances."
      >
        <RegisterForm />
      </AuthFormContainer>
    </AuthPageLayout>
  );
}
