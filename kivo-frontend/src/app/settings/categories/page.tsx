"use client";
import * as React from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/features/shared-financial/SectionHeader";
import { CategoryList } from "@/features/categories/components/CategoryList";
import { CategoryModal } from "@/features/categories/components/CategoryModal";
import { CategorySeedBanner } from "@/features/categories/components/CategorySeedBanner";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/features/finance/queries";
import { QueryState } from "@/features/finance/QueryState";
import type { CategoryEntity } from "@/features/categories/types";
import { Plus } from "lucide-react";
export default function SettingsCategoriesPage() {
  const query = useCategories();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CategoryEntity | null>(null);
  return (
    <div className="flex flex-col bg-background text-foreground">
      <PageContainer className="py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SectionHeader
            title="Category Management"
            description="Manage transaction categories and preserve their historical references."
          />
          <Button
            size="sm"
            className="gap-1.5 self-start"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            Add Category
          </Button>
        </div>
        <CategorySeedBanner />
        <QueryState query={query} />
        {query.isSuccess && (
          <CategoryList
            categories={query.data}
            onEditCategory={(category) => {
              setEditing(category);
              setOpen(true);
            }}
          />
        )}
        {open && (
          <CategoryModal
            key={editing?.id ?? "new"}
            open={open}
            onOpenChange={setOpen}
            category={editing}
          />
        )}
      </PageContainer>
    </div>
  );
}
