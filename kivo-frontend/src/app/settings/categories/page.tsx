"use client";

import * as React from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppNav } from "@/components/layout/AppNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionHeader } from "@/features/shared-financial/SectionHeader";
import { CategoryList } from "@/features/categories/components/CategoryList";
import { CategoryModal } from "@/features/categories/components/CategoryModal";
import { CategorySeedBanner } from "@/features/categories/components/CategorySeedBanner";
import { Button } from "@/components/ui/button";
import { PREVIEW_CATEGORIES } from "@/features/categories/data/previewCategories";
import type { CategoryEntity, CategoryFormData } from "@/features/categories/types";
import { Plus } from "lucide-react";

export default function SettingsCategoriesPage() {
  const [categories, setCategories] = React.useState<CategoryEntity[]>(PREVIEW_CATEGORIES);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryEntity | null>(null);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setModalOpen(true);
  };

  const handleEdit = (cat: CategoryEntity) => {
    setEditingCategory(cat);
    setModalOpen(true);
  };

  const handleSuccess = (formData: CategoryFormData) => {
    if (editingCategory) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingCategory.id
            ? { ...c, name: formData.name, color: formData.color, isExpense: formData.isExpense }
            : c
        )
      );
    } else {
      const newCat: CategoryEntity = {
        id: `cat-${Date.now()}`,
        name: formData.name,
        color: formData.color,
        icon: formData.icon,
        isExpense: formData.isExpense,
        isDefault: false,
      };
      setCategories((prev) => [...prev, newCat]);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <AppHeader />
      <div className="border-b border-border bg-card/50">
        <PageContainer>
          <AppNav />
        </PageContainer>
      </div>

      <PageContainer className="py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <SectionHeader
            title="Category Management"
            description="Configure personal expense and income categories for transaction labeling and budget tracking."
          />

          <Button
            type="button"
            size="sm"
            onClick={handleOpenCreate}
            className="text-xs bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5 self-start sm:self-auto"
          >
            <Plus className="size-3.5" />
            <span>Add Category</span>
          </Button>
        </div>

        {/* Default Seed Banner */}
        <CategorySeedBanner />

        {/* Categories List */}
        <CategoryList categories={categories} onEditCategory={handleEdit} />

        {/* Create / Edit Modal */}
        <CategoryModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          category={editingCategory}
          onSuccess={handleSuccess}
        />
      </PageContainer>
    </div>
  );
}
