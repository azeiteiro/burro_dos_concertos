import { prisma } from "@/config/db";
import { Concert } from "@prisma/client";
import { Bot } from "grammy";

const GROUP_ID = process.env.GROUP_ID!;

export const formatConcertList = (title: string, concerts: Concert[]) => {
  let msg = `🎶 *${title}*\n\n`;
  concerts.forEach((c) => {
    const dateStr = c.concertDate.toISOString().split("T")[0];
    const timeStr = c.concertTime ? c.concertTime.toTimeString().slice(0, 5) : "";
    msg += `• ${c.artistName} – ${c.venue} (${dateStr} ${timeStr})\n`;
  });
  return msg;
};

export const sendTodayConcerts = async (bot: Bot) => {
  const today = new Date();
  const concerts = await prisma.concert.findMany({
    where: { concertDate: today },
    orderBy: { concertTime: "asc" },
  });

  if (!concerts.length) return;
  await bot.api.sendMessage(GROUP_ID, formatConcertList("Today’s concerts", concerts), {
    parse_mode: "Markdown",
  });
};

export const sendWeekConcerts = async (bot: Bot) => {
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const concerts = await prisma.concert.findMany({
    where: {
      concertDate: { gte: today, lte: nextWeek },
    },
    orderBy: { concertDate: "asc" },
  });

  if (!concerts.length) return;
  await bot.api.sendMessage(GROUP_ID, formatConcertList("This Week’s concerts", concerts), {
    parse_mode: "Markdown",
  });
};

export const sendMonthConcerts = async (bot: Bot) => {
  const today = new Date();
  const startMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const concerts = await prisma.concert.findMany({
    where: {
      concertDate: { gte: startMonth, lte: endMonth },
    },
    orderBy: { concertDate: "asc" },
  });

  if (!concerts.length) return;
  await bot.api.sendMessage(GROUP_ID, formatConcertList("This Month’s concerts", concerts), {
    parse_mode: "Markdown",
  });
};
