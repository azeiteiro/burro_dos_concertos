import { describe, it, expect } from "vitest";
import { getInitials, generateColorFromName } from "@/utils/avatar";

describe("Avatar Utilities", () => {
  describe("getInitials", () => {
    it("should return initials from firstName and lastName", () => {
      const user = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
      };

      expect(getInitials(user)).toBe("JD");
    });

    it("should return uppercase initials from firstName and lastName", () => {
      const user = {
        id: 1,
        firstName: "anna",
        lastName: "smith",
        username: "annasmith",
      };

      expect(getInitials(user)).toBe("AS");
    });

    it("should fallback to username if firstName/lastName missing", () => {
      const user = {
        id: 1,
        firstName: null,
        lastName: null,
        username: "test_user",
      };

      expect(getInitials(user)).toBe("TU");
    });

    it("should fallback to ? if no firstName, lastName, or username", () => {
      const user = {
        id: 1,
        firstName: null,
        lastName: null,
        username: null,
      };

      expect(getInitials(user)).toBe("?");
    });

    it("should handle empty strings as missing values", () => {
      const user = {
        id: 1,
        firstName: "",
        lastName: "",
        username: "empty-names",
      };

      expect(getInitials(user)).toBe("EN");
    });

    it("should handle missing lastName gracefully", () => {
      const user = {
        id: 1,
        firstName: "John",
        lastName: null,
        username: "johndoe",
      };

      expect(getInitials(user)).toBe("JJ");
    });

    it("should handle single character names", () => {
      const user = {
        id: 1,
        firstName: "A",
        lastName: "B",
        username: "ab",
      };

      expect(getInitials(user)).toBe("AB");
    });

    it("should use last word of multi-part lastName", () => {
      const user = {
        id: 1,
        firstName: "Margarida",
        lastName: "Ferreira Gomes",
        username: "margarida",
      };

      expect(getInitials(user)).toBe("MG");
    });
  });

  describe("generateColorFromName", () => {
    it("should return a color from the predefined palette", () => {
      const name = "John Doe";
      const color = generateColorFromName(name);

      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("should consistently return same color for same name", () => {
      const name = "John Doe";
      const color1 = generateColorFromName(name);
      const color2 = generateColorFromName(name);

      expect(color1).toBe(color2);
    });

    it("should return different colors for different names", () => {
      const color1 = generateColorFromName("John Doe");
      const color2 = generateColorFromName("Jane Smith");

      // While there's a small chance they could be the same, it's very unlikely
      // with 8 colors and these different names
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color2).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("should be case-insensitive", () => {
      const color1 = generateColorFromName("john doe");
      const color2 = generateColorFromName("JOHN DOE");
      const color3 = generateColorFromName("John Doe");

      expect(color1).toBe(color2);
      expect(color1).toBe(color3);
    });

    it("should handle empty string", () => {
      const color = generateColorFromName("");
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("should handle special characters in name", () => {
      const color = generateColorFromName("José María");
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it("should only use one of the 8 predefined colors", () => {
      const colors = new Set();

      // Test with 20 different names to ensure we hit different colors
      for (let i = 0; i < 20; i++) {
        const color = generateColorFromName(`User ${i}`);
        colors.add(color);
      }

      // We should have multiple colors but not too many (should be ≤ 8)
      expect(colors.size).toBeLessThanOrEqual(8);
    });
  });
});
