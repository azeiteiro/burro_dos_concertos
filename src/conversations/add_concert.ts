import { Context } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import { validateConcertInput } from "@/utils/validators";
import { ask } from "@/utils/helpers";
import { format } from "date-fns";
import { prisma } from "@/config/db";
import { logAction } from "@/utils/logger";

// ✅ Return data instead of saving directly
export const addConcertConversation = async (
  conversation: Conversation,
  ctx: Context,
  { dbUserId }: { dbUserId: number }
) => {
  // --- Artist ---
  const artistName = (await ask(
    conversation,
    ctx,
    "🎤 Who is the artist?",
    validateConcertInput.name
  )) as string;

  // --- Venue ---
  const venue = (await ask(
    conversation,
    ctx,
    "🏟️ Where is the concert?",
    validateConcertInput.location
  )) as string;

  // --- Date (simplified - validator now returns Date directly) ---
  const concertDate = (await ask(
    conversation,
    ctx,
    "📅 Enter concert date (YYYY-MM-DD or natural language like 'next Friday'):",
    validateConcertInput.date
  )) as Date;

  await ctx.reply(`✅ Date accepted: ${format(concertDate, "yyyy-MM-dd")}`);

  // --- Time (optional) ---
  const concertTime = (await ask(
    conversation,
    ctx,
    "⏰ Enter concert time (HH:mm) or skip:",
    validateConcertInput.time,
    { optional: true }
  )) as string | null;

  // --- URL ---
  const url = (await ask(conversation, ctx, "🔗 Add a URL:", validateConcertInput.url, {
    optional: true,
  })) as string | null;

  // --- Notes ---
  const notes = (await ask(conversation, ctx, "📝 Any notes?", validateConcertInput.notes, {
    optional: true,
  })) as string | null;

  /// ✅ Save to database using external() to prevent replay issues
  await conversation.external(async () => {
    const formattedDate = format(concertDate, "yyyy-MM-dd");

    // Create the base date
    const concertDateObj = new Date(`${formattedDate}T00:00:00Z`);

    // Create the full time if provided
    let concertTimeObj: Date | null = null;
    if (concertTime) {
      // Ensure valid ISO datetime format
      concertTimeObj = new Date(`${formattedDate}T${concertTime}:00Z`);
    }

    try {
      await prisma.concert.create({
        data: {
          userId: dbUserId,
          artistName,
          venue,
          concertDate: concertDateObj,
          concertTime: concertTimeObj,
          url,
          notes,
        },
      });

      logAction(dbUserId, `Added concert "${artistName}" at ${venue}`);
    } catch (err) {
      console.error("Failed to create concert:", err);
      throw err; // Re-throw to handle outside
    }
  });

  // ✅ Send success message after external operation
  const formattedDateMsg = format(concertDate, "yyyy-MM-dd");
  const formattedTimeMsg = concertTime && concertTime.length > 0 ? concertTime : null;

  await ctx.reply(
    `✅ Concert added: ${artistName} at ${venue} on ${formattedDateMsg}` +
      (formattedTimeMsg ? ` at ${formattedTimeMsg}` : "")
  );
};
