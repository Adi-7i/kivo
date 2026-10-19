"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FormField } from "@/features/auth/components/FormField";
import { FieldError } from "@/features/auth/components/FieldError";
import { Label } from "@/components/ui/label";
import { IntegrationPendingBadge } from "@/components/shared/IntegrationPendingBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/utils/zodResolver";
import { expenseSchema, type ExpenseFormData } from "../schemas/expense.schema";
import { receiptSchema, type ReceiptFormData } from "../schemas/receipt.schema";
import { transferSchema, type TransferFormData } from "../schemas/transfer.schema";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Info, PlusCircle } from "lucide-react";
import type { AccountEntity } from "@/features/accounts/types";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts?: AccountEntity[];
  categories?: string[];
  defaultType?: "expense" | "receipt" | "transfer";
}

const DEFAULT_ACCOUNTS = [
  { id: "acc-bank-1", name: "HDFC Primary Bank", kind: "bank" },
  { id: "acc-cash-1", name: "Physical Cash Wallet", kind: "cash" },
  { id: "acc-wallet-1", name: "Digital Wallet", kind: "wallet" },
];

const DEFAULT_CATEGORIES = [
  "Food & Groceries",
  "Utilities & Bills",
  "Transit & Fuel",
  "Living Expenses",
  "Shopping & Personal",
  "Healthcare",
  "Entertainment",
  "Other",
];

export function QuickAddModal({
  open,
  onOpenChange,
  accounts = DEFAULT_ACCOUNTS as unknown as AccountEntity[],
  categories = DEFAULT_CATEGORIES,
  defaultType = "expense",
}: QuickAddModalProps) {
  const [activeTab, setActiveTab] = React.useState<"expense" | "receipt" | "transfer">(defaultType);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [pendingNotice, setPendingNotice] = React.useState<string | null>(null);

  // 1. Expense Form
  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: "",
      title: "",
      categoryName: categories[0] || "Food & Groceries",
      accountId: accounts[0]?.id || "",
      effectiveDate: "2026-10-18",
      merchant: "",
      paymentMethod: "UPI",
      notes: "",
    },
    mode: "onBlur",
  });

  // 2. Receipt Form
  const receiptForm = useForm<ReceiptFormData>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      amount: "",
      title: "",
      accountId: accounts[0]?.id || "",
      effectiveDate: "2026-10-18",
      notes: "",
    },
    mode: "onBlur",
  });

  // 3. Transfer Form
  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: "",
      fromAccountId: accounts[0]?.id || "",
      toAccountId: accounts[1]?.id || "",
      effectiveDate: "2026-10-18",
      notes: "",
    },
    mode: "onBlur",
  });

  // Default date to today's date on client to avoid Next.js 16 prerender error
  React.useEffect(() => {
    if (open) {
      const today = new Date().toISOString().split("T")[0];
      if (!expenseForm.getValues("effectiveDate")) {
        expenseForm.setValue("effectiveDate", today);
      }
      if (!receiptForm.getValues("effectiveDate")) {
        receiptForm.setValue("effectiveDate", today);
      }
      if (!transferForm.getValues("effectiveDate")) {
        transferForm.setValue("effectiveDate", today);
      }
    }
  }, [open, expenseForm, receiptForm, transferForm]);

  const onExpenseSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsSubmitting(false);
    setPendingNotice(
      "Backend integration pending: Expense posting will execute in Phase 4. No ledger mutation occurred."
    );
  };

  const onReceiptSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsSubmitting(false);
    setPendingNotice(
      "Backend integration pending: Receipt posting will execute in Phase 4. No ledger mutation occurred."
    );
  };

  const onTransferSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    setIsSubmitting(false);
    setPendingNotice(
      "Backend integration pending: Internal transfer will execute in Phase 4. Total liquid funds remain unchanged."
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6 sm:max-w-[540px]">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold font-heading">
            <PlusCircle className="size-5 text-kivo-primary" />
            <span>Quick Add Transaction</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Record a new personal expense, incoming money, or account transfer.
          </DialogDescription>
        </DialogHeader>

        {pendingNotice && (
          <IntegrationPendingBadge variant="banner" message={pendingNotice} className="mb-2" />
        )}

        <Tabs
          value={activeTab}
          onValueChange={(val) => {
            setActiveTab(val as "expense" | "receipt" | "transfer");
            setPendingNotice(null);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger
              value="expense"
              className="gap-1.5 text-xs data-[state=active]:text-finance-expense"
            >
              <ArrowUpRight className="size-3.5" />
              <span>Expense</span>
            </TabsTrigger>
            <TabsTrigger
              value="receipt"
              className="gap-1.5 text-xs data-[state=active]:text-finance-income"
            >
              <ArrowDownLeft className="size-3.5" />
              <span>Received</span>
            </TabsTrigger>
            <TabsTrigger
              value="transfer"
              className="gap-1.5 text-xs data-[state=active]:text-finance-transfer"
            >
              <ArrowRightLeft className="size-3.5" />
              <span>Transfer</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PERSONAL EXPENSE */}
          <TabsContent value="expense">
            <form
              onSubmit={expenseForm.handleSubmit(onExpenseSubmit)}
              className="space-y-4 text-left"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="expense-amount"
                  label="Amount (₹)"
                  placeholder="0.00"
                  type="text"
                  inputMode="decimal"
                  required
                  error={expenseForm.formState.errors.amount?.message}
                  {...expenseForm.register("amount")}
                />
                <FormField
                  id="expense-date"
                  label="Effective Date"
                  type="date"
                  required
                  error={expenseForm.formState.errors.effectiveDate?.message}
                  {...expenseForm.register("effectiveDate")}
                />
              </div>

              <FormField
                id="expense-title"
                label="Description / Title"
                placeholder="e.g. Grocery supplies, Coffee, Electricity bill"
                required
                error={expenseForm.formState.errors.title?.message}
                {...expenseForm.register("title")}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="expense-category"
                    className="text-xs font-semibold text-foreground"
                  >
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="expense-category"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...expenseForm.register("categoryName")}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-card text-foreground">
                        {c}
                      </option>
                    ))}
                  </select>
                  <FieldError error={expenseForm.formState.errors.categoryName?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="expense-account"
                    className="text-xs font-semibold text-foreground"
                  >
                    Payment Account <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="expense-account"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...expenseForm.register("accountId")}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-card text-foreground">
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <FieldError error={expenseForm.formState.errors.accountId?.message} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="expense-merchant"
                  label="Merchant / Payee"
                  placeholder="e.g. Zepto, Starbucks, Swiggy"
                  error={expenseForm.formState.errors.merchant?.message}
                  {...expenseForm.register("merchant")}
                />
                <FormField
                  id="expense-method"
                  label="Payment Method"
                  placeholder="e.g. UPI, Debit Card, Cash"
                  error={expenseForm.formState.errors.paymentMethod?.message}
                  {...expenseForm.register("paymentMethod")}
                />
              </div>

              <FormField
                id="expense-notes"
                label="Optional Notes"
                placeholder="Add memo or transaction remarks..."
                error={expenseForm.formState.errors.notes?.message}
                {...expenseForm.register("notes")}
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => expenseForm.reset()}>
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-finance-expense hover:bg-finance-expense/90 text-white min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-1.5" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Record Expense</span>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 2: MONEY RECEIVED */}
          <TabsContent value="receipt">
            <form
              onSubmit={receiptForm.handleSubmit(onReceiptSubmit)}
              className="space-y-4 text-left"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="receipt-amount"
                  label="Amount (₹)"
                  placeholder="0.00"
                  type="text"
                  inputMode="decimal"
                  required
                  error={receiptForm.formState.errors.amount?.message}
                  {...receiptForm.register("amount")}
                />
                <FormField
                  id="receipt-date"
                  label="Effective Date"
                  type="date"
                  required
                  error={receiptForm.formState.errors.effectiveDate?.message}
                  {...receiptForm.register("effectiveDate")}
                />
              </div>

              <FormField
                id="receipt-title"
                label="Source / Description"
                placeholder="e.g. Monthly Salary, Freelance project, Family gift"
                required
                error={receiptForm.formState.errors.title?.message}
                {...receiptForm.register("title")}
              />

              <div className="space-y-1.5">
                <Label htmlFor="receipt-account" className="text-xs font-semibold text-foreground">
                  Receiving Account <span className="text-destructive">*</span>
                </Label>
                <select
                  id="receipt-account"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...receiptForm.register("accountId")}
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-card text-foreground">
                      {acc.name}
                    </option>
                  ))}
                </select>
                <FieldError error={receiptForm.formState.errors.accountId?.message} />
              </div>

              <FormField
                id="receipt-notes"
                label="Optional Notes"
                placeholder="Add memo or source details..."
                error={receiptForm.formState.errors.notes?.message}
                {...receiptForm.register("notes")}
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => receiptForm.reset()}>
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-finance-income hover:bg-finance-income/90 text-white min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-1.5" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Record Receipt</span>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          {/* TAB 3: OWN ACCOUNT TRANSFER */}
          <TabsContent value="transfer">
            <form
              onSubmit={transferForm.handleSubmit(onTransferSubmit)}
              className="space-y-4 text-left"
              noValidate
            >
              {/* Financial Invariant Notice */}
              <div className="flex items-start gap-2.5 rounded-lg border border-finance-transfer/30 bg-finance-transfer/10 p-2.5 text-xs text-foreground">
                <Info className="size-4 shrink-0 text-finance-transfer mt-0.5" />
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <strong className="text-foreground">Movement ≠ Expense:</strong> Transfers between
                  your owned accounts shift balances, but your total liquid wealth remains
                  identical.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  id="transfer-amount"
                  label="Amount (₹)"
                  placeholder="0.00"
                  type="text"
                  inputMode="decimal"
                  required
                  error={transferForm.formState.errors.amount?.message}
                  {...transferForm.register("amount")}
                />
                <FormField
                  id="transfer-date"
                  label="Effective Date"
                  type="date"
                  required
                  error={transferForm.formState.errors.effectiveDate?.message}
                  {...transferForm.register("effectiveDate")}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="transfer-from" className="text-xs font-semibold text-foreground">
                    From Account <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="transfer-from"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...transferForm.register("fromAccountId")}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-card text-foreground">
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <FieldError error={transferForm.formState.errors.fromAccountId?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transfer-to" className="text-xs font-semibold text-foreground">
                    To Account <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="transfer-to"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...transferForm.register("toAccountId")}
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-card text-foreground">
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <FieldError error={transferForm.formState.errors.toAccountId?.message} />
                </div>
              </div>

              <FormField
                id="transfer-notes"
                label="Optional Notes"
                placeholder="Transfer reason or memo..."
                error={transferForm.formState.errors.notes?.message}
                {...transferForm.register("notes")}
              />

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => transferForm.reset()}
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-finance-transfer hover:bg-finance-transfer/90 text-white min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-1.5" />
                      <span>Recording...</span>
                    </>
                  ) : (
                    <span>Record Transfer</span>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
