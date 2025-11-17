import { Context } from "grammy";
import { prisma } from "../config/db";

export const startCommand = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || "friend";

  const existingUser = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (existingUser) {
    return ctx.reply("You are already registered!");
  }

  await prisma.user.create({
    data: {
      telegramId: telegramId!,
      username: ctx.from?.username || null,
      firstName,
    },
  });

  await ctx.reply(`Welcome, ${firstName}! You have been registered successfully.`);
};

export default startCommand;
