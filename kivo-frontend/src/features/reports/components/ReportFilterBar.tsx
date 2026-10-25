"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccounts, useCategories } from "@/features/finance/queries";
import { useOwnedList } from "@/features/finance/useOwnedQuery";
import { QueryState } from "@/features/finance/QueryState";
import { financialError } from "@/features/finance/validation";
import { TRANSACTION_KIND_LABELS } from "@/features/transactions/types";
import { todayInKolkata } from "@/features/onboarding/money";
import { cleanReportFilters, REPORT_PERIODS, type ReportParams } from "../filters";
import { ZodError } from "zod";

export function ReportFilterBar({
  filters,
  onFilterChange,
}: {
  filters: ReportParams;
  onFilterChange: (v: ReportParams) => void;
}) {
  const accounts = useAccounts(),
    categories = useCategories(),
    contacts = useOwnedList<{ id: string; display_name: string }>("contacts", "/api/v1/contacts/");
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(filters).filter((e): e is [string, string] => typeof e[1] === "string")
    )
  );
  const [period, setPeriod] = React.useState(filters.period ?? "custom"),
    [error, setError] = React.useState("");
  const update = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value }));
  const apply = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const v = { ...values };
      delete v.period;
      delete v.date;
      if (period !== "custom") {
        delete v.date_from;
        delete v.date_to;
        v.period = period;
      } else {
        v.date_from = v.date_from || filters.date || todayInKolkata();
        v.date_to = v.date_to || filters.date || todayInKolkata();
      }
      onFilterChange(cleanReportFilters(v));
    } catch (failure) {
      setError(
        failure instanceof ZodError
          ? failure.issues.map((i) => i.message).join(" ")
          : financialError(failure)
      );
    }
  };
  const selectClass = "w-full min-w-0 rounded-md border bg-background px-2.5 py-2 text-xs";
  return (
    <form
      onSubmit={apply}
      noValidate
      className="rounded-xl border border-border/80 bg-card p-3 sm:p-4 shadow-2xs space-y-4"
    >
      <div className="flex flex-wrap gap-1.5" aria-label="Reporting period">
        {REPORT_PERIODS.map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={period === key ? "default" : "outline"}
            aria-pressed={period === key}
            onClick={() => setPeriod(key)}
          >
            {label}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={period === "custom" ? "default" : "outline"}
          onClick={() => setPeriod("custom")}
        >
          Custom Range
        </Button>
      </div>
      {period === "custom" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(["date_from", "date_to"] as const).map((key, i) => (
            <div key={key}>
              <Label htmlFor={"report-" + key}>{i ? "To Date" : "From Date"} (inclusive)</Label>
              <Input
                id={"report-" + key}
                type="date"
                value={values[key] ?? filters.date ?? todayInKolkata()}
                onChange={(e) => update(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label htmlFor="report-account">Account</Label>
          <select
            id="report-account"
            value={values.account ?? ""}
            onChange={(e) => update("account", e.target.value)}
            className={selectClass}
          >
            <option value="">All Accounts</option>
            {(accounts.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="report-category">Category</Label>
          <select
            id="report-category"
            value={values.category ?? ""}
            onChange={(e) => update("category", e.target.value)}
            className={selectClass}
          >
            <option value="">All Categories</option>
            {(categories.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="report-kind">Transaction type</Label>
          <select
            id="report-kind"
            value={values.kind ?? ""}
            onChange={(e) => update("kind", e.target.value)}
            className={selectClass}
          >
            <option value="">All Types</option>
            {Object.entries(TRANSACTION_KIND_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="report-contact">Contact / person</Label>
          <select
            id="report-contact"
            value={values.contact ?? ""}
            onChange={(e) => update("contact", e.target.value)}
            className={selectClass}
          >
            <option value="">All Contacts</option>
            {(contacts.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.display_name}
              </option>
            ))}
          </select>
        </div>
        {(
          [
            ["merchant", "Merchant / place (exact)"],
            ["payment_method", "Payment method (exact)"],
            ["search", "Search"],
            ["amount_min", "Minimum face amount (₹)"],
            ["amount_max", "Maximum face amount (₹)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={"report-" + key}>{label}</Label>
            <Input
              id={"report-" + key}
              value={values[key] ?? ""}
              onChange={(e) => update(key, e.target.value)}
              inputMode={key.startsWith("amount") ? "decimal" : undefined}
            />
          </div>
        ))}
      </div>
      <QueryState query={accounts} />
      <QueryState query={categories} />
      <QueryState query={contacts} />
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <div className="flex gap-2 flex-wrap items-center">
        <Button size="sm" type="submit">
          Apply Filters
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => onFilterChange({ period: "month" })}
        >
          Clear Filters
        </Button>
        <p className="text-[11px] text-muted-foreground">
          Asia/Kolkata · This Week is Monday–Sunday; Last 7 Days is a rolling inclusive range.
          Changes apply on submit.
        </p>
      </div>
    </form>
  );
}
