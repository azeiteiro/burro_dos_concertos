import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCalendar } from "@/hooks/useCalendar";

// Mock Telegram WebApp
const mockWebApp = {
  openLink: vi.fn(),
  showPopup: vi.fn(),
};

describe("useCalendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe("Apple Calendar", () => {
    it("should open https:// URL for Apple Calendar", () => {
      const { result } = renderHook(() => useCalendar(1, mockWebApp as any));

      result.current.handleCalendarSubscribe("apple");

      expect(mockWebApp.openLink).toHaveBeenCalledWith(
        "http://localhost:3001/api/users/1/calendar.ics"
      );
    });

    it("should not open link if userId is undefined", () => {
      const { result } = renderHook(() => useCalendar(undefined, mockWebApp as any));

      result.current.handleCalendarSubscribe("apple");

      expect(mockWebApp.openLink).not.toHaveBeenCalled();
    });
  });

  describe("Samsung Calendar", () => {
    it("should open https:// URL for Samsung Calendar", () => {
      const { result } = renderHook(() => useCalendar(1, mockWebApp as any));

      result.current.handleCalendarSubscribe("samsung");

      expect(mockWebApp.openLink).toHaveBeenCalledWith(
        "http://localhost:3001/api/users/1/calendar.ics"
      );
    });
  });

  describe("Google Calendar", () => {
    it("should copy URL to clipboard and show popup", async () => {
      const { result } = renderHook(() => useCalendar(1, mockWebApp as any));

      await result.current.handleCalendarSubscribe("google");

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "http://localhost:3001/api/users/1/calendar.ics"
      );
      expect(mockWebApp.showPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Calendar URL Copied!",
          message: expect.stringContaining("To subscribe in Google Calendar"),
        })
      );
    });

    it("should show fallback popup if clipboard fails", async () => {
      // Mock clipboard failure
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("Clipboard failed")),
        },
      });

      const { result } = renderHook(() => useCalendar(1, mockWebApp as any));

      await result.current.handleCalendarSubscribe("google");

      expect(mockWebApp.showPopup).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Add to Google Calendar",
          message: expect.stringContaining("Copy this URL"),
        })
      );
    });
  });

  describe("API URL configuration", () => {
    it("should use VITE_API_URL from environment", () => {
      // Mock environment variable
      vi.stubEnv("VITE_API_URL", "https://example.com");

      const { result } = renderHook(() => useCalendar(1, mockWebApp as any));

      result.current.handleCalendarSubscribe("apple");

      expect(mockWebApp.openLink).toHaveBeenCalledWith(
        "https://example.com/api/users/1/calendar.ics"
      );

      vi.unstubAllEnvs();
    });
  });
});
