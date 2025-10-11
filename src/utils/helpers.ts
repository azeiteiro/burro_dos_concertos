import { InlineKeyboard } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";

interface AskOptions {
  optional?: boolean;
}

export const askWithConfirmation = async (
  conversation: Conversation,
  ctx: Context,
  question: string,
  suggestion?: string,
  includeSkip = false
): Promise<"yes" | "no" | "skip"> => {
  const keyboard = new InlineKeyboard().text("✅ Yes", "yes").text("❌ No", "no");

  if (includeSkip) {
    keyboard.text("➡️ Skip", "skip");
  }

  const sent = await ctx.reply(suggestion ? `${question}\n\n👉 ${suggestion}` : question, {
    reply_markup: keyboard,
  });

  const response = await conversation.waitForCallbackQuery([
    "yes",
    "no",
    ...(includeSkip ? ["skip"] : []),
  ]);

  await ctx.api.editMessageReplyMarkup(sent.chat.id, sent.message_id, undefined);

  return response.callbackQuery.data as "yes" | "no" | "skip";
};

export async function ask<T = string>(
  conversation: Conversation,
  ctx: Context,
  question: string,
  validate: (input: string) => T | string | null,
  options: AskOptions = {}
): Promise<T | null> {
  const { optional = false } = options;

  while (true) {
    const keyboard = optional ? new InlineKeyboard().text("➡️ Skip", "skip") : undefined;
    await ctx.reply(question, keyboard ? { reply_markup: keyboard } : undefined);

    const raw = await Promise.race([
      conversation.waitFor("message:text"),
      optional ? conversation.waitForCallbackQuery("skip") : new Promise(() => {}),
    ]).catch(() => null);

    if (!raw) continue;

    if ("callbackQuery" in raw && raw.callbackQuery?.data === "skip") {
      try {
        await ctx.api.answerCallbackQuery(raw.callbackQuery.id);
      } catch {
        // Intentionally ignored
      }
      await ctx.reply("⏭️ Skipped.");
      return null;
    }

    if ("message" in raw && typeof raw.message?.text === "string") {
      const input = raw.message.text.trim();
      const result = validate(input);

      // ✅ KEY FIX: errors must start with ❌
      if (typeof result === "string" && result.startsWith("❌")) {
        await ctx.reply(result);
        continue;
      }

      // ✅ return actual value (Date, string, or null)
      return result as T | null;
    }

    await ctx.reply("❌ Unexpected input. Reply with text or Skip.");
  }
}
