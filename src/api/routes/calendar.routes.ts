import { Router } from "express";
import { prisma } from "@/config/db";
import { getUserConcertsForCalendar } from "@/services/concertService";
import { generateCalendar } from "@/services/calendarService";

const router = Router();

// Get user's calendar feed (iCal format)
router.get("/:userId/calendar.ics", async (req, res) => {
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
    const concerts = await getUserConcertsForCalendar(userId);

    // Generate calendar
    const calendar = generateCalendar(concerts);

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
router.get("/:userId/calendar-debug", async (req, res) => {
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
    const concerts = await getUserConcertsForCalendar(userId);

    // Generate calendar
    const calendar = generateCalendar(concerts);

    // Return as JSON with debug info
    res.json({
      userId,
      userName: user.firstName,
      concertsFound: concerts.length,
      concerts: concerts.map((c) => ({
        id: c.id,
        artist: c.artistName,
        date: c.concertDate,
        time: c.concertTime,
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
