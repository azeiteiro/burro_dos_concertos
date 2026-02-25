import { prisma } from "@/config/db";
import { Concert } from "@prisma/client";
import { Bot, Context } from "grammy";
import { format, startOfDay, endOfDay } from "date-fns";
import pino from "pino";
import { linkPollToConcert } from "@/services/pollService";

const logger = pino({ name: "notifications" });

// Helper to get GROUP_ID (reads from env each time for testability)
const getGroupId = () => process.env.GROUP_ID;

// Validate GROUP_ID on module load
if (!getGroupId()) {
  logger.warn("GROUP_ID not set - notifications will be disabled");
}

// Escape Markdown special characters to prevent formatting issues
const escapeMarkdown = (text: string): string => {
  return text.replace(/([_*[\]()~`>#+=|{}.!\-\\])/g, "\\$1");
};

export const formatConcertList = (title: string, concerts: Concert[]) => {
  let msg = `🎶 *${escapeMarkdown(title)}*\n\n`;
  concerts.forEach((c) => {
    const dateStr = format(c.concertDate, "yyyy-MM-dd");
    const timeStr = c.concertTime ? ` at ${format(c.concertTime, "HH:mm")}` : "";
    const artistEscaped = escapeMarkdown(c.artistName);
    const venueEscaped = escapeMarkdown(c.venue);
    msg += `• ${artistEscaped} – ${venueEscaped} (${dateStr}${timeStr})\n`;
  });
  return msg;
};

export const sendTodayConcerts = async (bot: Bot) => {
  const groupId = getGroupId();
  if (!groupId) {
    logger.warn("Skipping daily notification - GROUP_ID not configured");
    return;
  }

  try {
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    const concerts = await prisma.concert.findMany({
      where: {
        concertDate: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { concertTime: "asc" },
    });

    if (!concerts.length) {
      logger.info("No concerts today - skipping notification");
      return;
    }

    await bot.api.sendMessage(groupId, formatConcertList("Today's concerts", concerts), {
      parse_mode: "Markdown",
    });

    logger.info(`Sent daily notification for ${concerts.length} concerts`);
  } catch (error) {
    logger.error({ error }, "Failed to send daily concert notification");
  }
};

export const sendWeekConcerts = async (bot: Bot) => {
  const groupId = getGroupId();
  if (!groupId) {
    logger.warn("Skipping weekly notification - GROUP_ID not configured");
    return;
  }

  try {
    const today = new Date();
    const weekStart = startOfDay(today);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    const weekEndDay = endOfDay(weekEnd);

    const concerts = await prisma.concert.findMany({
      where: {
        concertDate: { gte: weekStart, lte: weekEndDay },
      },
      orderBy: { concertDate: "asc" },
    });

    if (!concerts.length) {
      logger.info("No concerts this week - skipping notification");
      return;
    }

    const message = await bot.api.sendMessage(
      groupId,
      formatConcertList("This Week's concerts", concerts),
      {
        parse_mode: "Markdown",
      }
    );

    // Unpin all old messages and pin the new weekly message
    try {
      await bot.api.unpinAllChatMessages(groupId);
      logger.info(`Unpinned all previous messages`);

      await bot.api.pinChatMessage(groupId, message.message_id, {
        disable_notification: true, // Don't notify users about the pin
      });
      logger.info(`Pinned weekly notification message`);
    } catch (pinError) {
      logger.warn({ error: pinError }, "Failed to pin weekly message (might lack permissions)");
    }

    logger.info(`Sent weekly notification for ${concerts.length} concerts`);
  } catch (error) {
    logger.error({ error }, "Failed to send weekly concert notification");
  }
};

export const sendMonthConcerts = async (bot: Bot) => {
  const groupId = getGroupId();
  if (!groupId) {
    logger.warn("Skipping monthly notification - GROUP_ID not configured");
    return;
  }

  try {
    const today = new Date();
    const startMonth = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const endMonth = endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));

    const concerts = await prisma.concert.findMany({
      where: {
        concertDate: { gte: startMonth, lte: endMonth },
      },
      orderBy: { concertDate: "asc" },
    });

    if (!concerts.length) {
      logger.info("No concerts this month - skipping notification");
      return;
    }

    await bot.api.sendMessage(groupId, formatConcertList("This Month's concerts", concerts), {
      parse_mode: "Markdown",
    });

    logger.info(`Sent monthly notification for ${concerts.length} concerts`);
  } catch (error) {
    logger.error({ error }, "Failed to send monthly concert notification");
  }
};

export async function notifyNewConcert(ctx: Context, concert: Concert) {
  const groupId = getGroupId();
  if (!groupId) {
    logger.warn("Skipping new concert notification - GROUP_ID not configured");
    return;
  }

  try {
    const dateStr = concert.concertDate
      ? format(concert.concertDate, "yyyy-MM-dd")
      : "Unknown date";
    const timeStr = concert.concertTime ? ` at ${format(concert.concertTime, "HH:mm")}` : "";
    const urlStr = concert.url ? `\n🔗 [More info](${concert.url})` : "";
    const notesStr = concert.notes ? `\n📝 ${escapeMarkdown(concert.notes)}` : "";

    const artistEscaped = escapeMarkdown(concert.artistName);
    const venueEscaped = escapeMarkdown(concert.venue);

    const message = `🎶 New concert added!\n\n🎤 **${artistEscaped}** at *${venueEscaped}*\n📅 ${dateStr}${timeStr}${urlStr}${notesStr}`;

    await ctx.api.sendMessage(groupId, message, {
      parse_mode: "Markdown",
    });

    logger.info(`Sent new concert notification for "${concert.artistName}" at ${concert.venue}`);

    // Send poll for concert attendance
    try {
      const pollQuestion = `Are you going to ${concert.artistName} at ${concert.venue}?`;
      const pollMessage = await ctx.api.sendPoll(
        groupId,
        pollQuestion,
        ["🎉 Going", "🤔 Interested", "❌ Not Going"],
        {
          is_anonymous: false,
          allows_multiple_answers: false,
        }
      );

      // Link the poll to the concert in the database
      await linkPollToConcert(concert.id, pollMessage.poll.id, pollMessage.message_id);

      logger.info(
        { concertId: concert.id, pollId: pollMessage.poll.id },
        "Poll sent and linked to concert"
      );
    } catch (pollError) {
      logger.error({ error: pollError, concertId: concert.id }, "Failed to send or link poll");
    }
  } catch (error) {
    logger.error({ error, concertId: concert.id }, "Failed to send new concert notification");
  }
}
