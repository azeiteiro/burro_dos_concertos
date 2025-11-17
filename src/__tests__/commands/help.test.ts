import { helpCommand } from "@/commands/help";
import { getUserByTelegramId } from "@/utils/helpers";
import { BotContext } from "@/types/global";

// Mock DB helper
jest.mock("@/utils/helpers", () => ({
  getUserByTelegramId: jest.fn(),
}));

const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
  console.error = originalError;
});

describe("helpCommand", () => {
  let replyMock: jest.Mock;
  let ctx: Partial<BotContext>;

  beforeEach(() => {
    replyMock = jest.fn();
    ctx = {
      chat: { type: "private" },
      from: { id: 123 },
      reply: replyMock,
    };
    (getUserByTelegramId as jest.Mock).mockReset();
  });

  // Use escaped strings to match MarkdownV2
  const escape = (s: string) => s.replace(/_/g, "\\_");

  it("replies with user commands in private chat", async () => {
    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "User" });

    await helpCommand(ctx as BotContext);

    const text = replyMock.mock.calls[0][0];

    expect(text).toContain("/start");
    expect(text).toContain(escape("/add_concert"));
    expect(text).toContain(escape("/see_concerts"));
    expect(text).toContain(escape("/delete_concert"));
    expect(text).toContain(escape("/edit_concert"));
    expect(text).toContain("/about");

    expect(text).not.toContain(escape("/list_users"));
    expect(text).not.toContain(escape("/promote_user"));
  });

  it("replies with admin commands in private chat", async () => {
    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "Admin" });

    await helpCommand(ctx as BotContext);

    const text = replyMock.mock.calls[0][0];

    expect(text).toContain("/start");
    expect(text).toContain(escape("/add_concert"));

    expect(text).toContain(escape("/list_users"));
    expect(text).toContain(escape("/promote_user"));
    expect(text).toContain(escape("/demote_user"));
    expect(text).toContain(escape("/user_info"));
  });

  it("replies with warning if command is used in a group chat", async () => {
    ctx.chat = { type: "group" };

    await helpCommand(ctx as BotContext);

    expect(replyMock).toHaveBeenCalledWith("❌ Please use this command in a private chat.");
  });

  it("does nothing if from.id is missing", async () => {
    ctx.from = undefined;

    await helpCommand(ctx as BotContext);

    expect(replyMock).not.toHaveBeenCalled();
  });

  it("handles DB errors gracefully", async () => {
    (getUserByTelegramId as jest.Mock).mockRejectedValue(new Error("DB fail"));

    // Fallback: treat as normal user if DB fails
    await helpCommand(ctx as BotContext);

    const text = replyMock.mock.calls[0][0];
    expect(text).toContain("/start");
    expect(text).toContain(escape("/add_concert"));
  });
});
