import dotenv from "dotenv";
import path from "path";
import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import startCommand from "./commands/start";
import { addConcertConversation } from "./conversations/add_concert";
import { deleteConcertConversation } from "./conversations/delete_concert";
import { type BotContext } from "./types/global";
import { editConcertConversation } from "./conversations/edit_concert";
import { registerCommands } from "./bot/commands";
import { startNotifications } from "./notifications/notifications";
import { setupCommands } from "./setupCommands";
import { helpCommand } from "./commands/help";
import { aboutCommand } from "./commands/about";

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

// 🗣️ Conversations
bot.use(conversations());
bot.use(createConversation(addConcertConversation));
bot.use(createConversation(deleteConcertConversation));
bot.use(createConversation(editConcertConversation));

// 🧩 Register all commands (these are your handlers)
registerCommands(bot);

// 🪄 Setup dynamic command lists for users and admins
setupCommands(bot);

// 🔔 Start notifications listener
startNotifications(bot);

// 🚀 Start command
bot.command("start", startCommand);
bot.command("help", helpCommand);
bot.command("about", aboutCommand);

// 🏁 Run the bot
if (process.env.NODE_ENV !== "test") {
  bot.start();
  console.log("🚀 Bot started!");
}

export { bot };
