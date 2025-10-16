import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";

export const userInfoCommand = async (ctx: BotContext) => {
  const args = ctx.message?.text?.split(" ") ?? [];
  const id = parseInt(args[1], 10);

  if (!id) {
    await ctx.reply("❌ Usage: /user_info <userId>");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    await ctx.reply("❌ User not found.");
    return;
  }

  const msg = `
👤 User info
ID: ${user.id}
Username: ${user.username || "-"}
Name: ${user.firstName || ""} ${user.lastName || ""}
Language: ${user.languageCode || "-"}
Role: ${user.role || "User"}
Created: ${user.createdAt.toISOString()}
`;

  await ctx.reply(msg);
};
