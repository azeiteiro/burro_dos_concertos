import { prisma } from "#/config/db";
import { BotContext } from "#/types/global";

export const listUsersCommand = async (ctx: BotContext) => {
  const users = await prisma.user.findMany({
    orderBy: { id: "asc" },
  });

  if (!users.length) {
    await ctx.reply("No users found.");
    return;
  }

  let msg = "👥 Users list:\n\n";
  users.forEach((u) => {
    msg += `• ${u.username || u.firstName || "Unknown"} (ID: ${u.id}) — Role: ${u.role || "User"}\n`;
  });

  await ctx.reply(msg);
};
