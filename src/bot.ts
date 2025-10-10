import dotenv from "dotenv";
import startCommand from "./commands/start";
import i18n from "./config/i18n";
import { Bot } from "grammy";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN!);

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
