// commands/list_concerts.ts
import { CommandContext, Context } from "grammy";
import { prisma } from "@/config/db";
import { format } from "date-fns";
import { logAction } from "@/utils/logger";

// Escape MarkdownV2 special characters
const escapeMarkdownV2 = (text: string): string =>
  text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");

// Format name as "Daniel A."
const formatUserName = (firstName?: string | null, lastName?: string | null) => {
  if (!firstName) return "";
  const lastInitial = lastName ? `${lastName.charAt(0).toUpperCase()}.` : "";
  return `${firstName} ${lastInitial}`.trim();
};

export const listConcertsCommand = async (ctx: CommandContext<Context>) => {
  try {
    const now = new Date();

    const concerts = await prisma.concert.findMany({
      where: { concertDate: { gte: now } },
      include: { user: true },
      orderBy: [{ concertDate: "asc" }, { concertTime: "asc" }],
    });

    if (concerts.length === 0) {
      await ctx.reply("🎶 No upcoming concerts found. Add one with /add_concert!");
      return;
    }

    // Group by month-year
    const grouped = concerts.reduce<Record<string, typeof concerts>>((acc, concert) => {
      const key = format(concert.concertDate, "MMMM yyyy"); // e.g. "December 2025"
      if (!acc[key]) acc[key] = [];
      acc[key].push(concert);
      return acc;
    }, {});

    // Build message
    const message = Object.entries(grouped)
      .map(([month, group]) => {
        // Make month header visually distinct
        const monthHeader = `🗓️✨ *${escapeMarkdownV2(month)}* ✨`;

        const concertsText = group
          .map((c) => {
            const date = format(c.concertDate, "yyyy-MM-dd");
            const time = c.concertTime ? format(c.concertTime, "HH:mm") : "";
            const urlPart = c.url ? `\n🔗 ${escapeMarkdownV2(c.url)}` : "";
            const notesPart = c.notes ? `\n📝 ${escapeMarkdownV2(c.notes)}` : "";

            const userName = formatUserName(c.user?.firstName, c.user?.lastName);
            const userPart = userName ? `\n👤 Added by ${escapeMarkdownV2(userName)}` : "";

            return `🎤 *${escapeMarkdownV2(c.artistName)}*\n🏟️ ${escapeMarkdownV2(c.venue)}\n📅 ${escapeMarkdownV2(date)}${time ? " " + escapeMarkdownV2(time) : ""}${urlPart}${notesPart}${userPart}`;
          })
          .join("\n\n"); // extra spacing between concerts

        // Add spacing above/below month header
        return `\n\n${monthHeader}\n\n${concertsText}`;
      })
      .join("\n\n"); // extra spacing between month sections

    logAction(ctx.msg.from?.id ?? 0, `Accessed concert list`);

    await ctx.reply(message, { parse_mode: "MarkdownV2" });
  } catch (err) {
    console.error("Failed to list concerts:", err);
    await ctx.reply("❌ Something went wrong while listing concerts.");
  }
};
