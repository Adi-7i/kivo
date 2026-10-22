import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

describe("LoadingSpinner", () => {
  it("renders with status role and accessible label", () => {
    render(<LoadingSpinner label="Fetching records..." />);
    const spinner = screen.getByRole("status", { name: "Fetching records..." });
    expect(spinner).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders title, description, and action button", () => {
    render(
      <EmptyState
        title="No Transactions"
        description="Your ledger is currently clear."
        action={<button>Add Transaction</button>}
      />
    );
    expect(screen.getByText("No Transactions")).toBeInTheDocument();
    expect(screen.getByText("Your ledger is currently clear.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Transaction" })).toBeInTheDocument();
  });
});

describe("ErrorBoundary", () => {
  function BuggyComponent(): React.ReactNode {
    throw new Error("Simulated component render error");
  }

  it("catches render errors and displays fallback UI", () => {
    // Suppress console.error in test output for intentional error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <BuggyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Simulated component render error")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();

    spy.mockRestore();
  });
});
