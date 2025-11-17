import { Bot } from "grammy";
import { BotContext } from "@/types/global";
import { getUserByTelegramId } from "./utils/helpers";

// 🧠 Cache: userId -> timestamp (so we can refresh periodically)
const ADMIN_COMMANDS_CACHE = new Map<number, number>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export const setupCommands = (bot: Bot<BotContext>) => {
  // Set base commands for all private users (once, on startup)
  bot.api
    .setMyCommands(
      [
        { command: "start", description: "Start the bot" },
        { command: "help", description: "Show help information" },
        { command: "about", description: "About this bot" },
      ],
      { scope: { type: "all_private_chats" } }
    )
    .catch((err) => console.error("Failed to set base commands:", err));

  // Clear commands from groups/channels (optional safety)
  bot.api.setMyCommands([], { scope: { type: "all_group_chats" } }).catch(() => {});

  // 🎯 Middleware: per-user dynamic admin command setup
  bot.use(async (ctx, next) => {
    // Only act in private chats
    if (ctx.chat?.type !== "private") return next();

    const userId = ctx.from?.id;
    if (!userId) return next();

    // Cache logic — skip if recently updated
    const lastChecked = ADMIN_COMMANDS_CACHE.get(userId);
    if (lastChecked && Date.now() - lastChecked < CACHE_TTL) {
      return next();
    }

    try {
      const user = await getUserByTelegramId(userId);

      console.log(`🔍 Checking commands for user ${userId} — Role: ${user?.role}`);

      if (user?.role === "Admin") {
        // ✅ Admin-only commands
        await ctx.api.setMyCommands(
          [
            { command: "start", description: "Start the bot" },
            { command: "help", description: "Show help information" },
            { command: "about", description: "About this bot" },
            { command: "add_concert", description: "Add a new concert" },
            { command: "see_concerts", description: "View upcoming concerts" },
            { command: "edit_concert", description: "Edit an existing concert" },
            { command: "delete_concert", description: "Delete a concert" },
            { command: "list_users", description: "📋 List all users" },
            { command: "promote_user", description: "⬆️ Promote user to admin" },
            { command: "demote_user", description: "⬇️ Demote admin to user" },
            { command: "user_info", description: "ℹ️ Get user information" },
          ],
          { scope: { type: "chat", chat_id: userId } }
        );

        console.log(`✅ Admin commands set for user ${userId}`);
      } else {
        // 👤 Normal user commands
        await ctx.api.setMyCommands(
          [
            { command: "start", description: "Start the bot" },
            { command: "help", description: "Show help information" },
            { command: "about", description: "About this bot" },
            { command: "see_concerts", description: "View upcoming concerts" },
          ],
          { scope: { type: "chat", chat_id: userId } }
        );

        console.log(`✅ User commands set for user ${userId}`);
      }

      ADMIN_COMMANDS_CACHE.set(userId, Date.now());
    } catch (err) {
      console.error("⚠️ Failed to set commands for user:", userId, err);
    }

    await next();
  });
};
