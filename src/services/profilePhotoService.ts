import { Bot } from "grammy";
import { prisma } from "#/config/db";
import { User } from "@prisma/client";
import logger from "#/config/logger";

interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Fetches single user's profile photo from Telegram
 * @returns Photo URL or null if no photo available
 */
async function fetchUserProfilePhoto(bot: Bot, user: User): Promise<string | null> {
  try {
    // Get user's profile photos (limit 1 = most recent)
    const photos = await bot.api.getUserProfilePhotos(Number(user.telegramId), {
      limit: 1,
    });

    // Check if user has any photos
    if (!photos.photos || photos.photos.length === 0) {
      logger.info(`User ${user.id} has no profile photo`);
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
    const file = await bot.api.getFile(smallestPhoto.file_id);

    if (!file.file_path) {
      logger.warn(`User ${user.id} file has no file_path`);
      return null;
    }

    // Construct full URL
    const photoUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    logger.info(`Fetched photo for user ${user.id}: ${photoUrl}`);

    return photoUrl;
  } catch (error) {
    logger.error(`Failed to fetch photo for user ${user.id}:`, error);
    return null;
  }
}

/**
 * Fetches and updates profile photos for all users
 * @returns Summary with success/failure counts and errors
 */
export async function fetchAllUserProfilePhotos(bot: Bot): Promise<SyncResult> {
  logger.info("Starting profile photo sync for all users");

  const result: SyncResult = {
    success: 0,
    failed: 0,
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
        const photoUrl = await fetchUserProfilePhoto(bot, user);

        // Update user's profile photo URL (null if no photo)
        await prisma.user.update({
          where: { id: user.id },
          data: { profilePhotoUrl: photoUrl },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        const errorMsg = `User ${user.id} (${user.username || user.firstName}): ${error instanceof Error ? error.message : "Unknown error"}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(
      `Profile photo sync complete. Success: ${result.success}, Failed: ${result.failed}`
    );

    return result;
  } catch (error) {
    logger.error("Fatal error during profile photo sync:", error);
    throw error;
  }
}
