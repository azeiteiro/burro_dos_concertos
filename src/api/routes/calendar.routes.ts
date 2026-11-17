import { Router } from "express";
import { prisma } from "#/config/db";
import { getUserConcertsForCalendar } from "#/services/concertService";
import { generateCalendar } from "#/services/calendarService";

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

export default router;
