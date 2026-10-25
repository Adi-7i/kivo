import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CSVExportDialog } from "@/features/reports/components/CSVExportDialog";
import { renderWithProviders } from "@/test/utils/render";
import { client, account, categoryId, user } from "../finance/fixtures";
describe("CSV download controls (isolated mocked HTTP)", () => {
  it("locks rapid and completed duplicate downloads and revokes the object URL", async () => {
    const create = vi.fn(() => "blob:mock-owned-csv"),
      revoke = vi.fn();
    const OriginalURL = URL;
    vi.stubGlobal(
      "URL",
      class extends OriginalURL {
        static createObjectURL = create;
        static revokeObjectURL = revoke;
      }
    );
    const anchor = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.mocked(fetch).mockImplementation(async (input) => {
      const path = String(input);
      if (path.includes("/reports/export/"))
        return new Response("effective_date,title\r\n2026-10-25,Mock test row\r\n", {
          headers: {
            "content-type": "text/csv",
            "content-disposition": 'attachment; filename="test.csv"',
          },
        });
      if (path.includes("/accounts/"))
        return Response.json({ count: 1, next: null, results: [account] });
      if (path.includes("/categories/"))
        return Response.json({
          count: 1,
          next: null,
          results: [{ id: categoryId, name: "Mock category", parent: null, archived: false }],
        });
      return Response.json(user);
    });
    const view = renderWithProviders(
      <CSVExportDialog
        open
        onOpenChange={() => {}}
        filters={{ period: "month", merchant: "Mock merchant" }}
        defaultStartDate="2026-10-01"
        defaultEndDate="2026-10-31"
      />,
      { queryClient: client() }
    );
    const actor = userEvent.setup(),
      button = screen.getByRole("button", { name: "Download CSV" });
    await waitFor(() => expect(button).toBeEnabled());
    await actor.dblClick(button);
    await screen.findByText(/Downloaded test.csv/);
    expect(button).toBeDisabled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(anchor).toHaveBeenCalledTimes(1);
    const downloads = vi
      .mocked(fetch)
      .mock.calls.filter(([path]) => String(path).includes("/reports/export/"));
    expect(downloads).toHaveLength(1);
    expect(String(downloads[0][0])).toContain("merchant=Mock+merchant");
    view.unmount();
    expect(revoke).toHaveBeenCalledWith("blob:mock-owned-csv");
    anchor.mockRestore();
  });
});
