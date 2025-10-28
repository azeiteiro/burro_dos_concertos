import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";
import { roles } from "@/utils/constants";
import { logAction } from "@/utils/logger";

export const promoteUserCommand = async (ctx: BotContext) => {
  const args = ctx.message?.text?.split(" ") ?? [];
  const id = parseInt(args[1], 10);
  const actorId = ctx.from?.id; // 👈 Telegram ID of the admin

  if (!id) {
    await ctx.reply("❌ Usage: /promote <userId>");
    return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    await ctx.reply("❌ User not found.");
    return;
  }

  const currentIndex = roles.indexOf(user.role || "User");
  if (currentIndex === roles.length - 1) {
    await ctx.reply("⚠️ Already at highest role.");
    return;
  }

  const newRole = roles[currentIndex + 1];

  await prisma.user.update({
    where: { id },
    data: { role: newRole },
  });

  // ✅ Log both who did it and what happened
  logAction(actorId ?? 0, `Promoted user ${user.username || id} (ID: ${id}) to ${newRole}`);

  await ctx.reply(
    `✅ User ${user.username || id} promoted to ${newRole} by admin with Telegram ID ${actorId}`
  );
};
