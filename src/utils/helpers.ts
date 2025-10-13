import { InlineKeyboard } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";

interface AskOptions {
  optional?: boolean;
}

export async function ask<T = string>(
  conversation: Conversation,
  ctx: Context,
  question: string,
  validate: (input: string) => T | string | null,
  options: AskOptions = {}
): Promise<T | null> {
  const { optional = false } = options;

  await ctx.reply(
    question,
    optional ? { reply_markup: new InlineKeyboard().text("➡️ Skip", "skip") } : undefined
  );

  while (true) {
    const update = await conversation.wait();

    // Handle callback query
    if ("callbackQuery" in update) {
      const data = update.callbackQuery?.data;
      if (data === "skip") {
        try {
          if (update.callbackQuery) {
            await ctx.api.answerCallbackQuery(update.callbackQuery.id);
          }
        } catch {
          // Ignore
        }
        await ctx.reply("⏭️ Skipped.");
        return null;
      }
    }

    // Handle message text
    if ("message" in update && typeof update.message?.text === "string") {
      const input = update.message.text.trim();
      const result = validate(input);
      if (typeof result === "string" && result.startsWith("❌")) {
        await ctx.reply(result);
        continue;
      }
      return result as T | null;
    }

    await ctx.reply("❌ Unexpected input. Reply with text or Skip.");
  }
}
