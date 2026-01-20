import { addConcertCommand } from "@/commands/concerts/add_concert";
import { deleteConcertCommand } from "@/commands/concerts/delete_concert";
import { editConcertCommand } from "@/commands/concerts/edit_concert";
import { listConcertsCommand } from "@/commands/concerts/list_concerts";
import { demoteUserCommand } from "@/commands/users/demote_user";
import { listUsersCommand } from "@/commands/users/list_users";
import { promoteUserCommand } from "@/commands/users/promote_user";
import { userInfoCommand } from "@/commands/users/user_info";
import { BotContext } from "@/types/global";
import { isAdmin } from "@/utils/user";
import { Bot } from "grammy";

export const registerCommands = (bot: Bot) => {
  // Concerts
  bot.command("add_concert", addConcertCommand);
  bot.command("see_concerts", listConcertsCommand);
  bot.command("delete_concert", deleteConcertCommand);
  bot.command("edit_concert", editConcertCommand);

  // Users (restricted)
  bot.command("list_users", async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Not authorized.");
    await listUsersCommand(ctx);
  });

  bot.command("promote_user", async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Not authorized.");
    await promoteUserCommand(ctx);
  });

  bot.command("demote_user", async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Not authorized.");
    await demoteUserCommand(ctx);
  });

  bot.command("user_info", async (ctx: BotContext) => {
    if (!(await isAdmin(ctx))) return ctx.reply("❌ Not authorized.");
    await userInfoCommand(ctx);
  });
};
