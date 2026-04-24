import { Bot, Api, GrammyError } from "grammy";
import { prisma } from "#/config/db";
import { User } from "@prisma/client";
import logger from "#/config/logger";
import cron from "node-cron";
import { getR2Storage } from "./r2Storage";
import got from "got";

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
 * Download image from Telegram servers
 * @param fileUrl - Full Telegram file URL
 * @returns Image buffer
 */
async function downloadImageFromTelegram(fileUrl: string): Promise<Buffer> {
  try {
    logger.debug({ fileUrl }, "Downloading image from Telegram");

    const response = await got(fileUrl, {
      responseType: "buffer",
      timeout: {
        request: 10000, // 10 second timeout
      },
    });

    const imageBuffer = Buffer.from(response.body);
    logger.debug({ size: imageBuffer.length }, "Successfully downloaded image");
    return imageBuffer;
  } catch (error) {
    logger.error({ error, fileUrl }, "Failed to download image from Telegram");
    throw error;
  }
}

/**
 * Determine content type from file extension
 * @param filePath - File path from Telegram (e.g., "photos/file.jpg")
 * @returns MIME type
 */
function getContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg"; // Default fallback
  }
}

/**
 * Fetches single user's profile photo from Telegram
 * @returns Object with url and fileId, or undefined if error
 */
async function fetchUserProfilePhoto(
  botOrApi: Bot | Api,
  user: User
): Promise<{ url: string | null; fileId: string | null } | undefined> {
  try {
    // Support both Bot instance and Api instance
    const api = "api" in botOrApi ? botOrApi.api : botOrApi;

    // Get user's profile photos (limit 1 = most recent)
    const photos = await api.getUserProfilePhotos(Number(user.telegramId), {
      limit: 1,
    });

    // Check if user has any photos
    if (!photos.photos || photos.photos.length === 0) {
      logger.debug(`User ${user.id} has no profile photo`);
      return { url: null, fileId: null };
    }

    // Get the smallest photo size (first element is smallest)
    const photo = photos.photos[0];
    const smallestPhoto = photo[0];

    if (!smallestPhoto) {
      logger.warn(`User ${user.id} photo array is empty`);
      return { url: null, fileId: null };
    }

    const currentFileId = smallestPhoto.file_id;

    // Check if file_id changed (if same, skip download/upload)
    if (user.profilePhotoFileId === currentFileId && user.profilePhotoUrl) {
      logger.debug(
        { userId: user.id, fileId: currentFileId },
        "Profile photo unchanged, skipping upload"
      );
      return { url: user.profilePhotoUrl, fileId: currentFileId };
    }

    // Get file info to download
    const file = await api.getFile(smallestPhoto.file_id);

    if (!file.file_path) {
      logger.warn(`User ${user.id} file has no file_path`);
      return { url: null, fileId: null };
    }

    // Download image from Telegram
    const telegramUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const imageBuffer = await downloadImageFromTelegram(telegramUrl);

    // Upload to R2
    const r2 = getR2Storage();
    const fileExtension = file.file_path.split(".").pop() || "jpg";
    const r2Key = `profile-photos/${user.id}.${fileExtension}`;
    const contentType = getContentType(file.file_path);

    const r2Url = await r2.uploadImage(r2Key, imageBuffer, contentType);

    logger.debug({ userId: user.id, r2Url, fileId: currentFileId }, "Uploaded photo to R2");

    return { url: r2Url, fileId: currentFileId };
  } catch (error) {
    // Distinguish between "Bot blocked" and other transient errors
    const isBotBlocked =
      error instanceof GrammyError &&
      (error.description.includes("blocked") || error.description.includes("deactivated"));

    if (isBotBlocked) {
      logger.info(`User ${user.id} has blocked the bot, treating as no photo`);
      return { url: null, fileId: null };
    }

    logger.error(
      { userId: user.id, error: error instanceof Error ? error.message : String(error) },
      `Failed to fetch/upload photo for user ${user.id}`
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
        const photoResult = await fetchUserProfilePhoto(botOrApi, user);

        // Only update if we have a definitive result
        // If undefined, it was a transient error, so we skip and keep the old URL
        if (photoResult !== undefined) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              profilePhotoUrl: photoResult.url,
              profilePhotoFileId: photoResult.fileId,
            },
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
