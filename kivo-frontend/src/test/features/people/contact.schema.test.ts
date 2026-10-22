import { describe, it, expect } from "vitest";
import { contactSchema } from "@/features/people/schemas/contact.schema";

describe("contactSchema", () => {
  it("validates valid contact input", () => {
    const result = contactSchema.safeParse({
      displayName: "Rohan Sharma",
      notes: "Flatmate at Indiranagar Apt 4B",
      isRoommate: true,
      archived: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayName).toBe("Rohan Sharma");
      expect(result.data.isRoommate).toBe(true);
    }
  });

  it("fails when displayName is empty", () => {
    const result = contactSchema.safeParse({
      displayName: "   ",
      notes: "Some note",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Contact name is required");
    }
  });

  it("fails when displayName exceeds 100 characters", () => {
    const result = contactSchema.safeParse({
      displayName: "A".repeat(101),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Name cannot exceed 100 characters");
    }
  });

  it("applies defaults for notes, isRoommate, and archived", () => {
    const result = contactSchema.safeParse({
      displayName: "Priya Patel",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe("");
      expect(result.data.isRoommate).toBe(false);
      expect(result.data.archived).toBe(false);
    }
  });
});
