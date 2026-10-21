import * as React from "react";
import { cn } from "@/lib/utils";

interface ContactAvatarProps {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "size-7 text-xs",
  md: "size-10 text-sm font-medium",
  lg: "size-14 text-lg font-semibold",
  xl: "size-20 text-2xl font-bold",
};

// Deterministic pastel palette aligned with Kivo brand colors
const AVATAR_BG_COLORS = [
  "bg-kivo-sage/25 text-kivo-brand-dark border-kivo-sage/40",
  "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300",
  "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300",
  "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300",
  "bg-stone-200 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200",
  "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "??";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getAvatarColorClass(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_BG_COLORS.length;
  return AVATAR_BG_COLORS[index]!;
}

export function ContactAvatar({ name, size = "md", className }: ContactAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getAvatarColorClass(name);

  return (
    <div
      aria-label={`Avatar for ${name}`}
      className={cn(
        "inline-flex items-center justify-center rounded-full border select-none shrink-0",
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {initials}
    </div>
  );
}
