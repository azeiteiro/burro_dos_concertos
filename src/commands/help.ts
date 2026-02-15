import { BotContext } from "@/types/global";
import { getUserByTelegramId } from "@/utils/helpers";

export const helpCommand = async (ctx: BotContext) => {
  if (ctx.chat?.type !== "private") {
    return ctx.reply("❌ Please use this command in a private chat.");
  }

  const userId = ctx.from?.id;
  if (!userId) return;

  let role: string;

  try {
    const user = await getUserByTelegramId(userId);
    role = user?.role || "User";
  } catch (err) {
    console.error("Failed to get user role:", err);
    // fallback: treat as normal user
    role = "User";
  }

  // Base commands for all users
  const baseCommands = [
    { command: "/help", description: "Show this help message" },
    { command: "/about", description: "Learn more about the bot" },
    { command: "/add_concert", description: "Add a new concert" },
    { command: "/see_concerts", description: "View upcoming concerts" },
    { command: "/edit_concert", description: "Edit your concerts" },
    { command: "/delete_concert", description: "Delete your concerts" },
  ];

  // User management (for Admins and SuperAdmins only)
  const adminCommands = [
    { command: "/list_users", description: "📋 List all users" },
    { command: "/promote_user", description: "⬆️ Promote a user to admin" },
    { command: "/demote_user", description: "⬇️ Demote an admin to user" },
    { command: "/user_info", description: "ℹ️ Get information about a user" },
  ];

  let allCommands = [...baseCommands];

  // Admins and SuperAdmins see everything
  if (role === "Admin" || role === "SuperAdmin") {
    allCommands = [...allCommands, ...adminCommands];
  }
  // Moderators and Users just see base commands (which includes concert management)

  const escapeMarkdown = (text: string) => text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");

  const message =
    `🤖 *Available Commands*\n\n` +
    allCommands
      .map((cmd) => `${escapeMarkdown(cmd.command)} — ${escapeMarkdown(cmd.description)}`)
      .join("\n");

  await ctx.reply(message, { parse_mode: "MarkdownV2" });
};
