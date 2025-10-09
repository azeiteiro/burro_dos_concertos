import { Bot } from "grammy";

const bot = new Bot("REDACTED_BOT_TOKEN"); // <-- put your bot token between the "" (https://t.me/BotFather)

// Reply to any message with "Hi there!".
bot.on("message", (ctx) =>
  ctx.reply("Olá eu sou o Burro dos Concertos e ainda só sei dizer isto!!!!!!")
);

console.log("Bot is running...");

bot.start();
