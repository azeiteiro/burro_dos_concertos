import { Context } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import { validateConcertInput } from "@/utils/validators";
import { ask } from "@/utils/helpers";
import { format, parseISO } from "date-fns";
import { prisma } from "@/config/db";
import { logAction } from "@/utils/logger";
import { notifyNewConcert } from "@/notifications/helpers";

// Helper function to save concert
async function saveConcert(
  conversation: Conversation,
  ctx: Context,
  dbUserId: number,
  artistName: string,
  venue: string,
  concertDate: Date,
  concertTime: string | null,
  url: string | null,
  notes: string | null
) {
  const savedConcert = await conversation.external(async () => {
    const formattedDate = format(concertDate, "yyyy-MM-dd");
    const concertDateObj = parseISO(`${formattedDate}T00:00:00Z`);
    const concertTimeObj = concertTime ? parseISO(`${formattedDate}T${concertTime}:00Z`) : null;

    try {
      const concert = await prisma.concert.create({
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

      return concert;
    } catch (err) {
      console.error("Failed to create concert:", err);
      throw err;
    }
  });

  // Success message
  const formattedDateMsg = format(concertDate, "yyyy-MM-dd");
  const formattedTimeMsg = concertTime && concertTime.length > 0 ? ` at ${concertTime}` : "";

  await ctx.reply(
    `✅ Concert added: ${artistName} at ${venue} on ${formattedDateMsg}${formattedTimeMsg}`
  );

  await notifyNewConcert(ctx, savedConcert);
}

export const addConcertConversation = async (
  conversation: Conversation,
  ctx: Context,
  { dbUserId }: { dbUserId: number }
) => {
  // --- Artist ---
  const artistName = await ask(
    conversation,
    ctx,
    "🎤 Who is the artist?",
    validateConcertInput.name,
    { showCancel: true }
  );

  if (artistName === "CANCEL") return;

  // --- Venue ---
  const venue = await ask(
    conversation,
    ctx,
    "🏟️ Where is the concert?",
    validateConcertInput.location,
    { showCancel: true }
  );

  if (venue === "CANCEL") return;

  // --- Date ---
  const concertDate = await ask(
    conversation,
    ctx,
    "📅 Enter concert date (YYYY-MM-DD or natural language like 'next Friday'):",
    validateConcertInput.date,
    { showCancel: true }
  );

  if (concertDate === "CANCEL") return;

  await ctx.reply(`✅ Date accepted: ${format(concertDate as Date, "yyyy-MM-dd")}`);

  // --- Time (optional) ---
  const concertTime = await ask(
    conversation,
    ctx,
    "⏰ Enter concert time (HH:mm) or skip:",
    validateConcertInput.time,
    { optional: true, showFinish: true, showCancel: true }
  );

  if (concertTime === "CANCEL") return;
  if (concertTime === "FINISH") {
    // Save with mandatory fields only
    await saveConcert(
      conversation,
      ctx,
      dbUserId,
      artistName as string,
      venue as string,
      concertDate as Date,
      null,
      null,
      null
    );
    return;
  }

  // --- URL (optional) ---
  const url = await ask(conversation, ctx, "🔗 Add a URL:", validateConcertInput.url, {
    optional: true,
    showFinish: true,
    showCancel: true,
  });

  if (url === "CANCEL") return;
  if (url === "FINISH") {
    // Save with fields collected so far
    await saveConcert(
      conversation,
      ctx,
      dbUserId,
      artistName as string,
      venue as string,
      concertDate as Date,
      concertTime as string | null,
      null,
      null
    );
    return;
  }

  // --- Notes (optional) ---
  const notes = await ask(conversation, ctx, "📝 Any notes?", validateConcertInput.notes, {
    optional: true,
    showFinish: true,
    showCancel: true,
  });

  if (notes === "CANCEL") return;
  if (notes === "FINISH") {
    // Save with all fields except notes
    await saveConcert(
      conversation,
      ctx,
      dbUserId,
      artistName as string,
      venue as string,
      concertDate as Date,
      concertTime as string | null,
      url as string | null,
      null
    );
    return;
  }

  // --- Save concert with all fields ---
  await saveConcert(
    conversation,
    ctx,
    dbUserId,
    artistName as string,
    venue as string,
    concertDate as Date,
    concertTime as string | null,
    url as string | null,
    notes as string | null
  );
};
