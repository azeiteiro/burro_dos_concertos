import dotenv from "dotenv";
import { Bot, type Context } from "grammy";
import {
  type ConversationFlavor,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import i18n from "./config/i18n";
import startCommand from "./commands/start";
import { addConcertConversation } from "./conversations/add_concert";
import { addConcertCommand } from "./commands/add_concert";
import { listConcertsCommand } from "./commands/list_concerts";

dotenv.config();

const bot = new Bot<ConversationFlavor<Context>>(process.env.BOT_TOKEN!);

bot.use(conversations());
bot.use(createConversation(addConcertConversation));

bot.command("add_concert", async (ctx) => {
  await addConcertCommand(ctx);
});

bot.command("see_concerts", async (ctx) => {
  await listConcertsCommand(ctx);
});

// Middleware to attach a translator to ctx
bot.use(async (ctx, next) => {
  const lang = ctx.from?.language_code || "en";
  const t = (key: string, options?: Record<string, unknown>) =>
    i18n.getFixedT(lang, "common")(key, options);
  ctx.t = t;
  await next();
});

// Register commands
bot.command("start", startCommand);

bot.start();
console.log("🚀 Bot started!");
