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
import { useFinancialWrite, FinancialWriteStatus } from "@/features/finance/useFinancialWrite";
import type { ContactDTO, ContactInput } from "@/features/relationships/api";
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
  const write = useFinancialWrite(contact ? `contact:${contact.id}` : "contact:create", true);

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

  const handleOpenChange = onOpenChange;

  const onSubmit = async (data: ContactFormData) => {
    const body: ContactInput = {
      display_name: data.displayName,
      notes: data.notes,
      is_roommate: data.isRoommate,
      archived: data.archived,
    };
    const result = await write.run<ContactDTO>(
      contact ? `/api/v1/contacts/${contact.id}/` : "/api/v1/contacts/",
      body,
      contact ? "PATCH" : "POST"
    );
    if (result) {
      onSuccess?.(data);
      onOpenChange(false);
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

        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <fieldset disabled={write.busy || write.pending} className="space-y-4 min-w-0">
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
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
