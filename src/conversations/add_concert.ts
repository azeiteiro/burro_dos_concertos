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

  let artistName: string | Date | "CANCEL" | "FINISH" | null = null;
  let venue: string | Date | "CANCEL" | "FINISH" | null = null;
  let concertDate: string | Date | "CANCEL" | "FINISH" | null = null;
  let concertTime: string | Date | "CANCEL" | "FINISH" | null = null;
  let url: string | Date | "CANCEL" | "FINISH" | null = null;
  let notes: string | Date | "CANCEL" | "FINISH" | null = null;

  if (hasPrefill) {
    // Show all extracted information at once
    let previewMessage = "🎵 <b>Concert Information Detected:</b>\n\n";

    if (prefillData?.artist) {
      previewMessage += `🎤 <b>Artist:</b> ${prefillData.artist}\n`;
    }
    if (prefillData?.venue) {
      previewMessage += `🏟️ <b>Venue:</b> ${prefillData.venue}\n`;
    }
    if (prefillData?.date) {
      previewMessage += `📅 <b>Date:</b> ${prefillData.date}\n`;
    }
    if (prefillData?.url) {
      previewMessage += `🔗 <b>Link:</b> <a href="${prefillData.url}">View</a>\n`;
    }

    previewMessage += "\n<i>Reply 'yes' to confirm or 'edit' to modify the information.</i>";

    await ctx.reply(previewMessage, { parse_mode: "HTML", disable_web_page_preview: true });

    // Wait for confirmation
    const confirmCtx = await conversation.wait();
    const response = confirmCtx.message?.text?.toLowerCase().trim();

    if (response === "cancel") {
      ctx.session.prefillData = undefined;
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (response === "yes") {
      // Use prefilled data
      artistName = prefillData?.artist || null;
      venue = prefillData?.venue || null;
      url = prefillData?.url || null;

      // Parse date if available
      if (prefillData?.date) {
        const dateResult = validateConcertInput.date(prefillData.date);
        if (dateResult instanceof Date) {
          concertDate = dateResult;
        }
      }

      // Ask only for missing required fields
      if (!artistName) {
        artistName = await ask(
          conversation,
          ctx,
          "🎤 Who is the artist?",
          validateConcertInput.name,
          { showCancel: true }
        );
        if (artistName === "CANCEL") {
          ctx.session.prefillData = undefined;
          return;
        }
      }

      if (!venue) {
        venue = await ask(
          conversation,
          ctx,
          "🏟️ Where is the concert?",
          validateConcertInput.location,
          { showCancel: true }
        );
        if (venue === "CANCEL") {
          ctx.session.prefillData = undefined;
          return;
        }
      }

      if (!concertDate) {
        concertDate = await ask(
          conversation,
          ctx,
          "📅 Enter concert date (YYYY-MM-DD or natural language like 'next Friday'):",
          validateConcertInput.date,
          { showCancel: true }
        );
        if (concertDate === "CANCEL") {
          ctx.session.prefillData = undefined;
          return;
        }
      } else {
        await ctx.reply(`✅ Date: ${format(concertDate as Date, "yyyy-MM-dd")}`);
      }

      // Optional fields
      concertTime = await ask(
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

      if (concertTime !== "FINISH") {
        notes = await ask(conversation, ctx, "📝 Any notes?", validateConcertInput.notes, {
          optional: true,
          showFinish: true,
          showCancel: true,
        });

        if (notes === "CANCEL") {
          ctx.session.prefillData = undefined;
          return;
        }
      }

      // Save concert
      await saveConcert(
        conversation,
        ctx,
        dbUserId,
        artistName as string,
        venue as string,
        concertDate as Date,
        concertTime === "FINISH" ? null : (concertTime as string | null),
        url as string | null,
        notes === "FINISH" ? null : (notes as string | null)
      );

      ctx.session.prefillData = undefined;
      return;
    }

    // If user said "edit" or anything else, continue with normal flow
    await ctx.reply("✏️ Let's go through the information step by step.");
  }

  // --- Normal flow (no prefill or user wants to edit) ---

  // --- Artist ---
  artistName = await ask(conversation, ctx, "🎤 Who is the artist?", validateConcertInput.name, {
    showCancel: true,
  });

  if (artistName === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }

  // --- Venue ---
  venue = await ask(conversation, ctx, "🏟️ Where is the concert?", validateConcertInput.location, {
    showCancel: true,
  });

  if (venue === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }

  // --- Date ---
  concertDate = await ask(
    conversation,
    ctx,
    "📅 Enter concert date (YYYY-MM-DD or natural language like 'next Friday'):",
    validateConcertInput.date,
    { showCancel: true }
  );

  if (concertDate === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
  }

  await ctx.reply(`✅ Date accepted: ${format(concertDate as Date, "yyyy-MM-dd")}`);

  // --- Time (optional) ---
  concertTime = await ask(
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
    ctx.session.prefillData = undefined;
    return;
  }

  // --- URL (optional) ---
  url = await ask(conversation, ctx, "🔗 Add a URL:", validateConcertInput.url, {
    optional: true,
    showFinish: true,
    showCancel: true,
  });

  if (url === "CANCEL") {
    ctx.session.prefillData = undefined;
    return;
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
    ctx.session.prefillData = undefined;
    return;
  }

  // --- Notes (optional) ---
  notes = await ask(conversation, ctx, "📝 Any notes?", validateConcertInput.notes, {
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
    ctx.session.prefillData = undefined;
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
