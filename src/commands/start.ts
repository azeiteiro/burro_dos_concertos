import { Context } from "grammy";
import { prisma } from "../config/db";
import logger from "#/config/logger";

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

  // Fetch profile photo from Telegram
  let profilePhotoUrl: string | null = null;
  try {
    const photos = await ctx.api.getUserProfilePhotos(telegramId!, { limit: 1 });
    if (photos.photos && photos.photos.length > 0) {
      const photo = photos.photos[0];
      const smallestPhoto = photo[0];
      if (smallestPhoto) {
        const file = await ctx.api.getFile(smallestPhoto.file_id);
        if (file.file_path) {
          profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
        }
      }
    }
  } catch (error) {
    logger.error({ error, telegramId }, "Failed to fetch profile photo during registration");
    // Continue with registration even if photo fetch fails
  }

  await prisma.user.create({
    data: {
      telegramId: telegramId!,
      username,
      firstName,
      lastName,
      profilePhotoUrl,
    },
  });

  await ctx.reply(`Welcome, ${firstName}! You have been registered successfully.`);
};

export default startCommand;
