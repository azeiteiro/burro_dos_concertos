import { findOrCreateUser } from "@/utils/user";
import { BotContext } from "@/types/global";

export const editConcertCommand = async (ctx: BotContext) => {
  const tgUser = ctx.from;

  if (!tgUser) {
    await ctx.reply("❌ Could not identify user.");
    return;
  }

  const user = await findOrCreateUser(tgUser);

  await ctx.conversation.enter("editConcertConversation", { dbUserId: user.id });
};
