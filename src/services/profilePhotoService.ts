import { Bot, Api, GrammyError } from "grammy";
import { prisma } from "#/config/db";
import { User } from "@prisma/client";
import logger from "#/config/logger";
import cron from "node-cron";

interface SyncResult {
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Helper to add delay between API calls
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches single user's profile photo from Telegram
 * @returns Photo URL string, null if confirmed no photo, or undefined if error
 */
async function fetchUserProfilePhoto(
  botOrApi: Bot | Api,
  user: User
): Promise<string | null | undefined> {
  try {
    // Support both Bot instance and Api instance
    const api = "api" in botOrApi ? botOrApi.api : botOrApi;

    // Get user's profile photos (limit 1 = most recent)
    // Convert BigInt to String to avoid precision loss in JS numbers
    const photos = await api.getUserProfilePhotos(Number(user.telegramId), {
      limit: 1,
    });

    // Check if user has any photos
    if (!photos.photos || photos.photos.length === 0) {
      logger.debug(`User ${user.id} has no profile photo`);
      return null;
    }

    // Get the smallest photo size (first element is smallest)
    const photo = photos.photos[0];
    const smallestPhoto = photo[0];

    if (!smallestPhoto) {
      logger.warn(`User ${user.id} photo array is empty`);
      return null;
    }

    // Get file info to construct URL
    const file = await api.getFile(smallestPhoto.file_id);

    if (!file.file_path) {
      logger.warn(`User ${user.id} file has no file_path`);
      return null;
    }

    // Construct full URL using environment variable
    const photoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    logger.debug(`Fetched photo for user ${user.id}: ${photoUrl}`);

    return photoUrl;
  } catch (error) {
    // Distinguish between "Bot blocked" and other transient errors
    const isBotBlocked =
      error instanceof GrammyError &&
      (error.description.includes("blocked") || error.description.includes("deactivated"));

    if (isBotBlocked) {
      logger.info(`User ${user.id} has blocked the bot, treating as no photo`);
      return null;
    }

    logger.error(
      { userId: user.id, error: error instanceof Error ? error.message : String(error) },
      `Failed to fetch photo for user ${user.id}`
    );

    // Return undefined to indicate a transient error (don't update DB)
    return undefined;
  }
}

/**
 * Fetches and updates profile photos for all users
 * @param botOrApi - Bot instance or Api instance
 * @returns Summary with success/failure counts and errors
 */
export async function fetchAllUserProfilePhotos(botOrApi: Bot | Api): Promise<SyncResult> {
  logger.info("Starting profile photo sync for all users");

  const result: SyncResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  try {
    // Get all users from database
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
    });

    logger.info(`Found ${users.length} users to sync`);

    // Process each user
    for (const user of users) {
      try {
        const photoUrl = await fetchUserProfilePhoto(botOrApi, user);

        // Only update if we have a definitive result (URL or Null)
        // If undefined, it was a transient error, so we skip and keep the old URL
        if (photoUrl !== undefined) {
          await prisma.user.update({
            where: { id: user.id },
            data: { profilePhotoUrl: photoUrl },
          });
          result.success++;
        } else {
          result.skipped++;
          logger.warn(`Skipped updating user ${user.id} due to transient error`);
        }

        // Rate limiting: small delay between users to avoid Telegram limits
        await delay(200);
      } catch (error) {
        result.failed++;
        const errorMsg = `User ${user.id} (${user.username || user.firstName}): ${error instanceof Error ? error.message : "Unknown error"}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(
      `Profile photo sync complete. Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}`
    );

    return result;
  } catch (error) {
    logger.error({ error }, "Fatal error during profile photo sync");
    throw error;
  }
}

/**
 * Schedules weekly profile photo sync (Sunday 3 AM)
 */
export function scheduleProfilePhotoSync(bot: Bot): void {
  // Sunday at 3:00 AM (Europe/Lisbon timezone)
  cron.schedule("0 3 * * 0", async () => {
    logger.info("Starting scheduled profile photo sync (cron job)");
    try {
      const result = await fetchAllUserProfilePhotos(bot);
      logger.info(`Scheduled sync complete. Success: ${result.success}, Failed: ${result.failed}`);
      if (result.errors.length > 0) {
        logger.error({ errors: result.errors }, "Sync errors");
      }
    } catch (error) {
      logger.error({ error }, "Scheduled profile photo sync failed");
    }
  });

  logger.info("Profile photo sync cron job scheduled (every Sunday at 3 AM)");
}
