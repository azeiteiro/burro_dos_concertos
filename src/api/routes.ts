import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { prisma } from "@/config/db";
import { startOfDay } from "date-fns";
import { Concert } from "@prisma/client";

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

// Helper to serialize concerts for JSON response
const serializeConcert = (concert: Concert) => ({
  ...concert,
  pollMessageId: concert.pollMessageId ? concert.pollMessageId.toString() : null,
});

// Get all concerts
router.get("/concerts", async (req, res) => {
  try {
    const concerts = await prisma.concert.findMany({
      orderBy: { concertDate: "asc" },
    });
    res.json(concerts.map(serializeConcert));
  } catch (error) {
    console.error("Error fetching concerts:", error);
    res.status(500).json({ error: "Failed to fetch concerts" });
  }
});

// Get upcoming concerts (from today onwards)
router.get("/concerts/upcoming", async (req, res) => {
  try {
    const today = startOfDay(new Date());
    const concerts = await prisma.concert.findMany({
      where: {
        concertDate: { gte: today },
      },
      orderBy: { concertDate: "asc" },
    });
    res.json(concerts.map(serializeConcert));
  } catch (error) {
    console.error("Error fetching upcoming concerts:", error);
    res.status(500).json({ error: "Failed to fetch upcoming concerts" });
  }
});

export default router;
