import { BotContext } from "#/types/global";

export const aboutCommand = async (ctx: BotContext) => {
  if (ctx.chat?.type !== "private") {
    return ctx.reply("❌ Please use this command in a private chat.");
  }

  const message = [
    "🎵 *About Burro dos Concertos*",
    "",
    "A bot to help your group track and never miss concerts\\!",
    "",
    "✨ *Features*:",
    "• Add and manage concerts",
    "• Automated reminders",
    "• Group notifications",
    "• Admin controls",
    "",
    "🧑‍💻 *Developed by*: Daniel Azeiteiro",
    "🌍 *Tech Stack*: Node\\.js, grammY, PostgreSQL, Prisma",
    "💻 *Open Source*: [GitHub](https://github\\.com/azeiteiro/burro_dos_concertos)",
    "",
    "📖 Use /help to see all commands",
    "🐛 Found a bug? [Report it](https://github\\.com/azeiteiro/burro_dos_concertos/issues)",
  ].join("\n");

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
};
