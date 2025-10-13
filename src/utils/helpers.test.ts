import { ask } from "./helpers";

describe("ask helper", () => {
  let ctx: any;
  let conversation: any;

  beforeEach(() => {
    ctx = {
      reply: jest.fn(),
      api: { answerCallbackQuery: jest.fn() },
    };
    conversation = { wait: jest.fn() };
  });

  it("returns validated text input", async () => {
    const validate = jest.fn((input: string) => input.toUpperCase());

    conversation.wait.mockResolvedValueOnce({
      message: { text: "hello" },
    });

    const result = await ask(conversation, ctx, "Question?", validate);

    expect(result).toBe("HELLO");
    expect(ctx.reply).toHaveBeenCalledWith("Question?", undefined);
    expect(validate).toHaveBeenCalledWith("hello");
  });

  it("handles optional skip callback", async () => {
    const validate = jest.fn();

    conversation.wait.mockResolvedValueOnce({
      callbackQuery: { id: "abc", data: "skip" },
    });

    const result = await ask(conversation, ctx, "Question?", validate, { optional: true });

    expect(result).toBeNull();
    expect(ctx.api.answerCallbackQuery).toHaveBeenCalledWith("abc");
    expect(ctx.reply).toHaveBeenCalledWith("⏭️ Skipped.");
  });

  it("replies with validation error and asks again", async () => {
    const validate = jest.fn().mockReturnValueOnce("❌ Invalid").mockReturnValueOnce("ok");

    conversation.wait
      .mockResolvedValueOnce({ message: { text: "bad" } })
      .mockResolvedValueOnce({ message: { text: "good" } });

    const result = await ask(conversation, ctx, "Question?", validate);

    expect(result).toBe("ok");
    expect(ctx.reply).toHaveBeenCalledWith("❌ Invalid");
  });

  it("replies on unexpected input", async () => {
    const validate = jest.fn((input: string) => input);

    conversation.wait
      .mockResolvedValueOnce({ unknown: true })
      .mockResolvedValueOnce({ message: { text: "final" } });

    const result = await ask(conversation, ctx, "Question?", validate);

    expect(result).toBe("final");
    expect(ctx.reply).toHaveBeenCalledWith("❌ Unexpected input. Reply with text or Skip.");
  });
});
