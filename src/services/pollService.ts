import { prisma } from "@/config/db";
import { ResponseType } from "@prisma/client";
import pino from "pino";

const logger = pino({ name: "pollService" });

/**
 * Link a Telegram poll to a concert
 * Called after sending a poll to store the poll IDs
 */
export const linkPollToConcert = async (
  concertId: number,
  pollId: string,
  messageId: number
): Promise<void> => {
  try {
    await prisma.concert.update({
      where: { id: concertId },
      data: {
        pollId,
        pollMessageId: BigInt(messageId),
      },
    });
    logger.info({ concertId, pollId, messageId }, "Poll linked to concert successfully");
  } catch (error) {
    logger.error({ error, concertId, pollId }, "Failed to link poll to concert");
    throw error;
  }
};

/**
 * Save or update a user's poll response
 * Called when receiving poll_answer updates from Telegram
 */
export const savePollResponse = async (
  pollId: string,
  userId: number,
  optionId: number
): Promise<void> => {
  try {
    // Look up the concert by poll ID
    const concert = await prisma.concert.findUnique({
      where: { pollId },
    });

    if (!concert) {
      logger.warn({ pollId }, "Concert not found for poll ID");
      return;
    }

    // Map option ID to response type
    // 0 = Going, 1 = Interested, 2 = Not Going
    const responseTypeMap: Record<number, ResponseType> = {
      0: ResponseType.going,
      1: ResponseType.interested,
      2: ResponseType.not_going,
    };

    const responseType = responseTypeMap[optionId];
    if (!responseType) {
      logger.warn({ optionId }, "Invalid option ID received");
      return;
    }

    // Upsert the response (update if exists, create if not)
    await prisma.concertResponse.upsert({
      where: {
        concertId_userId: {
          concertId: concert.id,
          userId,
        },
      },
      update: {
        responseType,
        updatedAt: new Date(),
      },
      create: {
        concertId: concert.id,
        userId,
        responseType,
      },
    });

    logger.info(
      { pollId, userId, responseType, concertId: concert.id },
      "Poll response saved successfully"
    );
  } catch (error) {
    logger.error({ error, pollId, userId }, "Failed to save poll response");
    throw error;
  }
};

/**
 * Get all poll responses for a concert
 * Returns response counts grouped by type
 */
export const getPollResponses = async (concertId: number) => {
  try {
    const responses = await prisma.concertResponse.findMany({
      where: { concertId },
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

    // Group responses by type
    const grouped = {
      going: responses.filter((r) => r.responseType === ResponseType.going),
      interested: responses.filter((r) => r.responseType === ResponseType.interested),
      not_going: responses.filter((r) => r.responseType === ResponseType.not_going),
    };

    logger.info(
      {
        concertId,
        counts: {
          going: grouped.going.length,
          interested: grouped.interested.length,
          not_going: grouped.not_going.length,
        },
      },
      "Retrieved poll responses"
    );

    return grouped;
  } catch (error) {
    logger.error({ error, concertId }, "Failed to get poll responses");
    throw error;
  }
};
