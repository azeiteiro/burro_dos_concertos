import { Router } from "express";
import { prisma } from "@/config/db";
import { startOfDay } from "date-fns";

const router = Router();

// Get all concerts
router.get("/concerts", async (req, res) => {
  try {
    const concerts = await prisma.concert.findMany({
      orderBy: { concertDate: "asc" },
    });
    res.json(concerts);
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
    res.json(concerts);
  } catch (error) {
    console.error("Error fetching upcoming concerts:", error);
    res.status(500).json({ error: "Failed to fetch upcoming concerts" });
  }
});

export default router;
