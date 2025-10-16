import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";

const roles = ["User", "Moderator", "Admin", "SuperAdmin"];

export const demoteUserCommand = async (ctx: BotContext) => {
  const args = ctx.message?.text?.split(" ") ?? [];
  const id = parseInt(args[1], 10);

  if (!id) {
    await ctx.reply("❌ Usage: /demote <userId>");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return ctx.reply("❌ User not found.");

  const currentIndex = roles.indexOf(user.role || "User");
  if (currentIndex <= 0) return ctx.reply("⚠️ Already at lowest role.");

  const newRole = roles[currentIndex - 1];

  await prisma.user.update({
    where: { id },
    data: { role: newRole },
  });

  await ctx.reply(`✅ User ${user.username || id} demoted to ${newRole}`);
};
