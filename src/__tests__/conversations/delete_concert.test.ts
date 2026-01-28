import { deleteConcertConversation } from "@/conversations/delete_concert";
import { prisma } from "@/config/db";
import { MockContext } from "@/__tests__/mocks/grammy";
import { createMockConcert, createMockUser } from "@/__tests__/mocks/prismaMocks";
import { Conversation } from "@grammyjs/conversations";
import { Context } from "grammy";

// ---- Mock Prisma ----
jest.mock("@/config/db", () => ({
  prisma: {
    concert: { findMany: jest.fn(), delete: jest.fn() },
  },
}));

// ---- Mock Conversation ----
const MockConversation = (
  overrides: Partial<jest.Mocked<Conversation<Context>>> = {}
): jest.Mocked<Conversation<Context>> =>
  ({
    wait: jest.fn(),
    waitForCallbackQuery: jest.fn(),
    ...overrides,
  }) as Partial<jest.Mocked<Conversation<Context>>> as jest.Mocked<Conversation<Context>>;

describe("deleteConcertConversation with permissions", () => {
  let ctx: ReturnType<typeof MockContext>;
  let conversation: jest.Mocked<Conversation<Context>>;

  const dbUser = createMockUser({ id: 2, role: "User" });
  const otherUser = createMockUser({ id: 3, role: "User" });

  const concerts = [
    createMockConcert({ id: 1, userId: dbUser.id, artistName: "Arctic Monkeys" }),
    createMockConcert({ id: 2, userId: otherUser.id, artistName: "The Killers" }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = MockContext({ from: { id: Number(dbUser.telegramId) } });
    conversation = MockConversation();
  });

  it("only shows own concerts for a normal user", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } } as any);
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      match: ["confirm_delete", "1"],
      update: { callback_query: { id: "test" } },
      answerCallbackQuery: jest.fn(),
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    // Should only show own concert (Arctic Monkeys), not The Killers
    const replyCall = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(replyCall).toContain("Arctic Monkeys");
    expect(replyCall).not.toContain("The Killers");

    // Should successfully delete own concert
    expect(prisma.concert.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it("allows deleting own concert for a normal user", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    const answerCallbackQuery = jest.fn();
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } } as any);
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      match: ["confirm_delete:1"],
      answerCallbackQuery,
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(prisma.concert.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(answerCallbackQuery).toHaveBeenCalled();
  });

  it("allows Admin to delete any concert", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    const answerCallbackQuery = jest.fn();
    conversation.wait.mockResolvedValueOnce({ message: { text: "2" } } as any);
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      match: ["confirm_delete:2"],
      answerCallbackQuery,
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "Admin",
    });

    expect(prisma.concert.delete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(answerCallbackQuery).toHaveBeenCalled();
  });

  it("cancels deletion when pressing no", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } } as any);
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      match: ["cancel_delete"],
      answerCallbackQuery: jest.fn(),
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(prisma.concert.delete).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("❌ Deletion cancelled.");
  });

  it("shows message when no concerts available to delete", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(ctx.reply).toHaveBeenCalledWith("🎶 No upcoming concerts you are allowed to delete.");
    expect(conversation.wait).not.toHaveBeenCalled();
  });

  it("handles cancel button press during selection", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({
      callbackQuery: { id: "123", data: "cancel_delete_select" },
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(ctx.reply).toHaveBeenCalledWith("❌ Deletion cancelled.");
    expect(prisma.concert.delete).not.toHaveBeenCalled();
  });

  it("handles invalid input (not a message)", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({
      callbackQuery: { data: "some_other_action" },
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(ctx.reply).toHaveBeenCalledWith(
      "❌ Invalid input. Please try again with /delete_concert."
    );
    expect(prisma.concert.delete).not.toHaveBeenCalled();
  });

  it("handles invalid number input", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "999" } } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(ctx.reply).toHaveBeenCalledWith(
      "❌ Invalid number. Please try again with /delete_concert."
    );
    expect(prisma.concert.delete).not.toHaveBeenCalled();
  });

  it("handles non-numeric input", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "abc" } } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(ctx.reply).toHaveBeenCalledWith(
      "❌ Invalid number. Please try again with /delete_concert."
    );
    expect(prisma.concert.delete).not.toHaveBeenCalled();
  });
});
