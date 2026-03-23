import { announceConversation } from "#/conversations/announce";

// Mock logger
jest.mock("#/utils/logger", () => ({
  logAction: jest.fn(),
}));

describe("announceConversation", () => {
  let conversation: any;
  let ctx: any;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, GROUP_ID: "-100123456789" };

    conversation = {
      wait: jest.fn(),
      external: jest.fn((fn) => fn()),
    };

    ctx = {
      from: { id: 123 },
      reply: jest.fn(),
      api: {
        sendMessage: jest.fn(),
      },
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("requests announcement message from user", async () => {
    conversation.wait.mockResolvedValueOnce({
      message: { text: "/cancel" },
    });

    await announceConversation(conversation, ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("📢 *Send Announcement*"),
      expect.any(Object)
    );
  });

  it("handles cancellation", async () => {
    conversation.wait.mockResolvedValueOnce({
      message: { text: "/cancel" },
    });

    await announceConversation(conversation, ctx);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Announcement cancelled.");
  });

  it("shows preview and waits for confirmation", async () => {
    const messageText = "New concert alert!";

    conversation.wait
      .mockResolvedValueOnce({
        message: { text: messageText },
      })
      .mockResolvedValueOnce({
        callbackQuery: { data: "announce_cancel" },
        answerCallbackQuery: jest.fn(),
      });

    await announceConversation(conversation, ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("📝 *Preview:*"),
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: expect.any(Array),
        }),
      })
    );
  });

  it("sends message to group when confirmed", async () => {
    const messageText = "New concert announcement!";

    conversation.wait
      .mockResolvedValueOnce({
        message: { text: messageText },
      })
      .mockResolvedValueOnce({
        callbackQuery: { data: "announce_confirm" },
        answerCallbackQuery: jest.fn(),
      });

    await announceConversation(conversation, ctx);

    expect(ctx.api.sendMessage).toHaveBeenCalledWith("-100123456789", messageText, {
      parse_mode: "Markdown",
    });
    expect(ctx.reply).toHaveBeenCalledWith("✅ Announcement sent to the group successfully!");
  });

  it("handles missing GROUP_ID", async () => {
    delete process.env.GROUP_ID;

    await announceConversation(conversation, ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      "❌ GROUP_ID not configured. Cannot send announcements."
    );
  });

  it("handles send failure gracefully", async () => {
    const messageText = "Test announcement";

    conversation.wait
      .mockResolvedValueOnce({
        message: { text: messageText },
      })
      .mockResolvedValueOnce({
        callbackQuery: { data: "announce_confirm" },
        answerCallbackQuery: jest.fn(),
      });

    ctx.api.sendMessage.mockRejectedValueOnce(new Error("Send failed"));

    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await announceConversation(conversation, ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("❌ Failed to send announcement")
    );

    consoleErrorSpy.mockRestore();
  });

  it("handles non-text messages", async () => {
    conversation.wait.mockResolvedValueOnce({
      message: { photo: [] },
    });

    await announceConversation(conversation, ctx);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Please send a text message.");
  });
});
