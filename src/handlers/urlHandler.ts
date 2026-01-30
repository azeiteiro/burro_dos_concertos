import { BotContext } from "@/types/global";
import { findOrCreateUser } from "@/utils/user";
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
 * Only works in private chats - users must talk directly to the bot
 */
export async function handleUrlMessage(ctx: BotContext) {
  const text = ctx.message?.text;
  if (!text) return;

  const urls = extractUrls(text);
  if (urls.length === 0) return;

  // Only process URLs in private chats
  const isGroupChat = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  if (isGroupChat) {
    return; // Ignore URLs in groups
  }

  // Process each URL
  for (const url of urls) {
    // Send initial feedback message
    let feedbackMessage: { message_id: number } | undefined;
    try {
      feedbackMessage = await ctx.reply("⏳ Analyzing concert link...");
    } catch (error) {
      console.error("Failed to send feedback message:", error);
    }

    try {
      // Progress callback to update the feedback message
      const onProgress = async (message: string) => {
        if (feedbackMessage) {
          try {
            await ctx.api.editMessageText(ctx.chat!.id, feedbackMessage.message_id, message);
          } catch (error) {
            console.error("Failed to update feedback message:", error);
          }
        }
      };

      const metadata = await extractMetadata(url, onProgress);

      // Delete feedback message if it was sent
      if (feedbackMessage) {
        try {
          await ctx.api.deleteMessage(ctx.chat!.id, feedbackMessage.message_id);
        } catch (error) {
          console.error("Failed to delete feedback message:", error);
        }
      }

      if (!metadata) {
        await ctx.reply(
          `⚠️ Couldn't analyze this link automatically. You can still add the concert manually with /add_concert\n\n🔗 ${url}`,
          {
            reply_markup: {
              inline_keyboard: [[{ text: "➕ Add Manually", callback_data: "add_manual" }]],
            },
          }
        );
        continue;
      }

      // Parse concert info with HTML for better venue extraction
      const concertInfo = parseConcertInfo(metadata, metadata.html);

      // Store metadata for later use
      const cacheKey = `concert_${ctx.from?.id}_${Date.now()}`;
      metadataCache.set(cacheKey, {
        metadata,
        concertInfo,
        timestamp: Date.now(),
      });

      // Clean old cache entries (older than 1 hour)
      cleanCache();

      // Show preview directly with "Add Concert" button
      const keyboard = new InlineKeyboard().text("✅ Add Concert", `quick_add:${cacheKey}`);
      const previewText = formatConcertPreview(metadata);

      await ctx.reply(previewText, {
        parse_mode: "HTML",
        disable_web_page_preview: false,
        reply_markup: keyboard,
      });
    } catch (error) {
      console.error("Error processing URL:", url, error);
      await ctx.reply(
        `❌ Error analyzing link. You can add the concert manually with /add_concert\n\n🔗 ${url}`
      );
    }
  }
}

/**
 * Handles the "Add Concert" button click
 * Only works in private chats (URLs are not processed in groups)
 */
export async function handleQuickAddCallback(ctx: BotContext) {
  const callbackData = ctx.callbackQuery?.data;
  if (!callbackData || !callbackData.startsWith("quick_add:")) {
    return;
  }

  const tgUser = ctx.from;
  if (!tgUser) {
    await ctx.answerCallbackQuery({
      text: "❌ Could not identify user.",
      show_alert: true,
    });
    return;
  }

  const cacheKey = callbackData.replace("quick_add:", "");
  const cached = metadataCache.get(cacheKey);

  if (!cached || !cached.metadata) {
    await ctx.answerCallbackQuery({
      text: "⏰ This link preview has expired. Please share the link again.",
      show_alert: true,
    });
    return;
  }

  // Prepare prefill data (skip description as it's usually marketing text)
  const prefillData = {
    artist: cached.concertInfo.artist,
    venue: cached.concertInfo.venue,
    date: cached.concertInfo.date,
    url: cached.metadata.url,
  };

  // Clean up cache
  metadataCache.delete(cacheKey);

  // Answer callback query
  await ctx.answerCallbackQuery({
    text: "✅ Starting conversation with prefilled data...",
  });

  // Find or create user in database
  const user = await findOrCreateUser(tgUser);

  // Start the add concert conversation with prefill data
  await ctx.conversation.enter("addConcertConversation", {
    dbUserId: user.id,
    prefillData,
  });
}

/**
 * Handles the "Add Manually" button click
 * Only works in private chats (URLs are not processed in groups)
 */
export async function handleManualAddCallback(ctx: BotContext) {
  const tgUser = ctx.from;
  if (!tgUser) {
    await ctx.answerCallbackQuery({
      text: "❌ Could not identify user.",
      show_alert: true,
    });
    return;
  }

  await ctx.answerCallbackQuery({
    text: "✅ Starting manual concert entry...",
  });

  // Find or create user in database
  const user = await findOrCreateUser(tgUser);

  // Start the add concert conversation without prefill data
  await ctx.conversation.enter("addConcertConversation", {
    dbUserId: user.id,
    prefillData: undefined,
  });
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
