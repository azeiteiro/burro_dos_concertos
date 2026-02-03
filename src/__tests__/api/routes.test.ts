import request from "supertest";
import express from "express";
import { prisma } from "@/config/db";
import apiRoutes from "@/api/routes";

jest.mock("@/config/db", () => ({
  prisma: {
    concert: {
      findMany: jest.fn(),
    },
  },
}));

const app = express();
app.use(express.json());
app.use("/api", apiRoutes);

describe("API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/concerts", () => {
    it("should return all concerts", async () => {
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
      });
      expect(prisma.concert.findMany).toHaveBeenCalledWith({
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
    it("should return upcoming concerts", async () => {
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
      });
      expect(prisma.concert.findMany).toHaveBeenCalledWith({
        where: {
          concertDate: { gte: expect.any(Date) },
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
});
