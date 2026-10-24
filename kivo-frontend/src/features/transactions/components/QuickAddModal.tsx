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
import { FinancialWriteStatus, useFinancialWrite } from "@/features/finance/useFinancialWrite";
import { useAccounts, useCategories } from "@/features/finance/queries";
import { QueryState } from "@/features/finance/QueryState";
import { accountEntity, type EventInput } from "@/features/finance/api";
import { normalizeOpeningBalance, todayInKolkata } from "@/features/onboarding/money";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/utils/zodResolver";
import { expenseSchema, type ExpenseFormData } from "../schemas/expense.schema";
import { receiptSchema, type ReceiptFormData } from "../schemas/receipt.schema";
import { transferSchema, type TransferFormData } from "../schemas/transfer.schema";
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Info, PlusCircle } from "lucide-react";

interface QuickAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "expense" | "receipt" | "transfer";
}

export function QuickAddModal(props: QuickAddModalProps) {
  return props.open ? <QuickAddForm {...props} key={props.defaultType ?? "expense"} /> : null;
}

function QuickAddForm({ open, onOpenChange, defaultType = "expense" }: QuickAddModalProps) {
  const accountQuery = useAccounts(open);
  const categoryQuery = useCategories(open);
  // Only verified owned records may populate a real financial write.
  const accounts = (accountQuery.data ?? []).filter((a) => !a.archived).map(accountEntity);
  const categories = (categoryQuery.data ?? []).filter(
    (c) =>
      !c.archived &&
      !(categoryQuery.data ?? []).some((parent) => parent.id === c.parent && parent.archived)
  );
  const write = useFinancialWrite("quick-add");
  const [activeTab, setActiveTab] = React.useState<"expense" | "receipt" | "transfer">(defaultType);
  const isSubmitting = write.busy;

  // 1. Expense Form
  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: "",
      title: "",
      categoryName: "",
      accountId: "",
      effectiveDate: "",
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
      fundingSource: "",
      accountId: "",
      effectiveDate: "",
      notes: "",
    },
    mode: "onBlur",
  });

  // 3. Transfer Form
  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: "",
      fromAccountId: "",
      toAccountId: "",
      effectiveDate: "",
      notes: "",
    },
    mode: "onBlur",
  });

  // Default date to today's date on client to avoid Next.js 16 prerender error
  React.useEffect(() => {
    if (open) {
      const today = todayInKolkata();
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

  const post = async (body: EventInput) => {
    const result = await write.run("/api/v1/transactions/", body);
    if (result) {
      expenseForm.reset();
      receiptForm.reset();
      transferForm.reset();
      onOpenChange(false);
    }
  };
  const onExpenseSubmit = (data: ExpenseFormData) =>
    post({
      kind: "expense",
      amount: normalizeOpeningBalance(data.amount),
      title: data.title,
      category: data.categoryName,
      account: data.accountId,
      effective_date: data.effectiveDate,
      merchant: data.merchant,
      payment_method: data.paymentMethod,
      notes: data.notes,
    });
  const onReceiptSubmit = (data: ReceiptFormData) =>
    post({
      kind: "receipt",
      amount: normalizeOpeningBalance(data.amount),
      title: data.title,
      funding_source: data.fundingSource,
      account: data.accountId,
      effective_date: data.effectiveDate,
      notes: data.notes,
    });
  const onTransferSubmit = (data: TransferFormData) =>
    post({
      kind: "transfer",
      amount: normalizeOpeningBalance(data.amount),
      title: "Internal transfer",
      account: data.fromAccountId,
      destination: data.toAccountId,
      effective_date: data.effectiveDate,
      notes: data.notes,
    });

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

        <QueryState query={accountQuery} />
        <QueryState query={categoryQuery} />
        {accountQuery.isSuccess && accounts.length === 0 && (
          <p className="text-xs">Create an active money account first.</p>
        )}
        {categoryQuery.isSuccess && categories.length === 0 && (
          <p className="text-xs">
            Create or seed a category in Settings → Categories to record expenses.
          </p>
        )}
        <FinancialWriteStatus write={write} onConfirmed={() => onOpenChange(false)} />
        <fieldset
          disabled={
            write.busy || write.pending || !accountQuery.isSuccess || !categoryQuery.isSuccess
          }
          className="min-w-0"
        >
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              setActiveTab(val as "expense" | "receipt" | "transfer");
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
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id} className="bg-card text-foreground">
                          {c.name}
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
                      <option value="">Select account</option>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => expenseForm.reset()}
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
                  <Label
                    htmlFor="receipt-account"
                    className="text-xs font-semibold text-foreground"
                  >
                    Receiving Account <span className="text-destructive">*</span>
                  </Label>
                  <select
                    id="receipt-account"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...receiptForm.register("accountId")}
                  >
                    <option value="">Select account</option>
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id} className="bg-card text-foreground">
                        {acc.name}
                      </option>
                    ))}
                  </select>
                  <FieldError error={receiptForm.formState.errors.accountId?.message} />
                </div>

                <FormField
                  id="receipt-source"
                  label="External Funding Source"
                  required
                  placeholder="e.g. Employer, Family"
                  error={receiptForm.formState.errors.fundingSource?.message}
                  {...receiptForm.register("fundingSource")}
                />
                <FormField
                  id="receipt-notes"
                  label="Optional Notes"
                  placeholder="Add memo or source details..."
                  error={receiptForm.formState.errors.notes?.message}
                  {...receiptForm.register("notes")}
                />

                <div className="pt-2 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => receiptForm.reset()}
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
                    <strong className="text-foreground">Movement ≠ Expense:</strong> Transfers
                    between your owned accounts shift balances, but your total liquid wealth remains
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
                    <Label
                      htmlFor="transfer-from"
                      className="text-xs font-semibold text-foreground"
                    >
                      From Account <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="transfer-from"
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...transferForm.register("fromAccountId")}
                    >
                      <option value="">Select source account</option>
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
                      <option value="">Select destination account</option>
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
        </fieldset>
      </DialogContent>
    </Dialog>
  );
}
