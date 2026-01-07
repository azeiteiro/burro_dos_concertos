import { Bot } from "grammy";
import * as concerts from "@/commands/concerts/add_concert";
import * as deleteConcert from "@/commands/concerts/delete_concert";
import * as editConcert from "@/commands/concerts/edit_concert";
import * as listConcerts from "@/commands/concerts/list_concerts";
import * as users from "@/commands/users/list_users";
import * as promoteUser from "@/commands/users/promote_user";
import * as demoteUser from "@/commands/users/demote_user";
import * as userInfo from "@/commands/users/user_info";
import { isAdmin } from "@/utils/user";
import { registerCommands } from "@/bot/commands";

jest.mock("@/commands/concerts/add_concert");
jest.mock("@/commands/concerts/delete_concert");
jest.mock("@/commands/concerts/edit_concert");
jest.mock("@/commands/concerts/list_concerts");
jest.mock("@/commands/users/list_users");
jest.mock("@/commands/users/promote_user");
jest.mock("@/commands/users/demote_user");
jest.mock("@/commands/users/user_info");
jest.mock("@/utils/user");

describe("registerCommands", () => {
  let bot: any;
  let ctx: any;

  beforeEach(() => {
    bot = {
      command: jest.fn(),
    };

    (isAdmin as jest.Mock).mockReturnValue(true); // default admin
    ctx = { reply: jest.fn() };
    jest.clearAllMocks();
  });

  it("registers all concert commands", () => {
    registerCommands(bot as unknown as Bot);

    expect(bot.command).toHaveBeenCalledWith("add_concert", concerts.addConcertCommand);
    expect(bot.command).toHaveBeenCalledWith("see_concerts", listConcerts.listConcertsCommand);
    expect(bot.command).toHaveBeenCalledWith("delete_concert", deleteConcert.deleteConcertCommand);
    expect(bot.command).toHaveBeenCalledWith("edit_concert", editConcert.editConcertCommand);
  });

  it("registers all user commands with admin check", async () => {
    registerCommands(bot as unknown as Bot);

    const listUsersCallback = bot.command.mock.calls.find(
      (call: any) => call[0] === "list_users"
    )[1];
    await listUsersCallback(ctx);
    expect(users.listUsersCommand).toHaveBeenCalledWith(ctx);

    const promoteCallback = bot.command.mock.calls.find(
      (call: any) => call[0] === "promote_user"
    )[1];
    await promoteCallback(ctx);
    expect(promoteUser.promoteUserCommand).toHaveBeenCalledWith(ctx);

    const demoteCallback = bot.command.mock.calls.find((call: any) => call[0] === "demote_user")[1];
    await demoteCallback(ctx);
    expect(demoteUser.demoteUserCommand).toHaveBeenCalledWith(ctx);

    const infoCallback = bot.command.mock.calls.find((call: any) => call[0] === "user_info")[1];
    await infoCallback(ctx);
    expect(userInfo.userInfoCommand).toHaveBeenCalledWith(ctx);
  });

  it("blocks non-admin user for user commands", async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    registerCommands(bot as unknown as Bot);

    const listUsersCallback = bot.command.mock.calls.find(
      (call: any) => call[0] === "list_users"
    )[1];
    await listUsersCallback(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Not authorized.");

    const promoteCallback = bot.command.mock.calls.find(
      (call: any) => call[0] === "promote_user"
    )[1];
    await promoteCallback(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Not authorized.");

    const demoteCallback = bot.command.mock.calls.find((call: any) => call[0] === "demote_user")[1];
    await demoteCallback(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Not authorized.");

    const infoCallback = bot.command.mock.calls.find((call: any) => call[0] === "user_info")[1];
    await infoCallback(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Not authorized.");
  });
});
