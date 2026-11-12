import { Context } from "grammy";
import { prisma } from "../config/db";
import logger from "#/config/logger";
import { syncUserProfilePhoto } from "#/services/profilePhotoService";

export const startCommand = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || "friend";
  const lastName = ctx.from?.last_name || null;
  const username = ctx.from?.username || null;

  const existingUser = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (existingUser) {
    return ctx.reply("You are already registered!");
  }

  const user = await prisma.user.create({
    data: {
      telegramId: telegramId!,
      username,
      firstName,
      lastName,
    },
  });

  await ctx.reply(`Welcome, ${firstName}! You have been registered successfully.`);

  // Upload profile photo to R2 (never store Telegram file URLs, they embed the bot token)
  try {
    await syncUserProfilePhoto(ctx.api, user);
  } catch (error) {
    logger.error({ error, telegramId }, "Failed to sync profile photo during registration");
  }
};

export default startCommand;
