import { prisma } from "@/config/db";
import { linkPollToConcert, savePollResponse, getPollResponses } from "@/services/pollService";
import { ResponseType } from "@prisma/client";

jest.mock("@/config/db", () => ({
  prisma: {
    concert: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    concertResponse: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("pollService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("linkPollToConcert", () => {
    it("should link poll to concert successfully", async () => {
      (prisma.concert.update as jest.Mock).mockResolvedValue({});

      await linkPollToConcert(1, "poll123", 456);

      expect(prisma.concert.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          pollId: "poll123",
          pollMessageId: BigInt(456),
        },
      });
    });

    it("should throw error if update fails", async () => {
      (prisma.concert.update as jest.Mock).mockRejectedValue(new Error("DB error"));

      await expect(linkPollToConcert(1, "poll123", 456)).rejects.toThrow("DB error");
    });
  });

  describe("savePollResponse", () => {
    it("should save poll response for going option", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        pollId: "poll123",
      });
      (prisma.concertResponse.upsert as jest.Mock).mockResolvedValue({});

      await savePollResponse("poll123", 10, 0);

      expect(prisma.concert.findUnique).toHaveBeenCalledWith({
        where: { pollId: "poll123" },
      });
      expect(prisma.concertResponse.upsert).toHaveBeenCalledWith({
        where: {
          concertId_userId: {
            concertId: 1,
            userId: 10,
          },
        },
        update: {
          responseType: ResponseType.going,
          updatedAt: expect.any(Date),
        },
        create: {
          concertId: 1,
          userId: 10,
          responseType: ResponseType.going,
        },
      });
    });

    it("should save poll response for interested option", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        pollId: "poll123",
      });
      (prisma.concertResponse.upsert as jest.Mock).mockResolvedValue({});

      await savePollResponse("poll123", 10, 1);

      expect(prisma.concertResponse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            responseType: ResponseType.interested,
          }),
          create: expect.objectContaining({
            responseType: ResponseType.interested,
          }),
        })
      );
    });

    it("should save poll response for not going option", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        pollId: "poll123",
      });
      (prisma.concertResponse.upsert as jest.Mock).mockResolvedValue({});

      await savePollResponse("poll123", 10, 2);

      expect(prisma.concertResponse.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            responseType: ResponseType.not_going,
          }),
          create: expect.objectContaining({
            responseType: ResponseType.not_going,
          }),
        })
      );
    });

    it("should return early if concert not found", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue(null);

      await savePollResponse("poll123", 10, 0);

      expect(prisma.concertResponse.upsert).not.toHaveBeenCalled();
    });

    it("should return early if invalid option ID", async () => {
      (prisma.concert.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        pollId: "poll123",
      });

      await savePollResponse("poll123", 10, 999);

      expect(prisma.concertResponse.upsert).not.toHaveBeenCalled();
    });
  });

  describe("getPollResponses", () => {
    it("should retrieve and group poll responses", async () => {
      const mockResponses = [
        {
          id: 1,
          concertId: 1,
          userId: 10,
          responseType: ResponseType.going,
          user: { telegramId: BigInt(123), username: "user1", firstName: "John" },
        },
        {
          id: 2,
          concertId: 1,
          userId: 11,
          responseType: ResponseType.interested,
          user: { telegramId: BigInt(456), username: "user2", firstName: "Jane" },
        },
        {
          id: 3,
          concertId: 1,
          userId: 12,
          responseType: ResponseType.going,
          user: { telegramId: BigInt(789), username: "user3", firstName: "Bob" },
        },
      ];

      (prisma.concertResponse.findMany as jest.Mock).mockResolvedValue(mockResponses);

      const result = await getPollResponses(1);

      expect(prisma.concertResponse.findMany).toHaveBeenCalledWith({
        where: { concertId: 1 },
        include: {
          user: {
            select: {
              telegramId: true,
              username: true,
              firstName: true,
            },
          },
        },
      });

      expect(result.going).toHaveLength(2);
      expect(result.interested).toHaveLength(1);
      expect(result.not_going).toHaveLength(0);
    });

    it("should handle empty responses", async () => {
      (prisma.concertResponse.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getPollResponses(1);

      expect(result.going).toHaveLength(0);
      expect(result.interested).toHaveLength(0);
      expect(result.not_going).toHaveLength(0);
    });
  });
});
