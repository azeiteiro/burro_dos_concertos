import { parse, isValid } from "date-fns";
import * as chrono from "chrono-node";

export const validateConcertInput = {
  name(value: string): string {
    const v = value.trim();
    if (!v || v.length < 2) return "❌ Concert name must be at least 2 characters long.";
    return v; // ✅ valid value
  },

  location(value: string): string {
    const v = value.trim();
    if (!v || v.length < 2) return "❌ Location must be at least 2 characters long.";
    return v;
  },

  // ✅ Now returns ONLY Date (success) or string starting with ❌ (error)
  date(value: string): Date | string {
    const v = value.trim();
    if (!v) return "❌ Date is required.";

    // Try strict YYYY-MM-DD
    const parsed = parse(v, "yyyy-MM-dd", new Date());
    if (isValid(parsed) && v.length === 10) return parsed;

    // Try fuzzy parsing - but DON'T return suggestion here
    const fuzzy = chrono.parseDate(v);
    if (fuzzy) {
      // Return the parsed date directly instead of asking for confirmation
      return fuzzy;
    }

    return "❌ Date must be in format YYYY-MM-DD (e.g. 2025-10-31).";
  },

  time(value: string): string | null {
    const v = value.trim().toLowerCase();
    if (!v || v === "skip") return null;

    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(v) ? value : "❌ Time must be in format HH:mm (24-hour) or type 'skip'.";
  },

  url(value: string): string | null {
    const v = value.trim();
    if (!v || v.toLowerCase() === "skip") return null;
    try {
      new URL(v);
      return v;
    } catch {
      return "❌ Invalid URL. Provide a valid link or 'skip'.";
    }
  },

  notes(value: string): string | null {
    const v = value.trim();
    if (!v || v.toLowerCase() === "skip") return null;
    if (v.length > 500) return "❌ Notes cannot exceed 500 characters.";
    return v;
  },
};
