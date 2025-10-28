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

  it("prevents deleting another user's concert for a normal user", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "2" } } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
      userRole: "User",
    });

    expect(ctx.reply).toHaveBeenCalledWith("❌ You are not allowed to delete this concert.");
    expect(prisma.concert.delete).not.toHaveBeenCalled();
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
});
