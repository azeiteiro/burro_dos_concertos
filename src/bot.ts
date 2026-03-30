import dotenv from "dotenv";
import path from "path";
import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import startCommand from "./commands/start";
import { addConcertConversation } from "./conversations/add_concert";
import { deleteConcertConversation } from "./conversations/delete_concert";
import { type BotContext } from "./types/global";
import { editConcertConversation } from "./conversations/edit_concert";
import { announceConversation } from "./conversations/announce";
import { registerCommands } from "./bot/commands";
import { startNotifications } from "./notifications/notifications";
import { setupCommands } from "./setupCommands";
import { helpCommand, handleHelpCallbacks, calendarCommand } from "./commands/help";
import { aboutCommand } from "./commands/about";
import {
  handleUrlMessage,
  handleQuickAddCallback,
  handleManualAddCallback,
} from "./handlers/urlHandler";
import { handlePollAnswer } from "./handlers/pollHandler";
import { startServer } from "./api/server";
import { scheduleProfilePhotoSync } from "#/services/profilePhotoService";
import { scheduleArtistImageSync } from "#/services/artistImageService";

// Load environment-specific .env file
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.local";

dotenv.config({ path: path.resolve(process.cwd(), envFile), debug: false });

// Fallback to .env if specific file doesn't exist
if (!process.env.BOT_TOKEN) {
  dotenv.config();
}

// 🎯 Initialize bot
const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

console.log(`🤖 Bot initialized in ${process.env.NODE_ENV || "development"} mode.`);

// 💾 Session storage (for prefilling concert data)
bot.use(
  session({
    initial: () => ({}),
  })
);

// 🗣️ Conversations
bot.use(conversations());
bot.use(createConversation(addConcertConversation));
bot.use(createConversation(deleteConcertConversation));
bot.use(createConversation(editConcertConversation));
bot.use(createConversation(announceConversation));

// 🧩 Register all commands (these are your handlers)
registerCommands(bot);

// Schedule profile photo sync
scheduleProfilePhotoSync(bot);

// Schedule artist image sync
scheduleArtistImageSync();

// 🪄 Setup dynamic command lists for users and admins
setupCommands(bot);

// 🔔 Start notifications listener
startNotifications(bot);

console.log("🔔 Notifications system initialized.");

// 🚀 Start command
bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("calendar", calendarCommand);
bot.command("about", aboutCommand);

// 🔗 URL detection for concert links (admin only)
bot.on("message:text", handleUrlMessage);

// 🗳️ Poll answer handler
bot.on("poll_answer", handlePollAnswer);

// 🎫 Quick add callback handler
bot.callbackQuery(/^quick_add:/, handleQuickAddCallback);

// ➕ Manual add callback handler
bot.callbackQuery("add_manual", handleManualAddCallback);

// ❓ Help navigation callback handler
bot.callbackQuery(/^help_/, handleHelpCallbacks);

// 🏁 Run the bot
let apiServer: ReturnType<typeof startServer> | undefined;

if (process.env.JEST_WORKER_ID === undefined) {
  // Start Express API server
  apiServer = startServer();

  // Start Telegram bot
  bot.start();
  console.log("🚀 Bot started!");
}

// 🧹 Cleanup on shutdown

const cleanup = async () => {
  console.log("🛑 Shutting down...");
  try {
    await bot.stop();
    if (apiServer) {
      apiServer.close();
      console.log("🌐 API server stopped");
    }
    console.log("✅ Cleanup complete");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

export { bot };
