import * as React from "react";
import Link from "next/link";
import { ShieldCheck, Coins, ArrowRightLeft } from "lucide-react";

interface AuthPageLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthPageLayout({ children, title, subtitle }: AuthPageLayoutProps) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left Brand Panel — Desktop (lg+) */}
      <aside className="relative hidden w-[45%] flex-col justify-between border-r border-border bg-kivo-brand-dark p-12 text-white lg:flex">
        {/* Subtle patterned background accent */}
        <div className="absolute inset-0 bg-[radial-gradient(#588157_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

        <div className="relative z-10 space-y-6">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="flex size-10 items-center justify-center rounded-xl bg-kivo-sage text-kivo-brand-dark font-bold text-xl shadow-md transition-transform group-hover:scale-105">
              K
            </div>
            <div>
              <span className="font-bold text-2xl tracking-tight text-white block leading-none">
                Kivo
              </span>
              <span className="text-xs text-kivo-sage font-medium">
                Personal Money & Expense Management
              </span>
            </div>
          </Link>

          <div className="pt-10 space-y-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {title}
            </h1>
            <p className="text-sm text-kivo-stone/90 max-w-md leading-relaxed">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 space-y-4 pt-8">
          <div className="flex items-start gap-3.5 rounded-lg border border-kivo-sage/20 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-kivo-sage/20 text-kivo-sage">
              <Coins className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Exact Integer Paise</h3>
              <p className="text-[11px] text-kivo-stone/80 mt-0.5">
                Zero floating-point rounding errors. 100 paise = 1 INR strictly preserved.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-lg border border-kivo-sage/20 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-kivo-sage/20 text-kivo-sage">
              <ArrowRightLeft className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Movement vs Expense Invariant</h3>
              <p className="text-[11px] text-kivo-stone/80 mt-0.5">
                Transfers, loans, and allowances are classified accurately—never treated as random spending.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 rounded-lg border border-kivo-sage/20 bg-white/5 p-3.5 backdrop-blur-xs">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-kivo-sage/20 text-kivo-sage">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Private & Auditable</h3>
              <p className="text-[11px] text-kivo-stone/80 mt-0.5">
                Self-directed manual tracking with clear transactional audit trails.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom meta */}
        <div className="relative z-10 pt-6 border-t border-white/10 text-xs text-kivo-stone/60">
          <span>Phase 2: Authentication & Onboarding UI &bull; Kivo Architecture</span>
        </div>
      </aside>

      {/* Right Content Panel (Forms) */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-12">
        {/* Mobile Brand Bar */}
        <div className="mb-6 flex w-full max-w-md items-center justify-between lg:hidden">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex size-8 items-center justify-center rounded-lg bg-kivo-primary text-white font-bold text-base shadow-xs">
              K
            </div>
            <span className="font-bold text-lg tracking-tight text-foreground">
              Kivo
            </span>
          </Link>
          <span className="text-xs font-medium text-muted-foreground">
            Phase 2 UI
          </span>
        </div>

        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
