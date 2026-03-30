import { SpotifyClient } from "./spotify/spotifyClient";
import { prisma } from "#/config/db";
import logger from "#/config/logger";

const spotifyClient = new SpotifyClient();

interface ArtistImageResult {
  imageUrl: string;
  spotifyArtistId: string;
}

/**
 * Fetch artist image from Spotify by name
 * @returns Image URL and Spotify ID, or null if not found
 */
export async function fetchArtistImage(artistName: string): Promise<ArtistImageResult | null> {
  try {
    logger.debug({ artistName }, "Fetching artist image from Spotify");

    const artist = await spotifyClient.searchArtist(artistName);

    if (!artist) {
      logger.info({ artistName }, "Artist not found in Spotify");
      return null;
    }

    if (!artist.images || artist.images.length === 0) {
      logger.info({ artistName, spotifyId: artist.id }, "Artist has no images");
      return null;
    }

    // Prefer 640px image, otherwise use first available
    const preferredImage = artist.images.find((img) => img.width === 640);
    const imageUrl = preferredImage ? preferredImage.url : artist.images[0].url;

    logger.info(
      { artistName, spotifyId: artist.id, imageUrl },
      "Successfully fetched artist image"
    );

    return {
      imageUrl,
      spotifyArtistId: artist.id,
    };
  } catch (error) {
    logger.error({ error, artistName }, "Failed to fetch artist image from Spotify");
    return null;
  }
}

/**
 * Update single concert with artist image
 * @returns true if successful, false otherwise
 */
export async function updateConcertArtistImage(concertId: number): Promise<boolean> {
  try {
    logger.debug({ concertId }, "Updating concert artist image");

    // Get concert from database
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, artistName: true },
    });

    if (!concert) {
      logger.warn({ concertId }, "Concert not found");
      return false;
    }

    // Fetch artist image from Spotify
    const artistImage = await fetchArtistImage(concert.artistName);

    // Update concert with image data (or null if not found)
    await prisma.concert.update({
      where: { id: concertId },
      data: {
        artistImageUrl: artistImage?.imageUrl || null,
        spotifyArtistId: artistImage?.spotifyArtistId || null,
      },
    });

    if (artistImage) {
      logger.info(
        { concertId, artistName: concert.artistName, spotifyId: artistImage.spotifyArtistId },
        "Successfully updated concert with artist image"
      );
    } else {
      logger.info(
        { concertId, artistName: concert.artistName },
        "Updated concert with null artist image (not found)"
      );
    }

    return true;
  } catch (error) {
    logger.error({ error, concertId }, "Failed to update concert artist image");
    return false;
  }
}

/**
 * Sync artist images for all concerts (batch operation)
 */
export async function syncAllArtistImages(): Promise<{
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  logger.info("Starting artist image sync for all concerts");

  const result = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get all concerts
    const concerts = await prisma.concert.findMany({
      select: {
        id: true,
        artistName: true,
        artistImageUrl: true,
        spotifyArtistId: true,
      },
      orderBy: { id: "asc" },
    });

    logger.info(`Found ${concerts.length} concerts to process`);

    // Process each concert
    for (const concert of concerts) {
      try {
        // Skip if already has both image and Spotify ID
        if (concert.artistImageUrl && concert.spotifyArtistId) {
          logger.debug({ concertId: concert.id }, "Skipping concert (already has image)");
          result.skipped++;
          continue;
        }

        // Fetch and update
        const artistImage = await fetchArtistImage(concert.artistName);

        await prisma.concert.update({
          where: { id: concert.id },
          data: {
            artistImageUrl: artistImage?.imageUrl || null,
            spotifyArtistId: artistImage?.spotifyArtistId || null,
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        const errorMsg = `Concert ${concert.id} (${concert.artistName}): ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        result.errors.push(errorMsg);
        logger.error({ error, concertId: concert.id }, errorMsg);
      }
    }

    logger.info(
      `Artist image sync complete. Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}`
    );

    return result;
  } catch (error) {
    logger.error({ error }, "Fatal error during artist image sync");
    throw error;
  }
}

/**
 * Schedule weekly artist image sync (Sunday 3 AM)
 */
export function scheduleArtistImageSync(): void {
  // Will implement later
  throw new Error("Not implemented yet");
}
