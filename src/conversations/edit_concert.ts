import { Conversation } from "@grammyjs/conversations";
import { Context, InlineKeyboard } from "grammy";
import { prisma } from "#/config/db";
import { Concert } from "@prisma/client";
import { ask, canEditConcert } from "#/utils/helpers";
import { validateConcertInput } from "#/utils/validators";
import { logAction } from "#/utils/logger";
import { updateConcertArtistImage } from "#/services/artistImageService";

export const editConcertConversation = async (
  conversation: Conversation,
  ctx: Context,
  { dbUserId, userRole }: { dbUserId: number; userRole: string }
) => {
  // Step 1: Fetch upcoming concerts only
  const concerts: Concert[] = await prisma.concert.findMany({
    where: {
      concertDate: { gte: new Date() },
    },
    orderBy: [{ concertDate: "asc" }, { concertTime: "asc" }],
  });

  // Step 2: Filter by permissions
  const editableConcerts = concerts.filter((c) => canEditConcert(c, dbUserId, userRole));

  if (!editableConcerts.length) {
    await ctx.reply("🎵 No upcoming concerts you are allowed to edit.");
    return;
  }

  // Step 3: Show numbered list
  let listMsg = "Select the concert to edit:\n\n";
  editableConcerts.forEach((c, i) => {
    const dateStr = c.concertDate?.toISOString().split("T")[0] ?? "no date";
    listMsg += `${i + 1}. ${c.artistName} – ${c.venue} (${dateStr})\n`;
  });

  await ctx.reply(listMsg);

  const cancelKeyboard = new InlineKeyboard().text("❌ Cancel", "cancel_edit");
  await ctx.reply("Please send the number of the concert you want to edit:", {
    reply_markup: cancelKeyboard,
  });

  // Step 4: Wait for user selection
  const update = await conversation.wait();

  // Handle cancel button
  if ("callbackQuery" in update) {
    const data = update.callbackQuery?.data;
    if (data === "cancel_edit") {
      try {
        if (update.callbackQuery) {
          await ctx.api.answerCallbackQuery(update.callbackQuery.id);
        }
      } catch {
        // Ignore
      }
      await ctx.reply("🚫 Edit canceled.");
      return;
    }
  }

  // Handle number input
  if (!("message" in update) || typeof update.message?.text !== "string") {
    await ctx.reply("❌ Invalid input. Edit canceled.");
    return;
  }

  const input = update.message.text.trim();
  const index = parseInt(input, 10) - 1;

  if (isNaN(index) || index < 0 || index >= editableConcerts.length) {
    await ctx.reply("❌ Invalid number. Edit canceled.");
    return;
  }

  const concert = editableConcerts[index];

  // Step 5: Show editable fields
  const editKeyboard = new InlineKeyboard()
    .text("📝 Artist", "artist")
    .text("📍 Venue", "venue")
    .text("🌐 URL", "url")
    .row()
    .text("📅 Date", "date")
    .text("⏰ Time", "time")
    .text("🗒️ Notes", "notes")
    .row()
    .text("🚫 Cancel", "cancel");

  await ctx.reply(`Editing *${concert.artistName}*\n\nSelect a field to edit:`, {
    parse_mode: "Markdown",
    reply_markup: editKeyboard,
  });

  const fieldChoice = await conversation.waitForCallbackQuery([
    "artist",
    "venue",
    "date",
    "time",
    "url",
    "notes",
    "cancel",
  ]);

  const field = fieldChoice.update.callback_query?.data;

  if (field === "cancel") {
    await ctx.reply("🚫 Edit canceled.");
    return;
  }

  // Step 6: Ask for new value
  let newValue: string | Date | null = null;
  switch (field) {
    case "artist":
      newValue = await ask(
        conversation,
        ctx,
        "✏️ Send the new artist name:",
        validateConcertInput.name
      );
      break;
    case "venue":
      newValue = await ask(
        conversation,
        ctx,
        "📍 Send the new venue:",
        validateConcertInput.location
      );
      break;
    case "date":
      newValue = await ask(
        conversation,
        ctx,
        "📅 Send the new date (YYYY-MM-DD or natural language):",
        validateConcertInput.date
      );
      break;
    case "time":
      newValue = await ask(
        conversation,
        ctx,
        "⏰ Send the new time (HH:mm) or skip:",
        validateConcertInput.time,
        { optional: true }
      );
      break;
    case "url":
      newValue = await ask(
        conversation,
        ctx,
        "🌐 Send the new URL (or type skip):",
        validateConcertInput.url,
        { optional: true }
      );
      break;
    case "notes":
      newValue = await ask(
        conversation,
        ctx,
        "🗒️ Send new notes (max 500 chars) or skip:",
        validateConcertInput.notes,
        { optional: true }
      );
      break;
  }

  if (newValue === null) {
    await ctx.reply("⏭️ Skipped editing this field.");
    return;
  }

  // Step 7: Update concert in DB
  const updateData: Partial<Concert> = {};
  switch (field) {
    case "artist":
      updateData.artistName = newValue as string;
      break;
    case "venue":
      updateData.venue = newValue as string;
      break;
    case "date":
      updateData.concertDate = newValue as Date;
      break;
    case "time":
      updateData.concertTime = newValue ? new Date(`1970-01-01T${newValue}`) : null;
      break;
    case "url":
      updateData.url = newValue as string | null;
      break;
    case "notes":
      updateData.notes = newValue as string | null;
      break;
  }

  await prisma.concert.update({
    where: { id: concert.id },
    data: updateData,
  });

  // Re-fetch artist image if artist name changed (always re-fetch on edit)
  try {
    // Clear existing image data first
    await prisma.concert.update({
      where: { id: concert.id },
      data: {
        artistImageUrl: null,
        spotifyArtistId: null,
      },
    });

    // Fetch new image
    await updateConcertArtistImage(concert.id);
  } catch (error) {
    console.warn(`Failed to fetch artist image for concert ${concert.id}:`, error);
    // Don't fail edit if image fetch fails
  }

  logAction(dbUserId, `Edited concert: ${concert.artistName} at ${concert.venue}`);

  await ctx.reply(`✅ ${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
};
