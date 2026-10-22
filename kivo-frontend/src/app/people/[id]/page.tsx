import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { ContactDetailView } from "@/features/people/components/ContactDetailView";
import { PREVIEW_CONTACTS } from "@/features/people/data/previewContacts";
import { ArrowLeft, UserX } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Details & Relationship — Kivo",
  description:
    "Examine personal lending, borrowing, shared expenses, and settlement timeline with this contact.",
};

export function generateStaticParams() {
  return PREVIEW_CONTACTS.map((c) => ({ id: c.id }));
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: PageProps) {
  const { id } = await params;
  const contact = PREVIEW_CONTACTS.find((c) => c.id === id);

  if (!contact) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <PageContainer className="py-12 text-center space-y-4">
          <div className="size-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <UserX className="size-6" />
          </div>
          <h1 className="text-xl font-heading font-bold text-foreground">Contact Not Found</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No contact record matching ID &quot;{id}&quot; exists in local preview data.
          </p>
          <Link
            href="/people"
            className="inline-flex items-center gap-1.5 text-sm text-kivo-primary hover:underline font-medium"
          >
            <ArrowLeft className="size-4" />
            <span>Return to Contacts Overview</span>
          </Link>
        </PageContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <PageContainer className="py-6 sm:py-8">
        <ContactDetailView initialContact={contact} />
      </PageContainer>
    </div>
  );
}
