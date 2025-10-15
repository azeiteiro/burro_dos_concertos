import { prisma } from "@/config/db";
import { UserFromGetMe } from "grammy/types";

export async function findOrCreateUser(tgUser: UserFromGetMe) {
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
}
