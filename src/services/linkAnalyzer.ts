import metascraper from "metascraper";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperTitle from "metascraper-title";
import metascraperUrl from "metascraper-url";
import metascraperDate from "metascraper-date";
import got from "got";

export interface ConcertMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  date: string | null;
  // Parsed fields (we'll try to extract these from title/description)
  artist?: string;
  venue?: string;
  concertDate?: Date;
}

const scraper = metascraper([
  metascraperTitle(),
  metascraperDescription(),
  metascraperImage(),
  metascraperUrl(),
  metascraperDate(),
]);

/**
 * Extracts metadata from a URL
 */
export async function extractMetadata(url: string): Promise<ConcertMetadata | null> {
  try {
    const { body: html, url: finalUrl } = await got(url, {
      timeout: { request: 10000 },
      followRedirect: true,
      throwHttpErrors: false,
    });

    const metadata = await scraper({ html, url: finalUrl });

    // Basic validation - we need at least a title or description
    if (!metadata.title && !metadata.description) {
      return null;
    }

    return {
      title: metadata.title || null,
      description: metadata.description || null,
      image: metadata.image || null,
      url: finalUrl,
      date: metadata.date || null,
    };
  } catch (error) {
    console.error("Failed to extract metadata from URL:", url, error);
    return null;
  }
}

/**
 * Attempts to parse concert-specific information from metadata
 * This is a simple heuristic-based approach
 */
export function parseConcertInfo(metadata: ConcertMetadata): {
  artist?: string;
  venue?: string;
  date?: string;
} {
  const info: { artist?: string; venue?: string; date?: string } = {};

  // Try to extract date if available
  if (metadata.date) {
    info.date = metadata.date;
  }

  // The title often contains "Artist @ Venue" or "Artist - Venue" patterns
  const title = metadata.title || "";

  // Common patterns for ticket sites
  const patterns = [
    /^(.+?)\s+[@-]\s+(.+?)$/i, // "Artist @ Venue" or "Artist - Venue"
    /^(.+?)\s+at\s+(.+?)$/i, // "Artist at Venue"
    /^(.+?)\s+em\s+(.+?)$/i, // "Artist em Venue" (Portuguese)
    /^(.+?)\s+no\s+(.+?)$/i, // "Artist no Venue" (Portuguese)
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      info.artist = match[1].trim();
      info.venue = match[2].trim();
      break;
    }
  }

  // If we couldn't parse it, use the title as the artist name
  if (!info.artist && title) {
    info.artist = title;
  }

  return info;
}

/**
 * Formats concert metadata for display
 */
export function formatConcertPreview(metadata: ConcertMetadata): string {
  const parsedInfo = parseConcertInfo(metadata);

  let preview = "🎵 <b>Concert Link Detected</b>\n\n";

  if (parsedInfo.artist) {
    preview += `🎤 <b>Artist:</b> ${parsedInfo.artist}\n`;
  }

  if (parsedInfo.venue) {
    preview += `🏟️ <b>Venue:</b> ${parsedInfo.venue}\n`;
  }

  if (parsedInfo.date) {
    preview += `📅 <b>Date:</b> ${parsedInfo.date}\n`;
  }

  if (metadata.description) {
    const shortDesc =
      metadata.description.length > 200
        ? metadata.description.substring(0, 200) + "..."
        : metadata.description;
    preview += `\n${shortDesc}\n`;
  }

  preview += `\n🔗 <a href="${metadata.url}">View Link</a>`;

  return preview;
}
