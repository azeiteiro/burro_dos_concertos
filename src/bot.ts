import dotenv from "dotenv";
import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import startCommand from "./commands/start";
import { addConcertConversation } from "./conversations/add_concert";
import { deleteConcertConversation } from "./conversations/delete_concert";
import { type BotContext } from "./types/global";
import { editConcertConversation } from "./conversations/edit_concert";
import { registerCommands } from "./bot/commands";
import { startNotifications } from "./notifications/notifications";

dotenv.config({ debug: false });

const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

bot.use(conversations());
bot.use(createConversation(addConcertConversation));
bot.use(createConversation(deleteConcertConversation));
bot.use(createConversation(editConcertConversation));

registerCommands(bot);

startNotifications(bot);

// Register commands
bot.command("start", startCommand);

if (process.env.NODE_ENV !== "test") {
  bot.start();
  console.log("🚀 Bot started!");
}

export { bot };
