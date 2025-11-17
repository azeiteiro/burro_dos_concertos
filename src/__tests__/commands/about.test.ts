import { aboutCommand } from "@/commands/about";
import { BotContext } from "@/types/global";

describe("aboutCommand", () => {
  // Silence logs for clean output
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

  const createCtx = (overrides: Partial<BotContext> = {}): BotContext => {
    return {
      chat: { type: "private" },
      reply: jest.fn(),
      ...overrides,
    } as unknown as BotContext;
  };

  it("replies with the about message in private chat", async () => {
    const ctx = createCtx();

    await aboutCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);

    const [sentText, options] = (ctx.reply as jest.Mock).mock.calls[0];

    expect(options).toEqual({ parse_mode: "MarkdownV2" });

    // Check escaped MarkdownV2 special characters in text
    expect(sentText).toContain("*About This Bot*".replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1"));
    expect(sentText).toContain("*Developed by*".replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1"));
    expect(sentText).toContain("/help".replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1"));

    // Ensure emojis are present (not escaped)
    expect(sentText).toContain("🧑‍💻");
    expect(sentText).toContain("🌍");
    expect(sentText).toContain("🎵");
  });

  it("rejects group chats with an error message", async () => {
    const ctx = createCtx({
      chat: { type: "group" },
    });

    await aboutCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Please use this command in a private chat.");
  });
});
