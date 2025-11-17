import { InlineKeyboard } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";
import { Concert } from "@prisma/client";
import { prisma } from "../config/db";

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

export const canDeleteConcert = (
  userRole: string,
  concertOwnerId: number,
  currentUserId: number
) => {
  switch (userRole) {
    case "SuperAdmin":
      return true; // supergod
    case "Admin":
      return true; // can delete anything
    case "Moderator":
      return concertOwnerId === currentUserId; // only own
    case "User":
    default:
      return concertOwnerId === currentUserId; // only own
  }
};

export const canEditConcert = (concert: Concert, userId: number, role: string) => {
  switch (role) {
    case "Admin":
      return true; // Admin can edit everything
    case "Moderator":
      return true; // Moderator can edit everything too
    case "User":
      return concert.userId === userId; // Only own concerts
    default:
      return false;
  }
};

export const getUserByTelegramId = (userId: number) => {
  return prisma.user.findUnique({
    where: { telegramId: userId },
  });
};
