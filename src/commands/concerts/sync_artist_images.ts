import { BotContext } from "#/types/global";
import { syncAllArtistImages } from "#/services/artistImageService";
import logger from "#/config/logger";

export const syncArtistImagesCommand = async (ctx: BotContext) => {
  await ctx.reply("🎨 Syncing artist images for all concerts...");

  try {
    const result = await syncAllArtistImages();

    let message = `✅ Sync complete!\n`;
    message += `• Success: ${result.success}\n`;
    message += `• Skipped: ${result.skipped} (already have images)\n`;
    message += `• Failed: ${result.failed}`;

    if (result.failed > 0) {
      message += `\n\n⚠️ Failed concerts:\n`;
      result.errors.forEach((error) => {
        message += `• ${error}\n`;
      });
    }

    await ctx.reply(message);
  } catch (error) {
    logger.error({ error }, "Sync artist images command error");
    await ctx.reply(`❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
