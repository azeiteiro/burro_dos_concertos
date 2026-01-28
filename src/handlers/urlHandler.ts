import { BotContext } from "@/types/global";
import { isAdmin } from "@/utils/user";
import { extractMetadata, formatConcertPreview, parseConcertInfo } from "@/services/linkAnalyzer";
import { InlineKeyboard } from "grammy";

// Simple URL regex - matches http/https URLs
const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

interface CachedConcertData {
  metadata: ReturnType<typeof extractMetadata> extends Promise<infer T> ? T : never;
  concertInfo: ReturnType<typeof parseConcertInfo>;
  timestamp: number;
}

// Store metadata temporarily (in production, you might want to use Redis or similar)
const metadataCache = new Map<string, CachedConcertData>();

/**
 * Extracts URLs from a message text
 */
function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches || [];
}

/**
 * Handles messages containing URLs
 * Detects concert links and shows preview to admins
 */
export async function handleUrlMessage(ctx: BotContext) {
  // Only process for admins
  if (!(await isAdmin(ctx))) {
    return;
  }

  const text = ctx.message?.text;
  if (!text) return;

  const urls = extractUrls(text);
  if (urls.length === 0) return;

  // Process each URL
  for (const url of urls) {
    try {
      const metadata = await extractMetadata(url);

      if (!metadata) {
        continue; // Skip URLs that don't have valid metadata
      }

      // Parse concert info
      const concertInfo = parseConcertInfo(metadata);

      // Store metadata for later use
      const cacheKey = `concert_${ctx.from?.id}_${Date.now()}`;
      metadataCache.set(cacheKey, {
        metadata,
        concertInfo,
        timestamp: Date.now(),
      });

      // Clean old cache entries (older than 1 hour)
      cleanCache();

      // Create inline keyboard with "Add Concert" button
      const keyboard = new InlineKeyboard().text("✅ Add Concert", `quick_add:${cacheKey}`);

      // Send preview message
      await ctx.reply(formatConcertPreview(metadata), {
        parse_mode: "HTML",
        reply_markup: keyboard,
        disable_web_page_preview: false,
      });
    } catch (error) {
      console.error("Error processing URL:", url, error);
      // Continue processing other URLs
    }
  }
}

/**
 * Handles the "Add Concert" button click
 */
export async function handleQuickAddCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !callbackData.startsWith("quick_add:")) {
    return;
  }

  const cacheKey = callbackData.replace("quick_add:", "");
  const cached = metadataCache.get(cacheKey);

  if (!cached) {
    await ctx.answerCallbackQuery({
      text: "⏰ This link preview has expired. Please share the link again.",
      show_alert: true,
    });
    return;
  }

  // Store prefill data in session
  ctx.session.prefillData = {
    artist: cached.concertInfo.artist,
    venue: cached.concertInfo.venue,
    date: cached.concertInfo.date,
    url: cached.metadata.url,
    description: cached.metadata.description,
  };

  // Clean up cache
  metadataCache.delete(cacheKey);

  // Answer callback query
  await ctx.answerCallbackQuery({
    text: "✅ Starting conversation with prefilled data...",
  });

  // Start the add concert conversation
  await ctx.conversation.enter("addConcertConversation");
}

/**
 * Cleans up old cache entries (older than 1 hour)
 */
function cleanCache() {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [key, value] of metadataCache.entries()) {
    if (value.timestamp < oneHourAgo) {
      metadataCache.delete(key);
    }
  }
}
