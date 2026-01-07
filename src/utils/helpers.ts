import { InlineKeyboard } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";
import { Concert } from "@prisma/client";
import { prisma } from "../config/db";

interface AskOptions {
  optional?: boolean;
  showFinish?: boolean;
  showCancel?: boolean;
}

export async function ask<T = string>(
  conversation: Conversation,
  ctx: Context,
  question: string,
  validate: (input: string) => T | string | null,
  options: AskOptions = {}
): Promise<T | null | "FINISH" | "CANCEL"> {
  const { optional = false, showFinish = false, showCancel = false } = options;

  // Build keyboard based on options
  let keyboard: InlineKeyboard | undefined;
  if (optional || showFinish || showCancel) {
    keyboard = new InlineKeyboard();
    if (optional) {
      keyboard.text("➡️ Skip", "skip");
    }
    if (showFinish) {
      keyboard.text("✅ Finish", "finish");
    }
    if (showCancel) {
      keyboard.text("❌ Cancel", "cancel");
    }
  }

  await ctx.reply(question, keyboard ? { reply_markup: keyboard } : undefined);

  while (true) {
    const update = await conversation.wait();

    // Handle callback query
    if ("callbackQuery" in update) {
      const data = update.callbackQuery?.data;
      if (data === "skip" || data === "finish" || data === "cancel") {
        try {
          if (update.callbackQuery) {
            await ctx.api.answerCallbackQuery(update.callbackQuery.id);
          }
        } catch {
          // Ignore
        }

        if (data === "skip") {
          await ctx.reply("⏭️ Skipped.");
          return null;
        } else if (data === "finish") {
          await ctx.reply("✅ Finishing up...");
          return "FINISH";
        } else if (data === "cancel") {
          await ctx.reply("❌ Concert creation cancelled.");
          return "CANCEL";
        }
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

    await ctx.reply("❌ Unexpected input. Reply with text or use the buttons.");
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
