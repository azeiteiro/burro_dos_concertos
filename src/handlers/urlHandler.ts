import { BotContext } from "@/types/global";
import { isAdmin, findOrCreateUser, getAllAdmins } from "@/utils/user";
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
 * Detects concert links and notifies admins privately
 */
export async function handleUrlMessage(ctx: BotContext) {
  const text = ctx.message?.text;
  if (!text) return;

  const urls = extractUrls(text);
  if (urls.length === 0) return;

  // Check if this is a group chat
  const isGroupChat = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  const userIsAdmin = await isAdmin(ctx);
  const userName = ctx.from?.first_name || ctx.from?.username || "Someone";

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
        // If in group, notify admins about failed extraction
        if (isGroupChat) {
          const admins = await getAllAdmins();
          const keyboard = new InlineKeyboard().text("➕ Add Manually", "add_manual");

          for (const admin of admins) {
            try {
              await ctx.api.sendMessage(
                Number(admin.telegramId),
                `⚠️ <b>Link shared by ${userName}</b>\n\nCouldn't analyze this link automatically. You can still add the concert manually with /add_concert\n\n🔗 ${url}`,
                {
                  parse_mode: "HTML",
                  reply_markup: keyboard,
                }
              );
            } catch (error) {
              console.error(`Failed to notify admin ${admin.telegramId}:`, error);
            }
          }
        } else if (userIsAdmin) {
          // In private chat, show to admin only
          await ctx.reply(
            `⚠️ Couldn't analyze this link automatically. You can still add the concert manually with /add_concert\n\n🔗 ${url}`,
            {
              reply_markup: {
                inline_keyboard: [[{ text: "➕ Add Manually", callback_data: "add_manual" }]],
              },
            }
          );
        } else {
          // In private chat, show to everyone
          await ctx.reply(
            `⚠️ Couldn't analyze this link automatically. You can still add the concert manually with /add_concert\n\n🔗 ${url}`,
            {
              reply_markup: {
                inline_keyboard: [[{ text: "➕ Add Manually", callback_data: "add_manual" }]],
              },
            }
          );
        }
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

      // Different behavior for group vs private chat
      if (isGroupChat) {
        // In group: notify all admins privately
        const admins = await getAllAdmins();

        if (admins.length === 0) {
          console.warn("No admins found to notify about concert link");
          continue;
        }

        // Create preview with "Add Concert" button
        const keyboard = new InlineKeyboard().text("✅ Add Concert", `quick_add:${cacheKey}`);
        let previewText = `<b>🔔 Concert Link Shared by ${userName}</b>\n\n`;
        previewText += formatConcertPreview(metadata);

        // Send private message to each admin
        for (const admin of admins) {
          try {
            await ctx.api.sendMessage(Number(admin.telegramId), previewText, {
              parse_mode: "HTML",
              disable_web_page_preview: false,
              reply_markup: keyboard,
            });
          } catch (error) {
            console.error(`Failed to notify admin ${admin.telegramId} about concert link:`, error);
            // Continue notifying other admins even if one fails
          }
        }

        // Optionally send a subtle acknowledgment in the group (only if posted by non-admin)
        if (!userIsAdmin) {
          await ctx.reply("✅ Concert link detected! Admins have been notified.", {
            reply_to_message_id: ctx.message?.message_id,
          });
        }
      } else {
        // In private chat: show preview directly with button for everyone
        const keyboard = new InlineKeyboard().text("✅ Add Concert", `quick_add:${cacheKey}`);
        const previewText = formatConcertPreview(metadata);

        await ctx.reply(previewText, {
          parse_mode: "HTML",
          disable_web_page_preview: false,
          reply_markup: keyboard,
        });
      }
    } catch (error) {
      console.error("Error processing URL:", url, error);

      // Notify admins about error
      if (isGroupChat) {
        const admins = await getAllAdmins();
        for (const admin of admins) {
          try {
            await ctx.api.sendMessage(
              Number(admin.telegramId),
              `❌ <b>Error analyzing link shared by ${userName}</b>\n\nYou can add the concert manually with /add_concert\n\n🔗 ${url}`,
              { parse_mode: "HTML" }
            );
          } catch (err) {
            console.error(`Failed to notify admin ${admin.telegramId}:`, err);
          }
        }
      } else {
        // In private chat, show error to everyone
        await ctx.reply(
          `❌ Error analyzing link. You can add the concert manually with /add_concert\n\n🔗 ${url}`
        );
      }
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

  // In groups, only admins can add concerts
  // In private chats, anyone can add for themselves
  const isGroupChat =
    ctx.callbackQuery?.message?.chat.type === "group" ||
    ctx.callbackQuery?.message?.chat.type === "supergroup";

  if (isGroupChat && !(await isAdmin(ctx))) {
    await ctx.answerCallbackQuery({
      text: "❌ Only admins can add concerts in groups.",
      show_alert: true,
    });
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
 */
export async function handleManualAddCallback(ctx: BotContext) {
  // In groups, only admins can add concerts
  // In private chats, anyone can add for themselves
  const isGroupChat =
    ctx.callbackQuery?.message?.chat.type === "group" ||
    ctx.callbackQuery?.message?.chat.type === "supergroup";

  if (isGroupChat && !(await isAdmin(ctx))) {
    await ctx.answerCallbackQuery({
      text: "❌ Only admins can add concerts in groups.",
      show_alert: true,
    });
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
