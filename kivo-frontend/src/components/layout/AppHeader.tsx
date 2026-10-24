import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "./PageContainer";
import { SessionMenu } from "@/features/auth/session";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <PageContainer>
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex size-9 items-center justify-center rounded-lg bg-kivo-primary text-white font-bold text-lg shadow-sm transition-transform group-hover:scale-105">
                K
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-foreground leading-none">
                  Kivo
                </span>
                <span className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  Personal Finance
                </span>
              </div>
            </Link>
            <Badge
              variant="outline"
              className="text-xs font-medium border-kivo-sage text-kivo-brand-dark dark:text-kivo-sage"
            >
              Phase 1 Foundation
            </Badge>
          </div>

          <div className="flex max-w-full flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <SessionMenu />
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-finance-income animate-pulse" />
              API Transport Ready
            </span>
          </div>
        </div>
      </PageContainer>
    </header>
  );
}
