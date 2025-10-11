import { CommandContext, Context } from "grammy";
import { prisma } from "@/config/db";
import { ConversationFlavor } from "@grammyjs/conversations";

export const addConcertCommand = async (ctx: CommandContext<ConversationFlavor<Context>>) => {
  const tgUser = ctx.from;

  if (!tgUser) {
    await ctx.reply("❌ Could not identify user.");
    return;
  }

  // Ensure local DB user exists
  const user = await prisma.user.upsert({
    where: { telegramId: BigInt(tgUser.id) },
    update: {
      username: tgUser.username ?? undefined,
      firstName: tgUser.first_name ?? undefined,
      lastName: tgUser.last_name ?? undefined,
      languageCode: tgUser.language_code ?? undefined,
    },
    create: {
      telegramId: BigInt(tgUser.id),
      username: tgUser.username ?? undefined,
      firstName: tgUser.first_name ?? undefined,
      lastName: tgUser.last_name ?? undefined,
      languageCode: tgUser.language_code ?? undefined,
    },
  });

  await ctx.conversation.enter("addConcertConversation", { dbUserId: user.id });
};
