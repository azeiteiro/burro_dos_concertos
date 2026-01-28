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
  {
    dbUserId,
    prefillData,
  }: {
    dbUserId: number;
    prefillData?: {
      artist?: string;
      venue?: string;
      date?: string;
      url?: string;
    };
  }
) => {
  // Check if we have prefilled data from URL
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
      // Parse the date to show it nicely
      const date = new Date(prefillData.date);
      const dateStr = format(date, "yyyy-MM-dd");

      // Check if there's time information
      const hours = date.getHours();
      const minutes = date.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        previewMessage += `📅 <b>Date:</b> ${dateStr}\n`;
        previewMessage += `⏰ <b>Time:</b> ${timeStr}\n`;
      } else {
        previewMessage += `📅 <b>Date:</b> ${dateStr}\n`;
      }
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
      // Prefill data cleared (passed as parameter, no session cleanup needed)
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (response === "yes") {
      // Use prefilled data
      artistName = prefillData?.artist || null;
      venue = prefillData?.venue || null;
      url = prefillData?.url || null;

      // Parse date and time if available
      if (prefillData?.date) {
        const dateResult = validateConcertInput.date(prefillData.date);
        if (dateResult instanceof Date) {
          concertDate = dateResult;

          // Check if the date string includes time (ISO format with time component)
          // If time is not 00:00, extract it
          const hours = dateResult.getHours();
          const minutes = dateResult.getMinutes();
          if (hours !== 0 || minutes !== 0) {
            // Format as HH:mm
            concertTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
          }
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
          // Prefill data cleared (passed as parameter, no session cleanup needed)
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
          // Prefill data cleared (passed as parameter, no session cleanup needed)
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
          // Prefill data cleared (passed as parameter, no session cleanup needed)
          return;
        }
      } else {
        await ctx.reply(`✅ Date: ${format(concertDate as Date, "yyyy-MM-dd")}`);
      }

      // Optional fields - time
      if (concertTime) {
        // Time was already extracted from the date
        await ctx.reply(`✅ Time: ${concertTime}`);
      } else {
        concertTime = await ask(
          conversation,
          ctx,
          "⏰ Enter concert time (HH:mm) or skip:",
          validateConcertInput.time,
          { optional: true, showFinish: true, showCancel: true }
        );

        if (concertTime === "CANCEL") {
          // Prefill data cleared (passed as parameter, no session cleanup needed)
          return;
        }
      }

      // Ask for notes
      if (concertTime !== "FINISH") {
        notes = await ask(conversation, ctx, "📝 Any notes?", validateConcertInput.notes, {
          optional: true,
          showFinish: true,
          showCancel: true,
        });

        if (notes === "CANCEL") {
          // Prefill data cleared (passed as parameter, no session cleanup needed)
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

      // Prefill data cleared (passed as parameter, no session cleanup needed)
      return;
    }

    // If user said "edit" or anything else, let them modify the fields
    await ctx.reply(
      "✏️ Let's review each field. Type 'keep' to use the current value or enter a new one."
    );
  }

  // --- Normal flow (no prefill or user wants to edit) ---

  // --- Artist ---
  if (prefillData?.artist && hasPrefill) {
    await ctx.reply(
      `🎤 <b>Current artist:</b> ${prefillData.artist}\n\nType 'keep' to use this, or enter a new artist name:`,
      { parse_mode: "HTML" }
    );
    const artistResponse = await conversation.wait();
    const artistInput = artistResponse.message?.text?.trim().toLowerCase();

    if (artistInput === "cancel") {
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (artistInput === "keep") {
      artistName = prefillData.artist;
      await ctx.reply(`✅ Keeping: ${prefillData.artist}`);
    } else {
      const validated = validateConcertInput.name(artistResponse.message?.text || "");
      if (typeof validated === "string" && !validated.startsWith("❌")) {
        artistName = validated;
      } else {
        await ctx.reply(validated as string);
        return;
      }
    }
  } else {
    artistName = await ask(conversation, ctx, "🎤 Who is the artist?", validateConcertInput.name, {
      showCancel: true,
    });

    if (artistName === "CANCEL") {
      return;
    }
  }

  // --- Venue ---
  if (prefillData?.venue && hasPrefill) {
    await ctx.reply(
      `🏟️ <b>Current venue:</b> ${prefillData.venue}\n\nType 'keep' to use this, or enter a new venue:`,
      { parse_mode: "HTML" }
    );
    const venueResponse = await conversation.wait();
    const venueInput = venueResponse.message?.text?.trim().toLowerCase();

    if (venueInput === "cancel") {
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (venueInput === "keep") {
      venue = prefillData.venue;
      await ctx.reply(`✅ Keeping: ${prefillData.venue}`);
    } else {
      const validated = validateConcertInput.location(venueResponse.message?.text || "");
      if (typeof validated === "string" && !validated.startsWith("❌")) {
        venue = validated;
      } else {
        await ctx.reply(validated as string);
        return;
      }
    }
  } else {
    venue = await ask(
      conversation,
      ctx,
      "🏟️ Where is the concert?",
      validateConcertInput.location,
      {
        showCancel: true,
      }
    );

    if (venue === "CANCEL") {
      return;
    }
  }

  // --- Date ---
  if (prefillData?.date && hasPrefill) {
    const date = new Date(prefillData.date);
    const dateStr = format(date, "yyyy-MM-dd");

    await ctx.reply(
      `📅 <b>Current date:</b> ${dateStr}\n\nType 'keep' to use this, or enter a new date:`,
      { parse_mode: "HTML" }
    );
    const dateResponse = await conversation.wait();
    const dateInput = dateResponse.message?.text?.trim().toLowerCase();

    if (dateInput === "cancel") {
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (dateInput === "keep") {
      concertDate = date;
      await ctx.reply(`✅ Keeping: ${dateStr}`);

      // Also extract time if present
      const hours = date.getHours();
      const minutes = date.getMinutes();
      if (hours !== 0 || minutes !== 0) {
        concertTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      }
    } else {
      const validated = validateConcertInput.date(dateResponse.message?.text || "");
      if (validated instanceof Date) {
        concertDate = validated;
      } else {
        await ctx.reply(validated as string);
        return;
      }
    }
  } else {
    concertDate = await ask(
      conversation,
      ctx,
      "📅 Enter concert date (YYYY-MM-DD or natural language like 'next Friday'):",
      validateConcertInput.date,
      { showCancel: true }
    );

    if (concertDate === "CANCEL") {
      return;
    }
  }

  await ctx.reply(`✅ Date accepted: ${format(concertDate as Date, "yyyy-MM-dd")}`);

  // --- Time (optional) ---
  // Check if time was already extracted or if we're in edit mode with prefilled time
  if (concertTime && hasPrefill) {
    await ctx.reply(
      `⏰ <b>Current time:</b> ${concertTime}\n\nType 'keep' to use this, 'skip' to remove, or enter a new time:`,
      { parse_mode: "HTML" }
    );
    const timeResponse = await conversation.wait();
    const timeInput = timeResponse.message?.text?.trim().toLowerCase();

    if (timeInput === "cancel") {
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (timeInput === "keep") {
      await ctx.reply(`✅ Keeping: ${concertTime}`);
      // concertTime already set
    } else if (timeInput === "skip") {
      concertTime = null;
      await ctx.reply("⏭️ Time skipped.");
    } else {
      const validated = validateConcertInput.time(timeResponse.message?.text || "");
      if (validated === null || (typeof validated === "string" && !validated.startsWith("❌"))) {
        concertTime = validated;
      } else {
        await ctx.reply(validated as string);
        return;
      }
    }
  } else {
    concertTime = await ask(
      conversation,
      ctx,
      "⏰ Enter concert time (HH:mm) or skip:",
      validateConcertInput.time,
      { optional: true, showFinish: true, showCancel: true }
    );

    if (concertTime === "CANCEL") {
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
  }

  // --- URL (optional) ---
  if (prefillData?.url && hasPrefill) {
    await ctx.reply(
      `🔗 <b>Current URL:</b> <a href="${prefillData.url}">${prefillData.url}</a>\n\nType 'keep' to use this, 'skip' to remove, or enter a new URL:`,
      { parse_mode: "HTML", disable_web_page_preview: true }
    );
    const urlResponse = await conversation.wait();
    const urlInput = urlResponse.message?.text?.trim().toLowerCase();

    if (urlInput === "cancel") {
      await ctx.reply("❌ Cancelled.");
      return;
    }

    if (urlInput === "keep") {
      url = prefillData.url;
      await ctx.reply("✅ Keeping URL");
    } else if (urlInput === "skip") {
      url = null;
      await ctx.reply("⏭️ URL skipped.");
    } else {
      const validated = validateConcertInput.url(urlResponse.message?.text || "");
      if (validated === null || (typeof validated === "string" && !validated.startsWith("❌"))) {
        url = validated;
      } else {
        await ctx.reply(validated as string);
        return;
      }
    }
  } else {
    url = await ask(conversation, ctx, "🔗 Add a URL:", validateConcertInput.url, {
      optional: true,
      showFinish: true,
      showCancel: true,
    });

    if (url === "CANCEL") {
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
      return;
    }
  }

  // --- Notes (optional) ---
  // We skip offering the description as notes since it's usually marketing text
  // and we already have the URL stored
  notes = await ask(conversation, ctx, "📝 Any notes?", validateConcertInput.notes, {
    optional: true,
    showFinish: true,
    showCancel: true,
  });

  if (notes === "CANCEL") {
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
  // Prefill data cleared (passed as parameter, no session cleanup needed)
};
