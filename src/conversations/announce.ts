import { Conversation } from "@grammyjs/conversations";
import { BotContext } from "@/types/global";
import { logAction } from "@/utils/logger";
import { InlineKeyboard } from "grammy";

export async function announceConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext
) {
  if (!ctx.from?.id) {
    await ctx.reply("❌ Unable to identify user.");
    return;
  }

  const groupId = process.env.GROUP_ID;
  if (!groupId) {
    await ctx.reply("❌ GROUP_ID not configured. Cannot send announcements.");
    return;
  }

  // Ask for the message
  await ctx.reply(
    "📢 *Send Announcement*\n\n" +
      "Please send the message you want to announce to the group.\n\n" +
      "ℹ️ You can use Markdown formatting:\n" +
      "• `*bold*` for *bold*\n" +
      "• `_italic_` for _italic_\n" +
      "• `` `code` `` for `code`\n" +
      "• `[link](url)` for links\n\n" +
      "Send /cancel to abort.",
    { parse_mode: "Markdown" }
  );

  const messageCtx = await conversation.wait();

  // Handle cancellation
  if (messageCtx.message?.text === "/cancel") {
    await ctx.reply("❌ Announcement cancelled.");
    return;
  }

  // Get the message text
  const messageText = messageCtx.message?.text;
  if (!messageText) {
    await ctx.reply("❌ Please send a text message.");
    return;
  }

  // Show preview and confirmation
  const keyboard = new InlineKeyboard()
    .text("✅ Send to Group", "announce_confirm")
    .text("❌ Cancel", "announce_cancel");

  await ctx.reply("📝 *Preview:*\n\n" + messageText + "\n\n_Send this to the group?_", {
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });

  // Wait for confirmation
  const confirmCtx = await conversation.wait();

  if (confirmCtx.callbackQuery?.data === "announce_confirm") {
    try {
      // Send to group
      await conversation.external(async () => {
        await ctx.api.sendMessage(groupId, messageText, { parse_mode: "Markdown" });
      });

      // Log who sent it
      logAction(
        ctx.from?.id ?? 0,
        `Sent announcement to group: "${messageText.substring(0, 100)}${messageText.length > 100 ? "..." : ""}"`
      );

      await confirmCtx.answerCallbackQuery();
      await ctx.reply("✅ Announcement sent to the group successfully!");
    } catch (err) {
      console.error("Failed to send announcement:", err);
      await confirmCtx.answerCallbackQuery();
      await ctx.reply(
        "❌ Failed to send announcement. Make sure:\n" +
          "• The bot is a member of the group\n" +
          "• GROUP_ID is correctly configured\n" +
          "• The bot has permission to send messages"
      );
    }
  } else {
    await confirmCtx.answerCallbackQuery();
    await ctx.reply("❌ Announcement cancelled.");
  }
}
