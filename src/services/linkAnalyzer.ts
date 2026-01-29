import metascraper from "metascraper";
import metascraperDescription from "metascraper-description";
import metascraperImage from "metascraper-image";
import metascraperTitle from "metascraper-title";
import metascraperUrl from "metascraper-url";
import metascraperDate from "metascraper-date";
import got from "got";
import https from "https";
import http from "http";

export interface ConcertMetadata {
  title: string | null;
  description: string | null;
  image: string | null;
  url: string;
  date: string | null;
  html?: string; // Store HTML for additional parsing
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
 * Fallback fetch method using native http/https (more lenient with headers)
 */
async function fallbackFetch(url: string): Promise<{ body: string; url: string } | null> {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === "https:" ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,pt;q=0.8",
      },
      timeout: 15000,
      // Allow malformed headers
      insecureHTTPParser: true,
      // Allow invalid/self-signed SSL certificates
      rejectUnauthorized: false,
    };

    const req = client.request(options, (res) => {
      let data = "";

      // Handle redirects
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fallbackFetch(res.headers.location));
      }

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({ body: data, url: url });
      });
    });

    req.on("error", (error) => {
      console.error("Fallback fetch error:", error.message);
      resolve(null);
    });

    req.on("timeout", () => {
      req.destroy();
      console.error("Fallback fetch timeout");
      resolve(null);
    });

    req.end();
  });
}

/**
 * Extracts metadata from a URL
 */
export async function extractMetadata(url: string): Promise<ConcertMetadata | null> {
  let html: string;
  let finalUrl: string;

  try {
    // Try using got first (better feature set)
    const response = await got(url, {
      timeout: { request: 15000 },
      followRedirect: true,
      throwHttpErrors: false,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,pt;q=0.8",
      },
      http2: false, // Disable HTTP/2 for better compatibility
      https: {
        rejectUnauthorized: false, // Allow invalid/self-signed SSL certificates
      },
      retry: {
        limit: 1,
        methods: ["GET"],
        statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
      },
    });

    html = response.body;
    finalUrl = response.url;
  } catch (error: unknown) {
    // Log the error
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";

    console.warn(`Got failed for ${url} (${errorName}: ${errorMessage}), trying fallback...`);

    // Try fallback method with lenient header parsing
    const fallbackResult = await fallbackFetch(url);

    if (!fallbackResult) {
      console.error(`Failed to fetch ${url} with both methods`);
      return null;
    }

    html = fallbackResult.body;
    finalUrl = fallbackResult.url;
  }

  try {
    if (!html) {
      console.warn(`No HTML content received from ${url}`);
      return null;
    }

    const metadata = await scraper({ html, url: finalUrl });

    // Basic validation - we need at least a title or description
    if (!metadata.title && !metadata.description) {
      console.warn(`No metadata found for ${url}`);
      return null;
    }

    return {
      title: metadata.title || null,
      description: metadata.description || null,
      image: metadata.image || null,
      url: finalUrl,
      date: metadata.date || null,
      html: html, // Preserve HTML for additional parsing
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Failed to parse metadata from ${url}: ${errorMessage}`);
    return null;
  }
}

/**
 * Extracts venue from HTML (for sites like Ticketline that don't use Open Graph)
 */
function extractVenueFromHtml(html: string): string | null {
  // Try to find schema.org venue markup
  const schemaMatch = html.match(
    /<[^>]*class=["'][^"']*venue[^"']*["'][^>]*itemprop=["']name["'][^>]*>([^<]+)<\/[^>]+>/i
  );
  if (schemaMatch) {
    return schemaMatch[1].trim();
  }

  // Try Portuguese-specific patterns
  const portugueseVenueMatch = html.match(/<p[^>]*class=["']venue["'][^>]*>([^<]+)<\/p>/i);
  if (portugueseVenueMatch) {
    return portugueseVenueMatch[1].trim();
  }

  // Try itemprop="location" with schema.org
  const locationMatch = html.match(/<[^>]*itemprop=["']location["'][^>]*>([^<]+)<\/[^>]+>/i);
  if (locationMatch) {
    return locationMatch[1].trim();
  }

  return null;
}

/**
 * Attempts to parse concert-specific information from metadata
 * This is a simple heuristic-based approach
 */
export function parseConcertInfo(
  metadata: ConcertMetadata,
  html?: string
): {
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

  // Try to extract venue from HTML if not found in title
  if (!info.venue && html) {
    const venueFromHtml = extractVenueFromHtml(html);
    if (venueFromHtml) {
      info.venue = venueFromHtml;
    }
  }

  return info;
}

/**
 * Formats concert metadata for display
 */
export function formatConcertPreview(metadata: ConcertMetadata): string {
  const parsedInfo = parseConcertInfo(metadata, metadata.html);

  let preview = "🎵 <b>Concert Link Detected</b>\n\n";

  if (parsedInfo.artist) {
    preview += `🎤 <b>Artist:</b> ${parsedInfo.artist}\n`;
  }

  if (parsedInfo.venue) {
    preview += `🏟️ <b>Venue:</b> ${parsedInfo.venue}\n`;
  }

  if (parsedInfo.date) {
    // Parse the date to format it nicely
    const date = new Date(parsedInfo.date);
    const dateStr = date.toISOString().split("T")[0]; // YYYY-MM-DD

    // Check if there's time information
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (hours !== 0 || minutes !== 0) {
      const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
      preview += `📅 <b>Date:</b> ${dateStr}\n`;
      preview += `⏰ <b>Time:</b> ${timeStr}\n`;
    } else {
      preview += `📅 <b>Date:</b> ${dateStr}\n`;
    }
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
