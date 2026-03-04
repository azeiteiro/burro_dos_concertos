import request from "supertest";
import express from "express";
import { prisma } from "@/config/db";
import apiRoutes from "@/api/routes";
import * as pollService from "@/services/pollService";
import { ResponseType } from "@prisma/client";

jest.mock("@/config/db", () => ({
  prisma: {
    concert: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    concertResponse: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock("@/services/pollService", () => ({
  getPollResponses: jest.fn(),
}));

const app = express();
app.use(express.json());
app.use("/api", apiRoutes);

describe("API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/concerts", () => {
    it("should return all concerts with response counts", async () => {
      const mockConcerts = [
        {
          id: 1,
          artistName: "Test Artist",
          venue: "Test Venue",
          concertDate: new Date("2026-03-01"),
          concertTime: null,
          notes: null,
          url: null,
          userId: 1,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [
            { userId: 10, responseType: ResponseType.going },
            { userId: 11, responseType: ResponseType.interested },
          ],
        },
      ];

      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/concerts");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        artistName: "Test Artist",
        venue: "Test Venue",
        responses: {
          going: 1,
          interested: 1,
          not_going: 0,
          userResponse: null,
        },
      });
      expect(prisma.concert.findMany).toHaveBeenCalledWith({
        include: {
          responses: {
            select: {
              userId: true,
              responseType: true,
            },
          },
        },
        orderBy: { concertDate: "asc" },
      });
    });

    it("should handle database errors", async () => {
      (prisma.concert.findMany as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/concerts");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to fetch concerts" });
    });
  });

  describe("GET /api/concerts/upcoming", () => {
    it("should return upcoming concerts with response counts", async () => {
      const mockConcerts = [
        {
          id: 1,
          artistName: "Future Artist",
          venue: "Future Venue",
          concertDate: new Date("2026-12-31"),
          concertTime: null,
          notes: null,
          url: null,
          userId: 1,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [
            { userId: 10, responseType: ResponseType.going },
            { userId: 10, responseType: ResponseType.going },
            { userId: 11, responseType: ResponseType.interested },
          ],
        },
      ];

      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/concerts/upcoming");

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        artistName: "Future Artist",
        venue: "Future Venue",
        responses: {
          going: 2,
          interested: 1,
          not_going: 0,
          userResponse: null,
        },
      });
      expect(prisma.concert.findMany).toHaveBeenCalledWith({
        where: {
          concertDate: { gte: expect.any(Date) },
        },
        include: {
          responses: {
            select: {
              userId: true,
              responseType: true,
            },
          },
        },
        orderBy: { concertDate: "asc" },
      });
    });

    it("should handle database errors", async () => {
      (prisma.concert.findMany as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/concerts/upcoming");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to fetch upcoming concerts" });
    });
  });

  describe("GET /api/concerts/:id/responses", () => {
    it("should return poll responses for a concert", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (pollService.getPollResponses as jest.Mock).mockResolvedValue({
        going: [
          {
            userId: 10,
            user: { telegramId: BigInt(123), username: "user1", firstName: "John" },
          },
        ],
        interested: [
          {
            userId: 11,
            user: { telegramId: BigInt(456), username: "user2", firstName: "Jane" },
          },
        ],
        not_going: [],
      });

      const response = await request(app).get("/api/concerts/1/responses");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        concertId: 1,
        going: {
          count: 1,
          users: [
            {
              id: 10,
              telegramId: "123",
              username: "user1",
              firstName: "John",
            },
          ],
        },
        interested: {
          count: 1,
          users: [
            {
              id: 11,
              telegramId: "456",
              username: "user2",
              firstName: "Jane",
            },
          ],
        },
        not_going: {
          count: 0,
          users: [],
        },
      });
    });

    it("should return poll responses including not_going users", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (pollService.getPollResponses as jest.Mock).mockResolvedValue({
        going: [],
        interested: [],
        not_going: [
          {
            userId: 12,
            user: { telegramId: BigInt(789), username: "user3", firstName: "Bob" },
          },
        ],
      });

      const response = await request(app).get("/api/concerts/1/responses");

      expect(response.status).toBe(200);
      expect(response.body.not_going).toEqual({
        count: 1,
        users: [
          {
            id: 12,
            telegramId: "789",
            username: "user3",
            firstName: "Bob",
          },
        ],
      });
    });

    it("should return 400 for invalid concert ID", async () => {
      const response = await request(app).get("/api/concerts/invalid/responses");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid concert ID" });
    });

    it("should return 404 for non-existent concert", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get("/api/concerts/999/responses");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Concert not found" });
    });
  });

  describe("POST /api/concerts/:id/responses", () => {
    it("should save a poll response", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
      (prisma.concertResponse.upsert as jest.Mock).mockResolvedValue({
        id: 1,
        concertId: 1,
        userId: 10,
        responseType: ResponseType.going,
      });

      const response = await request(app).post("/api/concerts/1/responses").send({
        userId: 10,
        responseType: "going",
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        response: {
          id: 1,
          concertId: 1,
          userId: 10,
          responseType: "going",
        },
      });
    });

    it("should return 400 for invalid concert ID", async () => {
      const response = await request(app).post("/api/concerts/invalid/responses").send({
        userId: 10,
        responseType: "going",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid concert ID" });
    });

    it("should return 400 for missing userId", async () => {
      const response = await request(app).post("/api/concerts/1/responses").send({
        responseType: "going",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "User ID is required" });
    });

    it("should return 400 for invalid responseType", async () => {
      const response = await request(app).post("/api/concerts/1/responses").send({
        userId: 10,
        responseType: "maybe",
      });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "Valid response type is required (going, interested, not_going)",
      });
    });

    it("should return 404 for non-existent concert", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post("/api/concerts/999/responses").send({
        userId: 10,
        responseType: "going",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "Concert not found" });
    });

    it("should return 404 for non-existent user", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).post("/api/concerts/1/responses").send({
        userId: 999,
        responseType: "going",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "User not found" });
    });
  });

  describe("GET /api/users/telegram/:telegramId", () => {
    it("should return user by Telegram ID", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 10,
        telegramId: BigInt(123456),
        username: "testuser",
        firstName: "Test",
      });

      const response = await request(app).get("/api/users/telegram/123456");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 10,
        telegramId: "123456",
        username: "testuser",
        firstName: "Test",
      });
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { telegramId: BigInt(123456) },
        select: {
          id: true,
          telegramId: true,
          username: true,
          firstName: true,
        },
      });
    });

    it("should return 404 for non-existent user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get("/api/users/telegram/999999");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "User not found" });
    });

    it("should handle database errors", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/users/telegram/123456");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to fetch user" });
    });
  });

  describe("GET /api/concerts with userId parameter", () => {
    it("should return concerts with user's response when userId is provided", async () => {
      const mockConcerts = [
        {
          id: 1,
          artistName: "Test Artist",
          venue: "Test Venue",
          concertDate: new Date("2026-03-01"),
          concertTime: null,
          notes: null,
          url: null,
          userId: 1,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [
            { userId: 10, responseType: ResponseType.going },
            { userId: 11, responseType: ResponseType.interested },
          ],
        },
      ];

      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/concerts?userId=10");

      expect(response.status).toBe(200);
      expect(response.body[0].responses.userResponse).toBe("going");
    });
  });

  describe("GET /api/concerts/upcoming with userId parameter", () => {
    it("should return upcoming concerts with user's response when userId is provided", async () => {
      const mockConcerts = [
        {
          id: 1,
          artistName: "Future Artist",
          venue: "Future Venue",
          concertDate: new Date("2026-12-31"),
          concertTime: null,
          notes: null,
          url: null,
          userId: 1,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [{ userId: 15, responseType: ResponseType.interested }],
        },
      ];

      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/concerts/upcoming?userId=15");

      expect(response.status).toBe(200);
      expect(response.body[0].responses.userResponse).toBe("interested");
    });
  });

  describe("GET /api/concerts/:id/responses error handling", () => {
    it("should handle database errors when fetching responses", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (pollService.getPollResponses as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/concerts/1/responses");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to fetch concert responses" });
    });
  });

  describe("POST /api/concerts/:id/responses error handling", () => {
    it("should handle database errors when saving response", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 10 });
      (prisma.concertResponse.upsert as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).post("/api/concerts/1/responses").send({
        userId: 10,
        responseType: "going",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to save concert response" });
    });
  });

  describe("GET /api/users/:userId/calendar.ics", () => {
    it("should generate calendar for user's concerts", async () => {
      const mockUser = {
        id: 10,
        telegramId: BigInt(123456),
        username: "testuser",
        firstName: "Test",
      };

      const mockConcerts = [
        {
          id: 1,
          artistName: "Band A",
          venue: "Venue A",
          concertDate: new Date("2026-06-15T20:00:00Z"),
          concertTime: new Date("2026-06-15T20:00:00Z"),
          notes: "Great show",
          url: "https://example.com/concert1",
          userId: 10,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [{ responseType: ResponseType.going }],
        },
        {
          id: 2,
          artistName: "Band B",
          venue: "Venue B",
          concertDate: new Date("2026-07-20"),
          concertTime: null,
          notes: null,
          url: null,
          userId: 10,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [{ responseType: ResponseType.interested }],
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/users/10/calendar.ics");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toContain("text/calendar");
      expect(response.headers["content-disposition"]).toBe('inline; filename="concerts-10.ics"');
      expect(response.text).toContain("BEGIN:VCALENDAR");
      expect(response.text).toContain("BEGIN:VEVENT");
      expect(response.text).toContain("[Going] Band A");
      expect(response.text).toContain("[Interested] Band B");
      expect(response.text).toContain("Venue A");
      expect(response.text).toContain("Venue B");
      expect(response.text).toContain("Great show");
      expect(response.text).toContain("END:VCALENDAR");
    });

    it("should return 400 for invalid user ID", async () => {
      const response = await request(app).get("/api/users/invalid/calendar.ics");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid user ID" });
    });

    it("should return 404 for non-existent user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get("/api/users/999/calendar.ics");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "User not found" });
    });

    it("should handle database errors", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/users/10/calendar.ics");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to generate calendar" });
    });

    it("should generate empty calendar when user has no concerts", async () => {
      const mockUser = {
        id: 10,
        telegramId: BigInt(123456),
        username: "testuser",
        firstName: "Test",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get("/api/users/10/calendar.ics");

      expect(response.status).toBe(200);
      expect(response.text).toContain("BEGIN:VCALENDAR");
      expect(response.text).toContain("END:VCALENDAR");
    });

    it("should handle all-day events (concerts without time)", async () => {
      const mockUser = {
        id: 10,
        telegramId: BigInt(123456),
        username: "testuser",
        firstName: "Test",
      };

      const mockConcerts = [
        {
          id: 1,
          artistName: "All Day Band",
          venue: "Festival Grounds",
          concertDate: new Date("2026-08-01"),
          concertTime: null, // No specific time = all-day event
          notes: null,
          url: null,
          userId: 10,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [{ responseType: ResponseType.going }],
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/users/10/calendar.ics");

      expect(response.status).toBe(200);
      expect(response.text).toContain("[Going] All Day Band");
      expect(response.text).toContain("Festival Grounds");
    });
  });

  describe("GET /api/users/:userId/calendar-debug", () => {
    it("should return debug info for user's calendar", async () => {
      const mockUser = {
        id: 10,
        telegramId: BigInt(123456),
        username: "testuser",
        firstName: "Test",
      };

      const mockConcerts = [
        {
          id: 1,
          artistName: "Band A",
          venue: "Venue A",
          concertDate: new Date("2026-06-15T20:00:00Z"),
          concertTime: new Date("2026-06-15T20:00:00Z"),
          notes: "Great show",
          url: "https://example.com/concert1",
          userId: 10,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [{ responseType: ResponseType.going }],
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/users/10/calendar-debug");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: 10,
        userName: "Test",
        concertsFound: 1,
        concerts: [
          {
            id: 1,
            artist: "Band A",
            venue: "Venue A",
            response: "going",
          },
        ],
      });
      expect(response.body.icsContent).toContain("BEGIN:VCALENDAR");
      expect(response.body.icsContent).toContain("[Going] Band A");
    });

    it("should return 400 for invalid user ID", async () => {
      const response = await request(app).get("/api/users/invalid/calendar-debug");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Invalid user ID" });
    });

    it("should return 404 for non-existent user", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const response = await request(app).get("/api/users/999/calendar-debug");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "User not found" });
    });

    it("should handle database errors", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("Database error"));

      const response = await request(app).get("/api/users/10/calendar-debug");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Failed to generate calendar debug" });
    });

    it("should handle all-day events in debug endpoint", async () => {
      const mockUser = {
        id: 10,
        telegramId: BigInt(123456),
        username: "testuser",
        firstName: "Test",
      };

      const mockConcerts = [
        {
          id: 1,
          artistName: "Festival Band",
          venue: "Festival Venue",
          concertDate: new Date("2026-08-15"),
          concertTime: null, // All-day event
          notes: null,
          url: null,
          userId: 10,
          notified: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          pollId: null,
          pollMessageId: null,
          responses: [{ responseType: ResponseType.interested }],
        },
      ];

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);

      const response = await request(app).get("/api/users/10/calendar-debug");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        userId: 10,
        concertsFound: 1,
      });
      expect(response.body.icsContent).toContain("[Interested] Festival Band");
    });
  });
});
