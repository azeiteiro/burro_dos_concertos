import { Router } from "express";
import { apiRateLimiter } from "#/api/middleware/rateLimiter";
import usersRoutes from "./users.routes";
import concertsRoutes from "./concerts.routes";
import calendarRoutes from "./calendar.routes";

const router = Router();

// Apply rate limiting to all routes
router.use(apiRateLimiter);

// Mount route modules
router.use("/users", usersRoutes);
router.use("/concerts", concertsRoutes);
router.use("/users", calendarRoutes);

export default router;
