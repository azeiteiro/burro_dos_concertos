import { validateConcertInput } from "@/utils/validators";

describe("validateConcertInput", () => {
  describe("name", () => {
    it("rejects empty or too short names", () => {
      expect(validateConcertInput.name("")).toMatch(/^❌/);
      expect(validateConcertInput.name("A")).toMatch(/^❌/);
    });

    it("accepts valid names", () => {
      expect(validateConcertInput.name("Metallica")).toBe("Metallica");
    });
  });

  describe("location", () => {
    it("rejects empty or too short location", () => {
      expect(validateConcertInput.location("")).toMatch(/^❌/);
      expect(validateConcertInput.location("X")).toMatch(/^❌/);
    });

    it("accepts valid location", () => {
      expect(validateConcertInput.location("Lisbon")).toBe("Lisbon");
    });
  });

  describe("date", () => {
    it("rejects invalid dates", () => {
      expect(validateConcertInput.date("")).toMatch(/^❌/);
      expect(validateConcertInput.date("2025-02-30")).toMatch(/^❌/);
      expect(validateConcertInput.date("invalid")).toMatch(/^❌/);
    });

    it("parses strict YYYY-MM-DD correctly", () => {
      const result = validateConcertInput.date("2025-10-31");
      expect(result).toBeInstanceOf(Date);
      if (result instanceof Date) {
        expect(result.toISOString().startsWith("2025-10-31")).toBe(true);
      } else {
        throw new Error("Result is not a Date");
      }
    });

    it("parses fuzzy dates using chrono", () => {
      const result = validateConcertInput.date("next Friday");
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("time", () => {
    it("rejects invalid time formats", () => {
      expect(validateConcertInput.time("25:00")).toMatch(/^❌/);
      expect(validateConcertInput.time("abc")).toMatch(/^❌/);
    });

    it("accepts valid times", () => {
      expect(validateConcertInput.time("14:30")).toBe("14:30");
    });

    it("returns null for skip or empty input", () => {
      expect(validateConcertInput.time("skip")).toBeNull();
      expect(validateConcertInput.time("")).toBeNull();
    });
  });

  describe("url", () => {
    it("rejects invalid urls", () => {
      expect(validateConcertInput.url("invalid")).toMatch(/^❌/);
    });

    it("accepts valid urls", () => {
      expect(validateConcertInput.url("https://example.com")).toBe("https://example.com");
    });

    it("returns null for skip or empty input", () => {
      expect(validateConcertInput.url("skip")).toBeNull();
      expect(validateConcertInput.url("")).toBeNull();
    });
  });

  describe("notes", () => {
    it("accepts normal notes", () => {
      expect(validateConcertInput.notes("Some notes")).toBe("Some notes");
    });

    it("rejects notes longer than 500 characters", () => {
      const long = "a".repeat(501);
      expect(validateConcertInput.notes(long)).toMatch(/^❌/);
    });

    it("returns null for skip or empty input", () => {
      expect(validateConcertInput.notes("skip")).toBeNull();
      expect(validateConcertInput.notes("")).toBeNull();
    });
  });
});
