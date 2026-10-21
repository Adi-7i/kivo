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
import { contactSchema, type ContactFormData } from "../schemas/contact.schema";
import type { ContactEntity } from "../types";

interface ContactModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: ContactEntity | null;
  onSuccess?: (contact: ContactFormData) => void;
}

export function ContactModal({ open, onOpenChange, contact, onSuccess }: ContactModalProps) {
  const isEditing = Boolean(contact);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    values: {
      displayName: contact?.displayName || "",
      notes: contact?.notes || "",
      isRoommate: contact?.isRoommate || false,
      archived: contact?.archived || false,
    },
    resetOptions: {
      keepDirtyValues: false,
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setPendingNotice(null);
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: ContactFormData) => {
    setPendingNotice(
      `Contact "${data.displayName}" validated. In Phase 7 integration, this will persist to Django /api/v1/contacts/.`
    );
    if (onSuccess) {
      onSuccess(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-heading font-semibold text-foreground">
            {isEditing ? "Edit Personal Contact" : "Add Personal Contact"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Contacts are personal records for tracking lending, borrowing, and shared expenses. They
            do not require a Kivo account.
          </DialogDescription>
        </DialogHeader>

        {pendingNotice && (
          <div className="rounded-lg border border-kivo-sage/50 bg-kivo-sage/15 p-3 text-xs text-kivo-brand-dark dark:text-kivo-sage space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <IntegrationPendingBadge />
              <span>Contact Recorded in Frontend</span>
            </div>
            <p className="text-[11px] opacity-90">{pendingNotice}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Display Name */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-name" className="text-xs font-medium">
              Full Name or Nickname <span className="text-destructive">*</span>
            </Label>
            <Input
              id="contact-name"
              placeholder="e.g. Rohan Sharma"
              {...register("displayName")}
              className="text-sm"
              autoFocus
            />
            {errors.displayName && <FieldError message={errors.displayName.message} />}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="contact-notes" className="text-xs font-medium">
              Relationship / Notes{" "}
              <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
            </Label>
            <Input
              id="contact-notes"
              placeholder="e.g. Flatmate, handles electricity bills"
              {...register("notes")}
              className="text-sm"
            />
            {errors.notes && <FieldError message={errors.notes.message} />}
          </div>

          {/* Checkbox options */}
          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-foreground select-none">
              <input
                type="checkbox"
                {...register("isRoommate")}
                className="size-4 rounded border-border text-kivo-primary focus:ring-kivo-secondary"
              />
              <span>Mark as Roommate / Flatmate (relevant for shared rent)</span>
            </label>

            {isEditing && (
              <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground select-none">
                <input
                  type="checkbox"
                  {...register("archived")}
                  className="size-4 rounded border-border text-muted-foreground focus:ring-kivo-secondary"
                />
                <span>Archive Contact (preserves all historical financial records)</span>
              </label>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-kivo-primary hover:bg-kivo-brand-dark text-white font-medium"
            >
              {isEditing ? "Save Changes" : "Save Contact"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
