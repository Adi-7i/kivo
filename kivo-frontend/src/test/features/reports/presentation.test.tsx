import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { chartInrTick } from "@/features/reports/chart-format";
import { ReportDetailPanel } from "@/features/reports/components/ReportDetailPanel";
import type { BreakdownDTO } from "@/features/reports/api";
import { summary } from "./fixtures";
describe("report display boundaries (isolated data)", () => {
  it.each([
    [0.75, "₹0.01"],
    [1.5, "₹0.02"],
    [-1.5, "-₹0.01"],
    [0, "₹0.00"],
    [Number.NaN, ""],
  ])(
    "formats Recharts coordinate %s without violating the integer money formatter",
    (tick, label) => expect(chartInrTick(tick)).toBe(label)
  );
  it("bounds a large breakdown table and preserves exact server amounts and filtered links", async () => {
    const data: BreakdownDTO = {
      period: summary.period,
      dimension: "merchant",
      results: Array.from({ length: 1000 }, (_, i) => ({
        key: "Merchant " + i,
        label: "Merchant " + i,
        amount: "0.01",
        transaction_count: 1,
      })),
    };
    render(
      <ReportDetailPanel data={data} filters={{ period: "previous_month", kind: "expense" }} />
    );
    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getByRole("link", { name: "View Filtered Transactions" })).toHaveAttribute(
      "href",
      "/transactions?period=previous_month&kind=expense"
    );
    expect(screen.getAllByRole("link", { name: "View transactions" })[0]).toHaveAttribute(
      "href",
      "/transactions?period=previous_month&kind=expense&merchant=Merchant+0"
    );
    await userEvent.click(screen.getByRole("button", { name: "Next groups" }));
    expect(screen.getByRole("rowheader", { name: /^Merchant 20$/ })).toBeVisible();
    expect(screen.queryByRole("rowheader", { name: /^Merchant 0$/ })).not.toBeInTheDocument();
  });
});
