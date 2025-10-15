import { Conversation } from "@grammyjs/conversations";
import { InlineKeyboard } from "grammy";
import { prisma } from "@/config/db";
import { Concert } from "@/generated/prisma";
import { BotContext } from "@/types/global";

export const deleteConcertConversation = async (
  conversation: Conversation<BotContext>,
  ctx: BotContext,
  { dbUserId }: { dbUserId: number }
) => {
  // 1. Fetch user's upcoming concerts
  const concerts = await prisma.concert.findMany({
    where: {
      userId: dbUserId,
      concertDate: { gte: new Date() },
    },
    orderBy: [{ concertDate: "asc" }, { concertTime: "asc" }],
  });

  if (concerts.length === 0) {
    await ctx.reply("🎶 You have no upcoming concerts to delete.");
    return;
  }

  // 2. Build numbered list
  let message = "🎟 Select the concert you want to delete:\n\n";
  concerts.forEach((c: Concert, i: number) => {
    message += `${i + 1}. ${c.artistName} – ${c.venue} (${c.concertDate.toDateString()})\n`;
  });
  message += `\n0. Cancel`;

  await ctx.reply(message);
  await ctx.reply("Please send the number of the concert you want to delete:");

  // 3. Wait for user input
  const { message: reply } = await conversation.wait();
  const input = reply?.text?.trim();

  if (!input) {
    await ctx.reply("❌ Invalid input. Please try again with /delete_concert.");
    return;
  }

  // 4. Handle cancel
  if (input === "0") {
    await ctx.reply("❌ Deletion cancelled.");
    return;
  }

  // 5. Parse number and validate
  const index = Number(input) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= concerts.length) {
    await ctx.reply("❌ Invalid number. Please try again with /delete_concert.");
    return;
  }

  const selected = concerts[index];

  // 6. Ask for confirmation
  const keyboard = new InlineKeyboard()
    .text("✅ Yes", `confirm_delete:${selected.id}`)
    .text("❌ No", "cancel_delete");

  await ctx.reply(`Are you sure you want to delete *${selected.artistName} – ${selected.venue}*?`, {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  // 7. Wait for callback
  const callback = await conversation.waitForCallbackQuery(/confirm_delete|cancel_delete/);

  if (callback.match?.[0] === "cancel_delete") {
    await callback.answerCallbackQuery({ text: "❌ Deletion cancelled." });
    await ctx.reply("❌ Deletion cancelled.");
    return;
  }

  // 8. Delete concert
  await prisma.concert.delete({ where: { id: selected.id } });
  await callback.answerCallbackQuery({ text: "Concert deleted!" });

  await ctx.reply(`🗑️ Deleted *${selected.artistName} – ${selected.venue}*`, {
    parse_mode: "Markdown",
  });
};
