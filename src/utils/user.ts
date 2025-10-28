import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";
import { UserFromGetMe } from "grammy/types";

export const findOrCreateUser = (tgUser: UserFromGetMe) => {
  return prisma.user.upsert({
    where: { telegramId: BigInt(tgUser.id) },
    update: {
      username: tgUser.username ?? undefined,
      firstName: tgUser.first_name ?? undefined,
      lastName: tgUser.last_name ?? undefined,
      languageCode: tgUser.language_code ?? undefined,
    },
    create: {
      telegramId: BigInt(tgUser.id),
      username: tgUser.username ?? undefined,
      firstName: tgUser.first_name ?? undefined,
      lastName: tgUser.last_name ?? undefined,
      languageCode: tgUser.language_code ?? undefined,
    },
  });
};

export const isAdmin = (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  // could also fetch from DB if you want dynamic role check
  return telegramId === Number(process.env.SUPER_ADMIN_ID);
};
