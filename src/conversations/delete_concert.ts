import { Conversation } from "@grammyjs/conversations";
import { InlineKeyboard } from "grammy";
import { prisma } from "@/config/db";

import { BotContext } from "@/types/global";
import { logAction } from "@/utils/logger";
import { canDeleteConcert } from "@/utils/helpers";
import { Concert } from "@prisma/client";

export const deleteConcertConversation = async (
  conversation: Conversation<BotContext>,
  ctx: BotContext,
  { dbUserId, userRole }: { dbUserId: number; userRole: string }
) => {
  // 1. Fetch upcoming concerts
  const concerts = await prisma.concert.findMany({
    where: {
      concertDate: { gte: new Date() },
    },
    orderBy: [{ concertDate: "asc" }, { concertTime: "asc" }],
  });

  // 2. Filter by permissions
  const deletableConcerts = concerts.filter((c) => canDeleteConcert(userRole, c.userId, dbUserId));

  if (deletableConcerts.length === 0) {
    await ctx.reply("🎶 No upcoming concerts you are allowed to delete.");
    return;
  }

  // 3. Build numbered list
  let message = "🎟 Select the concert you want to delete:\n\n";
  deletableConcerts.forEach((c: Concert, i: number) => {
    message += `${i + 1}. ${c.artistName} – ${c.venue} (${c.concertDate.toDateString()})\n`;
  });

  await ctx.reply(message);

  const cancelKeyboard = new InlineKeyboard().text("❌ Cancel", "cancel_delete_select");
  await ctx.reply("Please send the number of the concert you want to delete:", {
    reply_markup: cancelKeyboard,
  });

  // 4. Wait for user input
  const update = await conversation.wait();

  // Handle cancel button
  if ("callbackQuery" in update) {
    const data = update.callbackQuery?.data;
    if (data === "cancel_delete_select") {
      try {
        if (update.callbackQuery) {
          await ctx.api.answerCallbackQuery(update.callbackQuery.id);
        }
      } catch {
        // Ignore
      }
      await ctx.reply("❌ Deletion cancelled.");
      return;
    }
  }

  // Handle number input
  if (!("message" in update) || typeof update.message?.text !== "string") {
    await ctx.reply("❌ Invalid input. Please try again with /delete_concert.");
    return;
  }

  const input = update.message.text.trim();
  const index = Number(input) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= deletableConcerts.length) {
    await ctx.reply("❌ Invalid number. Please try again with /delete_concert.");
    return;
  }

  const selected = deletableConcerts[index];

  // 7. Ask for confirmation
  const keyboard = new InlineKeyboard()
    .text("✅ Yes", `confirm_delete:${selected.id}`)
    .text("❌ No", "cancel_delete");

  await ctx.reply(`Are you sure you want to delete *${selected.artistName} – ${selected.venue}*?`, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  // 8. Wait for callback
  const callback = await conversation.waitForCallbackQuery(/confirm_delete|cancel_delete/);

  if (callback.match?.[0] === "cancel_delete") {
    await callback.answerCallbackQuery({ text: "❌ Deletion cancelled." });
    await ctx.reply("❌ Deletion cancelled.");
    return;
  }

  // 9. Delete concert
  await prisma.concert.delete({ where: { id: selected.id } });
  await callback.answerCallbackQuery({ text: "Concert deleted!" });

  logAction(dbUserId, `Deleted concert: ${selected.artistName} at ${selected.venue}`);

  await ctx.reply(`🗑️ Deleted *${selected.artistName} – ${selected.venue}*`, {
    parse_mode: "Markdown",
  });
};
