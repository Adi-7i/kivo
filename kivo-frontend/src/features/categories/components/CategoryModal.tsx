"use client";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@/lib/utils/zodResolver";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/features/auth/components/FormField";
import { Tag } from "lucide-react";
import type { CategoryEntity } from "../types";
import { apiClient } from "@/lib/api/client";
import { financialError } from "@/features/finance/validation";
import { useCategories } from "@/features/finance/queries";
import { categorySchema, type CategoryFormData } from "../schemas/category.schema";

type FormData = CategoryFormData;
export function CategoryModal({
  open,
  onOpenChange,
  category,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  category?: CategoryEntity | null;
}) {
  const query = useCategories(open);
  const client = useQueryClient();
  const lock = React.useRef(false);
  const form = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      parent: category?.parent ?? "",
      archived: category?.archived ?? false,
    },
  });
  const mutation = useMutation({
    retry: false,
    mutationFn: (data: FormData) =>
      apiClient(`/api/v1/categories/${category ? `${category.id}/` : ""}`, {
        method: category ? "PATCH" : "POST",
        body: { name: data.name, parent: data.parent || null, archived: data.archived },
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["categories"] });
      onOpenChange(false);
    },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100%-2rem)] border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="size-4 text-kivo-primary" />
            {category ? "Edit Category" : "New Category"}
          </DialogTitle>
          <DialogDescription>
            Organize your categories and archive ones you no longer use.
          </DialogDescription>
        </DialogHeader>
        {mutation.isError && (
          <div role="alert" className="text-xs text-destructive space-y-2">
            <p>{financialError(mutation.error)}</p>
            <p>
              Check the category list before trying again. Names must be unique within the same
              parent category.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                void query.refetch();
                onOpenChange(false);
              }}
            >
              Check category list
            </Button>
          </div>
        )}
        <form
          onSubmit={(event) =>
            void form.handleSubmit(async (data) => {
              if (lock.current) return;
              lock.current = true;
              try {
                await mutation.mutateAsync(data);
              } catch {
                /* mutation renders the real error */
              } finally {
                lock.current = false;
              }
            })(event)
          }
          className="space-y-4"
        >
          <fieldset disabled={mutation.isPending} className="space-y-4 min-w-0">
            <FormField
              id="cat-name"
              label="Category Name"
              placeholder="e.g. Subscriptions & Software"
              {...form.register("name")}
              error={form.formState.errors.name?.message}
            />
            <label className="block space-y-1 text-xs">
              Parent category
              <select
                aria-label="Parent category"
                className="h-8 w-full rounded-lg border border-input bg-card px-2"
                {...form.register("parent")}
              >
                <option value="">No parent</option>
                {(query.data ?? [])
                  .filter((c) => !c.archived && !c.parent && c.id !== category?.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
            {category && (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" {...form.register("archived")} />
                Archived
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Archive unused categories to keep your transaction history intact.
            </p>
            <div className="flex justify-end gap-2 border-t pt-3">
              <Button type="button" size="sm" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving…" : category ? "Save Changes" : "Create Category"}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
