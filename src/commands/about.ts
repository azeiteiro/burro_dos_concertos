import { BotContext } from "@/types/global";

export const aboutCommand = async (ctx: BotContext) => {
  if (ctx.chat?.type !== "private") {
    return ctx.reply("❌ Please use this command in a private chat.");
  }

  const message = [
    "🎵 *About This Bot*",
    "",
    "This bot helps manage concerts — add, edit, or view upcoming shows easily.",
    "",
    "🧑‍💻 *Developed by*: Daniel Azeiteiro",
    "🌍 *Powered by*: Node\\.js, Grammy, and PostgreSQL",
    "",
    "You can use `/help` to see all available commands.",
  ].join("\n");

  // Escape MarkdownV2 special characters
  const escapeMarkdown = (text: string) => text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");

  await ctx.reply(escapeMarkdown(message), { parse_mode: "MarkdownV2" });
};
