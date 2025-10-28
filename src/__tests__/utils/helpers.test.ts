import { ask, canDeleteConcert, canEditConcert } from "@/utils/helpers";

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

describe("Permission helpers", () => {
  const mockConcert = { id: 1, userId: 10, artistName: "Test", venue: "Venue" };

  describe("canDeleteConcert", () => {
    it("allows SuperAdmin to delete anything", () => {
      expect(canDeleteConcert("SuperAdmin", 1, 999)).toBe(true);
    });

    it("allows Admin to delete anything", () => {
      expect(canDeleteConcert("Admin", 1, 999)).toBe(true);
    });

    it("allows Moderator to delete own concert", () => {
      expect(canDeleteConcert("Moderator", 10, 10)).toBe(true);
    });

    it("prevents Moderator from deleting others' concerts", () => {
      expect(canDeleteConcert("Moderator", 10, 99)).toBe(false);
    });

    it("allows User to delete own concert", () => {
      expect(canDeleteConcert("User", 10, 10)).toBe(true);
    });

    it("prevents User from deleting others' concerts", () => {
      expect(canDeleteConcert("User", 10, 99)).toBe(false);
    });
  });

  describe("canEditConcert", () => {
    it("allows Admin to edit anything", () => {
      expect(canEditConcert(mockConcert as any, 999, "Admin")).toBe(true);
    });

    it("allows Moderator to edit anything", () => {
      expect(canEditConcert(mockConcert as any, 999, "Moderator")).toBe(true);
    });

    it("allows User to edit own concert", () => {
      expect(canEditConcert(mockConcert as any, 10, "User")).toBe(true);
    });

    it("prevents User from editing others' concerts", () => {
      expect(canEditConcert(mockConcert as any, 99, "User")).toBe(false);
    });

    it("prevents unknown role from editing", () => {
      expect(canEditConcert(mockConcert as any, 10, "Guest")).toBe(false);
    });
  });
});
