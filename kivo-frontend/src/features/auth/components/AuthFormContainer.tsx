import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AuthFormContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthFormContainer({
  title,
  description,
  children,
  footer,
  className,
}: AuthFormContainerProps) {
  return (
    <Card className={cn("border-border shadow-xs bg-card", className)}>
      <CardHeader className="space-y-1.5 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl font-heading">
          {title}
        </h2>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {children}
        {footer && <div className="pt-3 border-t border-border/80">{footer}</div>}
      </CardContent>
    </Card>
  );
}
