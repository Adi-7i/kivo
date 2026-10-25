import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/features/auth/components/FieldError";
export const rentSelectClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring";
export function RentField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium">
        {label}
      </Label>
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}
