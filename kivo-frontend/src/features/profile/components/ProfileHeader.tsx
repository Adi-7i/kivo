import { User } from "lucide-react";

interface ProfileHeaderProps {
  displayName: string;
  email: string;
}

export function ProfileHeader({ displayName, email }: ProfileHeaderProps) {
  const initials =
    displayName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  return (
    <div className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-kivo-primary/10 text-xl font-bold text-kivo-primary">
        {initials}
      </div>
      <div className="min-w-0 space-y-1">
        <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{displayName}</h1>
        <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <User className="size-3.5 shrink-0" />
          <span className="break-all">{email}</span>
        </p>
      </div>
    </div>
  );
}
