import { editConcertCommand } from "@/commands/concerts/edit_concert";
import { findOrCreateUser } from "@/utils/user";

jest.mock("@/utils/user", () => ({
  findOrCreateUser: jest.fn(),
}));

describe("editConcertCommand", () => {
  const mockReply = jest.fn();
  const mockConversationEnter = jest.fn();

  const createCtx = (from: any = { id: 123, username: "daniel" }) => ({
    from,
    reply: mockReply,
    conversation: {
      enter: mockConversationEnter,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("replies with error if no Telegram user", async () => {
    const ctx = {
      reply: mockReply,
      conversation: { enter: mockConversationEnter },
      from: undefined, // explicitly undefined
    };

    await editConcertCommand(ctx as any);

    expect(mockReply).toHaveBeenCalledWith("❌ Could not identify user.");
    expect(findOrCreateUser).not.toHaveBeenCalled();
    expect(mockConversationEnter).not.toHaveBeenCalled();
  });

  it("creates user if valid Telegram user", async () => {
    const ctx = createCtx();
    (findOrCreateUser as jest.Mock).mockResolvedValue({ id: 42 });

    await editConcertCommand(ctx as any);

    expect(findOrCreateUser).toHaveBeenCalledWith(ctx.from);
    expect(mockConversationEnter).toHaveBeenCalledWith("editConcertConversation", {
      dbUserId: 42,
    });
  });

  it("handles findOrCreateUser rejection gracefully", async () => {
    const ctx = createCtx();
    (findOrCreateUser as jest.Mock).mockRejectedValue(new Error("DB error"));

    await expect(editConcertCommand(ctx as any)).rejects.toThrow("DB error");
  });
});
