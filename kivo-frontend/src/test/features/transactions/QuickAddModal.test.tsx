import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickAddModal } from "@/features/transactions/components/QuickAddModal";

describe("QuickAddModal component", () => {
  it("renders modal with tab options when open", () => {
    render(<QuickAddModal open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByText("Quick Add Transaction")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Expense/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Received/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Transfer/i })).toBeInTheDocument();
  });

  it("switches contextual inputs when tab is changed", async () => {
    const user = userEvent.setup();
    render(<QuickAddModal open={true} onOpenChange={vi.fn()} />);

    // Default is Expense
    expect(screen.getByRole("button", { name: /Record Expense/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();

    // Switch to Received
    await user.click(screen.getByRole("tab", { name: /Received/i }));
    expect(screen.getByRole("button", { name: /Record Receipt/i })).toBeInTheDocument();

    // Switch to Transfer
    await user.click(screen.getByRole("tab", { name: /Transfer/i }));
    expect(screen.getByRole("button", { name: /Record Transfer/i })).toBeInTheDocument();
    expect(screen.getByText(/Movement ≠ Expense/i)).toBeInTheDocument();
  });

  it("submits valid expense and renders integration pending banner", async () => {
    const user = userEvent.setup();
    render(<QuickAddModal open={true} onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText(/Amount/i), "350");
    await user.type(screen.getByLabelText(/Description \/ Title/i), "Lunch with colleagues");

    await user.click(screen.getByRole("button", { name: /Record Expense/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(/Backend integration pending: Expense posting will execute in Phase 4/i)
        ).toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });
});
