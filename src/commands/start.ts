import { Context } from "grammy";
import { prisma } from "../config/db";

export const startCommand = async (ctx: Context) => {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || "friend";

  const existingUser = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (existingUser) {
    return ctx.reply(ctx.t("already_registered"));
  }

  await prisma.user.create({
    data: {
      telegramId: telegramId!,
      username: ctx.from?.username || null,
      firstName,
    },
  });

  await ctx.reply(ctx.t("start_welcome", { name: firstName }));
};

export default startCommand;
