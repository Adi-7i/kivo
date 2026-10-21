"use client";

import * as React from "react";
import { MoneyAmount } from "@/features/shared-financial/MoneyAmount";
import { CreditCard, Store, Wallet, Users } from "lucide-react";
import type { SpendingDistribution } from "../types";

interface SpendingDistributionChartProps {
  distribution: SpendingDistribution;
  className?: string;
}

type DistributionTab = "accounts" | "methods" | "merchants" | "people";

export function SpendingDistributionChart({
  distribution,
  className,
}: SpendingDistributionChartProps) {
  const [activeTab, setActiveTab] = React.useState<DistributionTab>("accounts");

  const activeItems = React.useMemo(() => {
    switch (activeTab) {
      case "methods":
        return distribution.byPaymentMethod;
      case "merchants":
        return distribution.byMerchant;
      case "people":
        return distribution.byPerson;
      case "accounts":
      default:
        return distribution.byAccount;
    }
  }, [activeTab, distribution]);

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs space-y-4 ${className || ""}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-base text-foreground tracking-tight">
            Spending Channels & Distribution
          </h3>
          <p className="text-xs text-muted-foreground">
            Dissection by source account, payment method, merchant, or split partner
          </p>
        </div>

        {/* Tab Controls */}
        <div
          className="flex items-center gap-1 rounded-lg bg-muted/60 p-1 text-xs border border-border/60 self-start sm:self-auto overflow-x-auto"
          role="tablist"
          aria-label="Distribution channel"
        >
          <button
            type="button"
            role="tab"
            onClick={() => setActiveTab("accounts")}
            aria-selected={activeTab === "accounts"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all shrink-0 ${
              activeTab === "accounts"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Wallet className="size-3" />
            <span>By Account</span>
          </button>

          <button
            type="button"
            role="tab"
            onClick={() => setActiveTab("methods")}
            aria-selected={activeTab === "methods"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all shrink-0 ${
              activeTab === "methods"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="size-3" />
            <span>By Method</span>
          </button>

          <button
            type="button"
            role="tab"
            onClick={() => setActiveTab("merchants")}
            aria-selected={activeTab === "merchants"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all shrink-0 ${
              activeTab === "merchants"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="size-3" />
            <span>By Merchant</span>
          </button>

          <button
            type="button"
            role="tab"
            onClick={() => setActiveTab("people")}
            aria-selected={activeTab === "people"}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-all shrink-0 ${
              activeTab === "people"
                ? "bg-card text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-3" />
            <span>By Person</span>
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3 pt-1">
        {activeItems.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-foreground truncate">{item.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  ({item.count} txns)
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {item.percentage}%
                </span>
                <MoneyAmount paise={item.amountPaise} size="sm" variant="expense" />
              </div>
            </div>

            {/* Horizontal progress bar */}
            <div
              role="progressbar"
              aria-valuenow={item.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${item.name}: ${item.percentage}%`}
              className="h-1.5 w-full rounded-full bg-muted overflow-hidden"
            >
              <div
                className="h-full rounded-full bg-kivo-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, item.percentage))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
