import { BotContext } from "@/types/global";

export const announceCommand = async (ctx: BotContext) => {
  await ctx.conversation.enter("announceConversation");
};
