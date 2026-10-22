"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/utils/zodResolver";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/components/FieldError";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { categorySchema, type CategoryFormData } from "../schemas/category.schema";
import { Tag, Plus, Check } from "lucide-react";
import type { CategoryEntity } from "../types";

const COLOR_PRESETS = [
  "#3A5A40", // Forest Primary
  "#344E41", // Deep Forest
  "#588157", // Moss Secondary
  "#A3B18A", // Sage
  "#8F5E14", // Amber Bronze
  "#283618", // Dark Olive
  "#606C38", // Earth Olive
  "#DDA15E", // Sand Gold
  "#BC6C25", // Terracotta
  "#5B685D", // Muted Slate
];

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: CategoryEntity | null;
  onSuccess?: (data: CategoryFormData) => void;
}

export function CategoryModal({
  open,
  onOpenChange,
  category,
  onSuccess,
}: CategoryModalProps) {
  const isEditing = Boolean(category);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    values: {
      name: category?.name || "",
      color: category?.color || "#3A5A40",
      icon: category?.icon || "Tag",
      isExpense: category?.isExpense ?? true,
    },
  });

  const selectedColor = watch("color");

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
      reset();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: CategoryFormData) => {
    setPendingNotice(
      isEditing
        ? `Backend integration pending: PATCH /api/v1/categories/${category?.id}/ will update "${data.name}".`
        : `Backend integration pending: POST /api/v1/categories/ will create category "${data.name}".`
    );
    onSuccess?.(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md w-full border-border bg-card">
        <DialogHeader className="text-left space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-kivo-primary/10 border border-kivo-primary/20 text-kivo-primary flex items-center justify-center">
              <Tag className="size-4" />
            </div>
            <DialogTitle className="text-lg font-bold font-heading">
              {isEditing ? "Edit Category" : "New Category"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditing
              ? "Update category details and classification settings."
              : "Create a custom category for classifying transactions and budgets."}
          </DialogDescription>
        </DialogHeader>

        {pendingNotice && (
          <IntegrationPendingBadge variant="banner" message={pendingNotice} />
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Category Name */}
          <div className="space-y-1.5 text-left">
            <Label htmlFor="cat-name" className="text-xs font-semibold text-foreground">
              Category Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              placeholder="e.g. Subscriptions & Software"
              {...register("name")}
              className="text-xs bg-muted/20"
            />
            {errors.name && <FieldError message={errors.name.message} />}
          </div>

          {/* Color Selection */}
          <div className="space-y-1.5 text-left">
            <Label className="text-xs font-semibold text-foreground">
              Badge & Chart Color
            </Label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map((hex) => {
                const isSelected = selectedColor?.toLowerCase() === hex.toLowerCase();
                return (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setValue("color", hex, { shouldValidate: true })}
                    className="size-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: hex,
                      borderColor: isSelected ? "var(--foreground)" : "transparent",
                    }}
                    title={hex}
                  >
                    {isSelected && <Check className="size-3 text-white drop-shadow" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classification type toggle */}
          <div className="space-y-1.5 text-left pt-1">
            <Label className="text-xs font-semibold text-foreground">
              Classification
            </Label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setValue("isExpense", true)}
                className={`py-2 px-3 rounded-lg border font-medium transition-colors ${
                  watch("isExpense")
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Expense Category
              </button>
              <button
                type="button"
                onClick={() => setValue("isExpense", false)}
                className={`py-2 px-3 rounded-lg border font-medium transition-colors ${
                  !watch("isExpense")
                    ? "border-kivo-primary bg-kivo-primary/10 text-kivo-primary"
                    : "border-border text-muted-foreground hover:bg-muted/40"
                }`}
              >
                Inflow / Income
              </button>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-kivo-primary hover:bg-kivo-brand-dark text-white gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>{isEditing ? "Save Changes" : "Create Category"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
