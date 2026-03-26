import { BotContext } from "#/types/global";
import { fetchAllUserProfilePhotos } from "#/services/profilePhotoService";
import logger from "#/config/logger";

export const syncPhotosCommand = async (ctx: BotContext) => {
  await ctx.reply("🔄 Syncing profile photos for all users...");

  try {
    const result = await fetchAllUserProfilePhotos(ctx.api);

    const total = result.success + result.failed;
    let message = `✅ Sync complete! Success: ${result.success}/${total}`;

    if (result.failed > 0) {
      message += `\n\n⚠️ Failed users:\n`;
      result.errors.forEach((error) => {
        message += `• ${error}\n`;
      });
    }

    await ctx.reply(message);
  } catch (error) {
    logger.error("Sync photos command error:", error);
    await ctx.reply(`❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
