import { BotContext } from "@/types/global";
import { savePollResponse } from "@/services/pollService";
import { findOrCreateUser } from "@/utils/user";
import pino from "pino";

const logger = pino({ name: "pollHandler" });

/**
 * Handles poll answer updates from Telegram
 * Called when a user votes or changes their vote on a non-anonymous poll
 */
export async function handlePollAnswer(ctx: BotContext) {
  const pollAnswer = ctx.pollAnswer;
  if (!pollAnswer) return;

  const pollId = pollAnswer.poll_id;
  const telegramUser = pollAnswer.user;
  const optionIds = pollAnswer.option_ids;

  // Polls should be single-choice, so we take the first option
  const optionId = optionIds[0];

  if (optionId === undefined) {
    logger.warn({ pollId, userId: telegramUser.id }, "No option selected in poll answer");
    return;
  }

  try {
    // Find or create the user in our database
    const user = await findOrCreateUser(telegramUser);

    // Save the poll response
    await savePollResponse(pollId, user.id, optionId);

    logger.info(
      {
        pollId,
        userId: user.id,
        telegramId: telegramUser.id,
        username: telegramUser.username,
        optionId,
      },
      "Poll answer processed successfully"
    );
  } catch (error) {
    logger.error(
      { error, pollId, telegramUserId: telegramUser.id },
      "Failed to process poll answer"
    );
  }
}
