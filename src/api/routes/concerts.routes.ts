import { Router } from "express";
import { prisma } from "#/config/db";
import { ResponseType } from "@prisma/client";
import { getPollResponses } from "#/services/pollService";
import {
  getAllConcerts,
  getUpcomingConcerts,
  getConcertById,
  upsertConcertResponse,
} from "#/services/concertService";
import { setNoCacheHeaders, transformConcertWithResponses } from "#/api/utils/serializers";

const router = Router();

// Get all concerts with response counts
router.get("/", async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const concerts = await getAllConcerts();

    // Transform concerts to include response counts and user's response
    const concertsWithResponses = concerts.map((concert) =>
      transformConcertWithResponses(concert, userId)
    );

    res.json(concertsWithResponses);
  } catch (error) {
    console.error("Error fetching concerts:", error);
    res.status(500).json({ error: "Failed to fetch concerts" });
  }
});

// Get upcoming concerts (from today onwards) with response counts
router.get("/upcoming", async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;

    const concerts = await getUpcomingConcerts();

    // Transform concerts to include response counts and user's response
    const concertsWithResponses = concerts.map((concert) =>
      transformConcertWithResponses(concert, userId)
    );

    res.json(concertsWithResponses);
  } catch (error) {
    console.error("Error fetching upcoming concerts:", error);
    res.status(500).json({ error: "Failed to fetch upcoming concerts" });
  }
});

// Get poll responses for a concert
router.get("/:id/responses", async (req, res) => {
  setNoCacheHeaders(res);

  try {
    const concertId = parseInt(req.params.id);

    if (isNaN(concertId)) {
      return res.status(400).json({ error: "Invalid concert ID" });
    }

    // Check if concert exists
    const concert = await getConcertById(concertId);

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
router.post("/:id/responses", async (req, res) => {
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
    const concert = await getConcertById(concertId);

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
    const response = await upsertConcertResponse(concertId, userId, responseType);

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
