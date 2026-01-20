import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";
import { roles } from "@/utils/constants";
import { logAction } from "@/utils/logger";

export const demoteUserCommand = async (ctx: BotContext) => {
  const args = ctx.message?.text?.split(" ") ?? [];
  const id = parseInt(args[1], 10);
  const actorId = ctx.from?.id; // 👈 Telegram ID of the admin executing the command

  if (!id) {
    await ctx.reply("❌ Usage: /demote <userId>");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    await ctx.reply("❌ User not found.");
    return;
  }

  // Prevent self-demotion
  if (user.telegramId === BigInt(actorId ?? 0)) {
    await ctx.reply("❌ You cannot demote yourself.");
    return;
  }

  const currentIndex = roles.indexOf(user.role || "User");
  if (currentIndex <= 0) {
    await ctx.reply("⚠️ Already at lowest role.");
    return;
  }

  const newRole = roles[currentIndex - 1];

  await prisma.user.update({
    where: { id },
    data: { role: newRole },
  });

  // ✅ Log who did it and what happened
  logAction(actorId ?? 0, `Demoted user ${user.username || id} (ID: ${id}) to ${newRole}`);

  await ctx.reply(
    `✅ User ${user.username || id} demoted to ${newRole} by admin with Telegram ID ${actorId}`
  );
};
