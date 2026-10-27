"use client";

import * as React from "react";
import { Wallet, ShieldCheck, Shield } from "lucide-react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";

interface DashboardHeroCardsProps {
  liquidBalancePaise: number;
  safeToSpendPaise: number;
  className?: string;
}

export function DashboardHeroCards({
  liquidBalancePaise,
  safeToSpendPaise,
  className,
}: DashboardHeroCardsProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${className ?? ""}`}>
      {/* Hero 1: Total Liquid Balance */}
      <div className="group relative overflow-hidden rounded-2xl border border-[#2d503a]/80 bg-gradient-to-br from-[#1b3425] via-[#162c1f] to-[#0f1f15] p-5 sm:p-6 text-white shadow-card card-hover-interactive">
        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-emerald-500/15 blur-2xl transition-transform duration-500 group-hover:scale-125"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col justify-between h-full min-h-36 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-emerald-300/85">
                Total Liquid Balance
              </p>
              <p className="text-xs text-emerald-100/70">All cash, bank &amp; wallet accounts</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300 border border-white/15 backdrop-blur-xs">
              <Wallet className="size-4" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-1">
            <MoneyAmount
              paise={liquidBalancePaise}
              size="2xl"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-tabular"
            />
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-200/80 pt-1">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active liquid holdings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hero 2: Safe-to-Spend */}
      <div className="group relative overflow-hidden rounded-2xl border-2 border-kivo-primary/25 dark:border-kivo-primary/35 bg-card dark:bg-[#142319] p-5 sm:p-6 shadow-card card-hover-interactive">
        {/* Ambient background glow */}
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-40 rounded-full bg-kivo-primary/10 blur-2xl transition-transform duration-500 group-hover:scale-125"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col justify-between h-full min-h-36 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-kivo-primary dark:text-emerald-400">
                Safe-to-Spend
              </p>
              <p className="text-xs text-muted-foreground">Available after reserve obligations</p>
            </div>
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-kivo-primary/10 text-kivo-primary dark:bg-emerald-500/15 dark:text-emerald-300 border border-kivo-primary/15">
              <ShieldCheck className="size-4" aria-hidden="true" />
            </div>
          </div>

          <div className="space-y-1">
            <MoneyAmount
              paise={safeToSpendPaise}
              size="2xl"
              className="text-3xl sm:text-4xl font-extrabold tracking-tight text-kivo-primary dark:text-emerald-300 font-tabular"
            />
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <Shield className="size-3 text-kivo-primary shrink-0" aria-hidden="true" />
              <span>Liquid balance minus reserved rent &amp; payables</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
