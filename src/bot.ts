import dotenv from "dotenv";
import { Bot } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import startCommand from "./commands/start";
import { addConcertConversation } from "./conversations/add_concert";
import { addConcertCommand } from "./commands/concerts/add_concert";
import { listConcertsCommand } from "./commands/concerts/list_concerts";
import { deleteConcertCommand } from "./commands/concerts/delete_concert";
import { deleteConcertConversation } from "./conversations/delete_concert";
import { type BotContext } from "./types/global";
import { editConcertCommand } from "./commands/concerts/edit_concert";
import { editConcertConversation } from "./conversations/edit_concert";

dotenv.config({ debug: false });

const bot = new Bot<BotContext>(process.env.BOT_TOKEN!);

bot.use(conversations());
bot.use(createConversation(addConcertConversation));
bot.use(createConversation(deleteConcertConversation));
bot.use(createConversation(editConcertConversation));

bot.command("add_concert", async (ctx: BotContext) => {
  await addConcertCommand(ctx);
});

bot.command("see_concerts", async (ctx: BotContext) => {
  await listConcertsCommand(ctx);
});

bot.command("delete_concert", async (ctx: BotContext) => {
  await deleteConcertCommand(ctx);
});

bot.command("edit_concert", async (ctx: BotContext) => {
  await editConcertCommand(ctx);
});

// Register commands
bot.command("start", startCommand);

if (process.env.NODE_ENV !== "test") {
  bot.start();
  console.log("🚀 Bot started!");
}

export { bot };
