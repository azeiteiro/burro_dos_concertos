import { Conversation } from "@grammyjs/conversations";
import { Context, InlineKeyboard } from "grammy";
import { prisma } from "@/config/db";
import { Concert } from "@prisma/client";
import { ask, canEditConcert } from "@/utils/helpers";
import { validateConcertInput } from "@/utils/validators";
import { logAction } from "@/utils/logger";

export const editConcertConversation = async (
  conversation: Conversation,
  ctx: Context,
  { dbUserId, userRole }: { dbUserId: number; userRole: string }
) => {
  // Step 1: Fetch all concerts (future-proof for mods/admins)
  const concerts: Concert[] = await prisma.concert.findMany({
    orderBy: [{ concertDate: "desc" }, { concertTime: "desc" }],
  });

  // Step 2: Filter by permissions
  const editableConcerts = concerts.filter((c) => canEditConcert(c, dbUserId, userRole));

  if (!editableConcerts.length) {
    await ctx.reply("🎵 No concerts you are allowed to edit.");
    return;
  }

  // Step 3: Show numbered list
  let listMsg = "Select the concert to edit:\n\n";
  editableConcerts.forEach((c, i) => {
    const dateStr = c.concertDate?.toISOString().split("T")[0] ?? "no date";
    listMsg += `${i + 1}. ${c.artistName} – ${c.venue} (${dateStr})\n`;
  });
  listMsg += `\n0. Cancel`;

  await ctx.reply(listMsg);
  await ctx.reply("Please send the number of the concert you want to edit:");

  // Step 4: Wait for user selection
  const { message: reply } = await conversation.wait();
  const input = reply?.text?.trim();
  const index = input ? parseInt(input, 10) - 1 : -2;

  if (input === "0") {
    await ctx.reply("🚫 Edit canceled.");
    return;
  }

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

  logAction(dbUserId, `Edited concert: ${concert.artistName} at ${concert.venue}`);

  await ctx.reply(`✅ ${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
};
