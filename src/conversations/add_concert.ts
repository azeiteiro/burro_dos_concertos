import { Conversation } from "@grammyjs/conversations";
import { validateConcertInput } from "@/utils/validators";
import { ask } from "@/utils/helpers";
import { format, parseISO } from "date-fns";
import { prisma } from "@/config/db";
import { logAction } from "@/utils/logger";
import { notifyNewConcert } from "@/notifications/helpers";
import { BotContext } from "@/types/global";

// Helper function to save concert
async function saveConcert(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
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
  conversation: Conversation<BotContext>,
  ctx: BotContext,
  { dbUserId }: { dbUserId: number }
) => {
  // Check if we have prefilled data from a URL
  const prefillData = ctx.session?.prefillData;
  const hasPrefill = prefillData && Object.keys(prefillData).length > 0;

  if (hasPrefill) {
    await ctx.reply(
      "📝 I've pre-filled some information from the link. You can edit or confirm each field."
    );
  }

  // --- Artist ---
  let artistName: string | Date | "CANCEL" | "FINISH" | null = null;

  if (prefillData?.artist) {
    await ctx.reply(
      `🎤 Detected artist: <b>${prefillData.artist}</b>\n\nConfirm or type a different artist name:`,
      { parse_mode: "HTML" }
    );
  }

  artistName = await ask(
    conversation,
    ctx,
    prefillData?.artist ? "🎤 Artist:" : "🎤 Who is the artist?",
    validateConcertInput.name,
    { showCancel: true }
  );

  if (artistName === "CANCEL") {
    // Clear prefill data on cancel
    ctx.session.prefillData = undefined;
    return;
  }

  // --- Venue ---
  let venue: string | Date | "CANCEL" | "FINISH" | null = null;

  if (prefillData?.venue) {
    await ctx.reply(
      `🏟️ Detected venue: <b>${prefillData.venue}</b>\n\nConfirm or type a different venue:`,
      { parse_mode: "HTML" }
    );
  }

  venue = await ask(
    conversation,
    ctx,
    prefillData?.venue ? "🏟️ Venue:" : "🏟️ Where is the concert?",
    validateConcertInput.location,
    { showCancel: true }
  );

  if (venue === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }

  // --- Date ---
  let concertDate: string | Date | "CANCEL" | "FINISH" | null = null;

  if (prefillData?.date) {
    await ctx.reply(
      `📅 Detected date: <b>${prefillData.date}</b>\n\nConfirm or type a different date:`,
      { parse_mode: "HTML" }
    );
  }

  concertDate = await ask(
    conversation,
    ctx,
    prefillData?.date
      ? "📅 Date (YYYY-MM-DD or natural language):"
      : "📅 Enter concert date (YYYY-MM-DD or natural language like 'next Friday'):",
    validateConcertInput.date,
    { showCancel: true }
  );

  if (concertDate === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }

  await ctx.reply(`✅ Date accepted: ${format(concertDate as Date, "yyyy-MM-dd")}`);

  // --- Time (optional) ---
  const concertTime = await ask(
    conversation,
    ctx,
    "⏰ Enter concert time (HH:mm) or skip:",
    validateConcertInput.time,
    { optional: true, showFinish: true, showCancel: true }
  );

  if (concertTime === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }
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
  let url: string | Date | "CANCEL" | "FINISH" | null = null;

  // If we have a prefilled URL, skip asking and use it
  if (prefillData?.url) {
    await ctx.reply(`🔗 Using URL from link: ${prefillData.url}`);
    url = prefillData.url;
  } else {
    url = await ask(conversation, ctx, "🔗 Add a URL:", validateConcertInput.url, {
      optional: true,
      showFinish: true,
      showCancel: true,
    });

    if (url === "CANCEL") {
      ctx.session.prefillData = undefined;
      return;
    }
  }
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

  if (notes === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }
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

  // Clear prefill data after successful save
  ctx.session.prefillData = undefined;
};
