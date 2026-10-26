import { it, expect } from "vitest";
import { auditUICopy } from "../../../../scripts/diagnostics/audit_ui_copy.mjs";

it("normal rendered JSX has no development or backend copy", () => {
  expect(auditUICopy()).toEqual([]);
});
