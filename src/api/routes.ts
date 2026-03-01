import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@/config/db";
import { startOfDay } from "date-fns";
import { Concert, ResponseType, ConcertResponse } from "@prisma/client";
import { getPollResponses } from "@/services/pollService";
import ical, { ICalCalendarMethod, ICalAlarmType } from "ical-generator";

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
  // Prevent caching of dynamic concert data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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
  // Prevent caching of dynamic concert data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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
  // Prevent caching of dynamic response data
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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

// Get user's calendar feed (iCal format)
router.get("/users/:userId/calendar.ics", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's concerts (going or interested)
    const concerts = await prisma.concert.findMany({
      where: {
        responses: {
          some: {
            userId,
            responseType: {
              in: [ResponseType.going, ResponseType.interested],
            },
          },
        },
        concertDate: {
          gte: startOfDay(new Date()), // Only upcoming concerts
        },
      },
      include: {
        responses: {
          where: { userId },
          select: { responseType: true },
        },
      },
      orderBy: { concertDate: "asc" },
    });

    // Create calendar
    const calendar = ical({
      name: "My Concert Calendar",
      description: "Your upcoming concerts",
      timezone: "Europe/Lisbon",
      ttl: 3600, // Refresh every hour
      method: ICalCalendarMethod.PUBLISH,
    });

    // Add concerts as events
    concerts.forEach((concert) => {
      const responseType = concert.responses[0]?.responseType;
      const status = responseType === ResponseType.going ? "Going" : "Interested";

      const start = new Date(concert.concertDate);
      let end = new Date(concert.concertDate);

      // If concert has a time, use it
      if (concert.concertTime) {
        const concertTime = new Date(concert.concertTime);
        start.setHours(concertTime.getHours(), concertTime.getMinutes(), 0, 0);
        // End time: 3 hours after start (default concert duration)
        end = new Date(start);
        end.setHours(start.getHours() + 3);
      } else {
        // All-day event
        end.setDate(end.getDate() + 1);
      }

      const event = calendar.createEvent({
        start,
        end,
        summary: `[${status}] ${concert.artistName}`,
        description: concert.notes || undefined,
        location: concert.venue,
        url: concert.url || undefined,
        allDay: !concert.concertTime,
      });

      // Add alarm (1 day before)
      event.createAlarm({
        type: ICalAlarmType.display,
        trigger: 60 * 60 * 24, // 24 hours before
      });
    });

    // Set headers for calendar subscription
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `inline; filename="concerts-${userId}.ics"`);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, must-revalidate");

    // Send calendar
    res.send(calendar.toString());
  } catch (error) {
    console.error("Error generating calendar:", error);
    res.status(500).json({ error: "Failed to generate calendar" });
  }
});

// Debug endpoint: View calendar as plain text
router.get("/users/:userId/calendar-debug", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get user's concerts (going or interested)
    const concerts = await prisma.concert.findMany({
      where: {
        responses: {
          some: {
            userId,
            responseType: {
              in: [ResponseType.going, ResponseType.interested],
            },
          },
        },
        concertDate: {
          gte: startOfDay(new Date()), // Only upcoming concerts
        },
      },
      include: {
        responses: {
          where: { userId },
          select: { responseType: true },
        },
      },
      orderBy: { concertDate: "asc" },
    });

    // Create calendar
    const calendar = ical({
      name: "My Concert Calendar",
      description: "Your upcoming concerts",
      timezone: "Europe/Lisbon",
      ttl: 3600,
      method: ICalCalendarMethod.PUBLISH,
    });

    // Add concerts as events
    concerts.forEach((concert) => {
      const responseType = concert.responses[0]?.responseType;
      const status = responseType === ResponseType.going ? "Going" : "Interested";

      const start = new Date(concert.concertDate);
      let end = new Date(concert.concertDate);

      if (concert.concertTime) {
        const concertTime = new Date(concert.concertTime);
        start.setHours(concertTime.getHours(), concertTime.getMinutes(), 0, 0);
        end = new Date(start);
        end.setHours(start.getHours() + 3);
      } else {
        end.setDate(end.getDate() + 1);
      }

      calendar.createEvent({
        start,
        end,
        summary: `[${status}] ${concert.artistName}`,
        description: concert.notes || undefined,
        location: concert.venue,
        url: concert.url || undefined,
        allDay: !concert.concertTime,
      });
    });

    // Return as JSON with debug info
    res.json({
      userId,
      userName: user.firstName,
      concertsFound: concerts.length,
      concerts: concerts.map((c) => ({
        id: c.id,
        artist: c.artistName,
        date: c.concertDate,
        venue: c.venue,
        response: c.responses[0]?.responseType,
      })),
      icsContent: calendar.toString(),
    });
  } catch (error) {
    console.error("Error generating calendar debug:", error);
    res.status(500).json({ error: "Failed to generate calendar debug" });
  }
});

export default router;
