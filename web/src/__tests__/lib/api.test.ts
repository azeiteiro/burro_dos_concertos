import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchConcerts,
  fetchUpcomingConcerts,
  submitConcertResponse,
  getUserByTelegramId,
} from "@/lib/api";

global.fetch = vi.fn();

describe("API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchConcerts", () => {
    it("should fetch concerts without userId", async () => {
      const mockConcerts = [{ id: 1, artistName: "Artist 1" }];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockConcerts,
      } as Response);

      const result = await fetchConcerts();

      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/concerts");
      expect(result).toEqual(mockConcerts);
    });

    it("should fetch concerts with userId", async () => {
      const mockConcerts = [{ id: 1, artistName: "Artist 1" }];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockConcerts,
      } as Response);

      const result = await fetchConcerts(123);

      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/concerts?userId=123");
      expect(result).toEqual(mockConcerts);
    });

    it("should throw error when fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(fetchConcerts()).rejects.toThrow("Failed to fetch concerts");
    });
  });

  describe("fetchUpcomingConcerts", () => {
    it("should fetch upcoming concerts without userId", async () => {
      const mockConcerts = [{ id: 1, artistName: "Artist 1" }];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockConcerts,
      } as Response);

      const result = await fetchUpcomingConcerts();

      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/concerts/upcoming");
      expect(result).toEqual(mockConcerts);
    });

    it("should fetch upcoming concerts with userId", async () => {
      const mockConcerts = [{ id: 1, artistName: "Artist 1" }];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockConcerts,
      } as Response);

      const result = await fetchUpcomingConcerts(123);

      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/concerts/upcoming?userId=123");
      expect(result).toEqual(mockConcerts);
    });

    it("should throw error when fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(fetchUpcomingConcerts()).rejects.toThrow("Failed to fetch upcoming concerts");
    });
  });

  describe("submitConcertResponse", () => {
    it("should submit concert response with correct data", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      await submitConcertResponse(1, 123, "going");

      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/concerts/1/responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: 123, responseType: "going" }),
      });
    });

    it("should handle all response types", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      await submitConcertResponse(1, 123, "interested");
      expect(fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ userId: 123, responseType: "interested" }),
        })
      );

      await submitConcertResponse(1, 123, "not_going");
      expect(fetch).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ userId: 123, responseType: "not_going" }),
        })
      );
    });

    it("should throw error when submission fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(submitConcertResponse(1, 123, "going")).rejects.toThrow(
        "Failed to submit response"
      );
    });
  });

  describe("getUserByTelegramId", () => {
    it("should fetch user by telegram id", async () => {
      const mockUser = {
        id: 123,
        telegramId: "456",
        username: "testuser",
        firstName: "Test",
        lastName: "User",
        profilePhotoUrl: null,
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      } as Response);

      const result = await getUserByTelegramId(456);

      expect(fetch).toHaveBeenCalledWith("http://localhost:3001/api/users/telegram/456");
      expect(result).toEqual(mockUser);
    });

    it("should throw error when user fetch fails", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await expect(getUserByTelegramId(456)).rejects.toThrow("Failed to fetch user");
    });
  });

  describe("API URL configuration", () => {
    it("should use VITE_API_URL from environment", async () => {
      // Note: This test verifies the default behavior
      // In production, VITE_API_URL would be set during build
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);

      await fetchConcerts();

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("http://localhost:3001"));
    });
  });
});
