import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn class merger", () => {
  it("combines conditional and standard classes", () => {
    expect(cn("px-2 py-1", "bg-primary", true && "text-white", false && "hidden")).toBe(
      "px-2 py-1 bg-primary text-white"
    );
  });

  it("resolves Tailwind conflicts using tailwind-merge rules", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
});
