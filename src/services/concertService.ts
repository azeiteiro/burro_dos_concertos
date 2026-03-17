import { prisma } from "@/config/db";
import { ResponseType } from "@prisma/client";
import { startOfDay } from "date-fns";
import pino from "pino";

const logger = pino({ name: "concertService" });

/**
 * Get all concerts with their responses
 */
export const getAllConcerts = async () => {
  try {
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

    logger.info({ count: concerts.length }, "Retrieved all concerts");
    return concerts;
  } catch (error) {
    logger.error({ error }, "Failed to get all concerts");
    throw error;
  }
};

/**
 * Get upcoming concerts (from today onwards) with their responses
 */
export const getUpcomingConcerts = async () => {
  try {
    const today = startOfDay(new Date());

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

    logger.info({ count: concerts.length }, "Retrieved upcoming concerts");
    return concerts;
  } catch (error) {
    logger.error({ error }, "Failed to get upcoming concerts");
    throw error;
  }
};

/**
 * Get a single concert by ID
 */
export const getConcertById = async (concertId: number) => {
  try {
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
    });

    if (concert) {
      logger.info({ concertId }, "Retrieved concert");
    } else {
      logger.warn({ concertId }, "Concert not found");
    }

    return concert;
  } catch (error) {
    logger.error({ error, concertId }, "Failed to get concert");
    throw error;
  }
};

/**
 * Create or update a concert response
 */
export const upsertConcertResponse = async (
  concertId: number,
  userId: number,
  responseType: ResponseType
) => {
  try {
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

    logger.info({ concertId, userId, responseType }, "Concert response saved successfully");
    return response;
  } catch (error) {
    logger.error({ error, concertId, userId }, "Failed to save concert response");
    throw error;
  }
};

/**
 * Get user's concerts for calendar (going or interested, upcoming only)
 */
export const getUserConcertsForCalendar = async (userId: number) => {
  try {
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

    logger.info({ userId, count: concerts.length }, "Retrieved user concerts for calendar");
    return concerts;
  } catch (error) {
    logger.error({ error, userId }, "Failed to get user concerts for calendar");
    throw error;
  }
};
