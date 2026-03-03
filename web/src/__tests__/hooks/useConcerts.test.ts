import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useConcerts } from "@/hooks/useConcerts";
import * as api from "@/lib/api";

// Mock API
vi.mock("@/lib/api", () => ({
  fetchUpcomingConcerts: vi.fn(),
  getUserByTelegramId: vi.fn(),
  submitConcertResponse: vi.fn(),
}));

const mockConcerts = [
  {
    id: 1,
    artistName: "Artist 1",
    venue: "Venue 1",
    concertDate: new Date("2026-04-14"),
    concertTime: null,
    notes: null,
    url: null,
    userId: 1,
    notified: false,
    createdAt: new Date("2026-01-01T00:00:00"),
    updatedAt: new Date("2026-01-01T00:00:00"),
    responses: { going: 2, interested: 1, not_going: 0, userResponse: "going" },
  },
  {
    id: 2,
    artistName: "Artist 2",
    venue: "Venue 2",
    concertDate: new Date("2026-04-15"),
    concertTime: null,
    notes: null,
    url: null,
    userId: 1,
    notified: false,
    createdAt: new Date("2026-01-01T00:00:00"),
    updatedAt: new Date("2026-01-01T00:00:00"),
    responses: { going: 1, interested: 0, not_going: 1, userResponse: null },
  },
  {
    id: 3,
    artistName: "Artist 3",
    venue: "Venue 3",
    concertDate: new Date("2026-04-16"),
    concertTime: null,
    notes: null,
    url: null,
    userId: 1,
    notified: false,
    createdAt: new Date("2026-01-01T00:00:00"),
    updatedAt: new Date("2026-01-01T00:00:00"),
    responses: { going: 0, interested: 1, not_going: 0, userResponse: "interested" },
  },
];

describe("useConcerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchUpcomingConcerts).mockResolvedValue(mockConcerts as any);
    vi.mocked(api.getUserByTelegramId).mockResolvedValue({ id: 123 } as any);
  });

  describe("Initial load", () => {
    it("should load concerts when isReady is true with telegram user", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(api.getUserByTelegramId).toHaveBeenCalledWith(456);
      expect(api.fetchUpcomingConcerts).toHaveBeenCalledWith(123);
      expect(result.current.concerts).toHaveLength(3);
      expect(result.current.userId).toBe(123);
      expect(result.current.error).toBeNull();
    });

    it("should not load when isReady is false", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: false,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      expect(api.getUserByTelegramId).not.toHaveBeenCalled();
      expect(api.fetchUpcomingConcerts).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(api.getUserByTelegramId).mockRejectedValue(new Error("API Error"));

      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("API Error");
      expect(result.current.concerts).toHaveLength(0);
    });
  });

  describe("Tab filtering", () => {
    it("should show all concerts on 'all' tab", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.concerts).toHaveLength(3);
    });

    it("should filter to user's concerts on 'my' tab", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Switch to 'my' tab
      await waitFor(() => {
        result.current.setActiveTab("my");
      });

      // Should only show concerts where user is going or interested (2 concerts)
      await waitFor(() => {
        expect(result.current.concerts).toHaveLength(2);
      });
      expect(result.current.concerts[0].id).toBe(1); // going
      expect(result.current.concerts[1].id).toBe(3); // interested
    });
  });

  describe("Search filtering", () => {
    it("should filter concerts by artist name", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        result.current.setSearchQuery("Artist 1");
      });

      await waitFor(() => {
        expect(result.current.concerts).toHaveLength(1);
      });
      expect(result.current.concerts[0].artistName).toBe("Artist 1");
    });

    it("should filter concerts by venue", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await waitFor(() => {
        result.current.setSearchQuery("Venue 2");
      });

      await waitFor(() => {
        expect(result.current.concerts).toHaveLength(1);
      });
      expect(result.current.concerts[0].venue).toBe("Venue 2");
    });

    it("should be case insensitive", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      result.current.setSearchQuery("artist");

      expect(result.current.concerts).toHaveLength(3);
    });
  });

  describe("Vote handling", () => {
    it("should submit vote and refetch concerts", async () => {
      vi.mocked(api.submitConcertResponse).mockResolvedValue(undefined as any);

      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      vi.clearAllMocks();

      await result.current.handleVote(1, "going");

      expect(api.submitConcertResponse).toHaveBeenCalledWith(1, 123, "going");
      expect(api.fetchUpcomingConcerts).toHaveBeenCalledWith(123);
    });
  });

  describe("Concerts count", () => {
    it("should count user's concerts correctly", async () => {
      const { result } = renderHook(() =>
        useConcerts({
          isReady: true,
          telegramUser: { id: 456, first_name: "John" },
        })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // User has 2 concerts (1 going + 1 interested, not counting not_going)
      expect(result.current.myConcertsCount).toBe(2);
    });
  });
});
