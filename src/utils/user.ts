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

export const isAdmin = async (ctx: BotContext) => {
  const telegramId = ctx.from?.id;
  if (!telegramId) return false;

  // Emergency fallback: if SUPER_ADMIN_ID is set, it bypasses DB check
  if (process.env.SUPER_ADMIN_ID && telegramId === Number(process.env.SUPER_ADMIN_ID)) {
    return true;
  }

  // Check database role
  const user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  // Admin and Moderator roles have admin privileges
  return user?.role === "Admin" || user?.role === "Moderator";
};
