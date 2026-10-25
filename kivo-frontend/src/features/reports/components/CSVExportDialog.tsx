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
import { useSession } from "@/features/auth/session";
import { useAccounts, useCategories } from "@/features/finance/queries";
import { QueryState } from "@/features/finance/QueryState";
import { financialError } from "@/features/finance/validation";
import { TRANSACTION_KIND_LABELS } from "@/features/transactions/types";
import { csvExportSchema, type CSVExportFormData } from "../schemas/export.schema";
import { cleanReportFilters, type ReportParams } from "../filters";
import { exportFilename, fetchExport } from "../download";
export function CSVExportDialog({
  open,
  onOpenChange,
  filters,
  defaultStartDate,
  defaultEndDate,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  filters: ReportParams;
  defaultStartDate: string;
  defaultEndDate: string;
}) {
  const { data: user } = useSession(),
    accounts = useAccounts(open),
    categories = useCategories(open);
  const active = React.useRef<AbortController | null>(null),
    delivered = React.useRef(false),
    objectUrl = React.useRef<string | null>(null),
    timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [busy, setBusy] = React.useState(false),
    [downloaded, setDownloaded] = React.useState(false),
    [error, setError] = React.useState(""),
    [notice, setNotice] = React.useState("");
  React.useEffect(
    () => () => {
      active.current?.abort();
      if (timer.current) clearTimeout(timer.current);
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [user?.id]
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CSVExportFormData>({
    resolver: zodResolver(csvExportSchema),
    defaultValues: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      accountId: filters.account ?? "",
      category: filters.category ?? "",
      transactionType: filters.kind ?? "",
    },
  });
  const submit = async (data: CSVExportFormData) => {
    if (active.current || delivered.current || !user) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const base: Record<string, string | undefined> = { ...filters };
      delete base.period;
      delete base.date;
      delete base.date_from;
      delete base.date_to;
      const params = cleanReportFilters({
        ...base,
        date_from: data.startDate,
        date_to: data.endDate,
        account: data.accountId,
        category: data.category,
        kind: data.transactionType,
      });
      const { blob, headers } = await fetchExport(params, controller.signal);
      if (controller.signal.aborted) return;
      const prefix = await blob.slice(0, 4096).text(),
        boundary = prefix.indexOf("\r\n");
      const empty = blob.size <= 4096 && boundary >= 0 && prefix.slice(boundary + 2) === "";
      const filename = exportFilename(headers.get("content-disposition"));
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      delivered.current = true;
      setDownloaded(true);
      timer.current = setTimeout(() => {
        URL.revokeObjectURL(url);
        if (objectUrl.current === url) objectUrl.current = null;
      }, 1000);
      setNotice(
        empty
          ? "No transactions matched. Downloaded the server CSV with headers only."
          : "Downloaded " +
              filename +
              ". " +
              (headers.get("x-kivo-export-timezone") ?? "") +
              " · " +
              (headers.get("x-kivo-export-generated-at") ?? "")
      );
    } catch (failure) {
      if (!controller.signal.aborted) setError(financialError(failure));
    } finally {
      active.current = null;
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Financial Ledger (CSV)</DialogTitle>
          <DialogDescription>
            Download your authenticated server ledger with the selected filters. UTF-8 with BOM and
            column headers.
          </DialogDescription>
        </DialogHeader>
        <QueryState query={accounts} />
        <QueryState query={categories} />
        <form
          onSubmit={(event) => void handleSubmit(submit)(event)}
          onChangeCapture={() => {
            delivered.current = false;
            setDownloaded(false);
          }}
          noValidate
          className="space-y-4"
        >
          <fieldset disabled={busy} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["startDate", "endDate"] as const).map((key, i) => (
                <div key={key}>
                  <Label htmlFor={"export-" + key}>{i ? "To Date" : "From Date"} (inclusive)</Label>
                  <Input id={"export-" + key} type="date" {...register(key)} />
                  <FieldError error={errors[key]?.message} />
                </div>
              ))}
            </div>
            <div>
              <Label htmlFor="export-account">Account Filter</Label>
              <select
                id="export-account"
                {...register("accountId")}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                <option value="">All Accounts</option>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <FieldError error={errors.accountId?.message} />
            </div>
            <div>
              <Label htmlFor="export-category">Expense Category Filter</Label>
              <select
                id="export-category"
                {...register("category")}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                <option value="">All Categories</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <FieldError error={errors.category?.message} />
            </div>
            <div>
              <Label htmlFor="export-kind">Transaction Type Filter</Label>
              <select
                id="export-kind"
                {...register("transactionType")}
                className="w-full rounded-md border bg-background p-2 text-sm"
              >
                <option value="">All Types</option>
                {Object.entries(TRANSACTION_KIND_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <div className="rounded-lg border bg-muted/20 p-3 text-[11px] text-muted-foreground space-y-2">
            <p>
              Standard Output Schema: effective date, transaction ID/type, title, amount,
              account/destination, category, merchant, contact/source, payment method, notes,
              status, net expense and net external cash contributions.
            </p>
            <p>
              Face amounts are audit values and must not be summed as spending.
              Corrections/reversals are retained with status. The backend protects user text against
              spreadsheet formula injection.
            </p>
            <p>
              Current contact, merchant, payment method, search and amount filters are preserved.
              Blank account/category/type means all owned records.
            </p>
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-xs text-kivo-primary break-words">
              {notice}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || downloaded || !accounts.isSuccess || !categories.isSuccess}
            >
              {busy ? "Downloading…" : "Download CSV"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
