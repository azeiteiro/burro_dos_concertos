import { BotContext } from "@/types/global";
import { findOrCreateUser } from "@/utils/user";

export const deleteConcertCommand = async (ctx: BotContext) => {
  const tgUser = ctx.from;

  if (!tgUser) {
    await ctx.reply("❌ Could not identify user.");
    return;
  }

  const user = await findOrCreateUser(tgUser);

  await ctx.conversation.enter("deleteConcertConversation", {
    dbUserId: user.id,
    userRole: user.role,
  });
};
