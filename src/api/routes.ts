import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@/config/db";
import { startOfDay } from "date-fns";
import { Concert, ResponseType, ConcertResponse } from "@prisma/client";
import { getPollResponses } from "@/services/pollService";

type ConcertWithResponses = Concert & {
  responses: Pick<ConcertResponse, "userId" | "responseType">[];
};

const router = Router();

// Rate limiting: 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: "Too many requests from this IP, please try again later.",
});

// Apply rate limiting to all routes
router.use(limiter);

// Get user by Telegram ID
router.get("/users/telegram/:telegramId", async (req, res) => {
  try {
    const telegramId = req.params.telegramId;

    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Helper to serialize concerts for JSON response (removes responses array and converts BigInt)
const serializeConcert = (concert: ConcertWithResponses | Concert) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { responses, ...rest } = concert as ConcertWithResponses;
  return {
    ...rest,
    pollMessageId: rest.pollMessageId ? rest.pollMessageId.toString() : null,
  };
};

// Get all concerts with response counts
router.get("/concerts", async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const concerts = await prisma.concert.findMany({
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

    // Transform concerts to include response counts and user's response
    const concertsWithResponses = concerts.map((concert) => {
      const going = concert.responses.filter((r) => r.responseType === ResponseType.going);
      const interested = concert.responses.filter(
        (r) => r.responseType === ResponseType.interested
      );
      const notGoing = concert.responses.filter((r) => r.responseType === ResponseType.not_going);

      // Find current user's response if userId provided
      const userResponse = userId
        ? concert.responses.find((r) => r.userId === userId)?.responseType
        : null;

      return {
        ...serializeConcert(concert),
        responses: {
          going: going.length,
          interested: interested.length,
          not_going: notGoing.length,
          userResponse,
        },
      };
    });

    res.json(concertsWithResponses);
  } catch (error) {
    console.error("Error fetching concerts:", error);
    res.status(500).json({ error: "Failed to fetch concerts" });
  }
});

// Get upcoming concerts (from today onwards) with response counts
router.get("/concerts/upcoming", async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const concerts = await prisma.concert.findMany({
      where: {
        concertDate: { gte: today },
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

    // Transform concerts to include response counts and user's response
    const concertsWithResponses = concerts.map((concert) => {
      const going = concert.responses.filter((r) => r.responseType === ResponseType.going);
      const interested = concert.responses.filter(
        (r) => r.responseType === ResponseType.interested
      );
      const notGoing = concert.responses.filter((r) => r.responseType === ResponseType.not_going);

      // Find current user's response if userId provided
      const userResponse = userId
        ? concert.responses.find((r) => r.userId === userId)?.responseType
        : null;

      return {
        ...serializeConcert(concert),
        responses: {
          going: going.length,
          interested: interested.length,
          not_going: notGoing.length,
          userResponse,
        },
      };
    });

    res.json(concertsWithResponses);
  } catch (error) {
    console.error("Error fetching upcoming concerts:", error);
    res.status(500).json({ error: "Failed to fetch upcoming concerts" });
  }
});

// Get poll responses for a concert
router.get("/concerts/:id/responses", async (req, res) => {
  try {
    const concertId = parseInt(req.params.id);

    if (isNaN(concertId)) {
      return res.status(400).json({ error: "Invalid concert ID" });
    }

    // Check if concert exists
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      return res.status(404).json({ error: "Concert not found" });
    }

    // Get responses grouped by type
    const responses = await getPollResponses(concertId);

    // Format response with counts
    const result = {
      concertId,
      going: {
        count: responses.going.length,
        users: responses.going.map((r) => ({
          id: r.userId,
          telegramId: r.user.telegramId.toString(),
          username: r.user.username,
          firstName: r.user.firstName,
        })),
      },
      interested: {
        count: responses.interested.length,
        users: responses.interested.map((r) => ({
          id: r.userId,
          telegramId: r.user.telegramId.toString(),
          username: r.user.username,
          firstName: r.user.firstName,
        })),
      },
      not_going: {
        count: responses.not_going.length,
        users: responses.not_going.map((r) => ({
          id: r.userId,
          telegramId: r.user.telegramId.toString(),
          username: r.user.username,
          firstName: r.user.firstName,
        })),
      },
    };

    res.json(result);
  } catch (error) {
    console.error("Error fetching concert responses:", error);
    res.status(500).json({ error: "Failed to fetch concert responses" });
  }
});

// Submit or update a poll response
router.post("/concerts/:id/responses", async (req, res) => {
  try {
    const concertId = parseInt(req.params.id);
    const { userId, responseType } = req.body;

    if (isNaN(concertId)) {
      return res.status(400).json({ error: "Invalid concert ID" });
    }

    if (!userId || typeof userId !== "number") {
      return res.status(400).json({ error: "User ID is required" });
    }

    if (!responseType || !Object.values(ResponseType).includes(responseType)) {
      return res
        .status(400)
        .json({ error: "Valid response type is required (going, interested, not_going)" });
    }

    // Check if concert exists
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (!concert) {
      return res.status(404).json({ error: "Concert not found" });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Save or update the response
    const response = await prisma.concertResponse.upsert({
      where: {
        concertId_userId: {
          concertId,
          userId,
        },
      },
      update: {
        responseType,
        updatedAt: new Date(),
      },
      create: {
        concertId,
        userId,
        responseType,
      },
    });

    res.json({
      success: true,
      response: {
        id: response.id,
        concertId: response.concertId,
        userId: response.userId,
        responseType: response.responseType,
      },
    });
  } catch (error) {
    console.error("Error saving concert response:", error);
    res.status(500).json({ error: "Failed to save concert response" });
  }
});

export default router;
