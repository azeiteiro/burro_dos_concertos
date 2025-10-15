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

describe("deleteConcertConversation", () => {
  let ctx: ReturnType<typeof MockContext>;
  let conversation: jest.Mocked<Conversation<Context>>;

  const dbUser = createMockUser({ id: 2 });
  const concerts = [
    createMockConcert({ id: 1, userId: dbUser.id, artistName: "Arctic Monkeys" }),
    createMockConcert({ id: 2, userId: dbUser.id, artistName: "The Killers" }),
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = MockContext({ from: { id: Number(dbUser.telegramId) } });
    conversation = MockConversation();
  });

  it("shows message when user has no upcoming concerts", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
    });

    expect(ctx.reply).toHaveBeenCalledWith("🎶 You have no upcoming concerts to delete.");
  });

  it("shows the list of concerts and cancels if user types 0", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "0" } } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
    });

    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Select the concert you want to delete")
    );
    expect(ctx.reply).toHaveBeenCalledWith("❌ Deletion cancelled.");
  });

  it("shows error if user inputs invalid number", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "99" } } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
    });

    expect(ctx.reply).toHaveBeenCalledWith(
      "❌ Invalid number. Please try again with /delete_concert."
    );
  });

  it("deletes selected concert after confirmation", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    const answerCallbackQuery = jest.fn();

    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } } as any);
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      match: ["confirm_delete:1"],
      answerCallbackQuery,
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
    });

    const replyCalls = ctx.reply.mock.calls.map((c) => c[0]);
    expect(replyCalls.some((msg) => msg.includes("Are you sure you want to delete"))).toBe(true);
    expect(prisma.concert.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(replyCalls.some((msg) => msg.includes("🗑️ Deleted"))).toBe(true);
    expect(answerCallbackQuery).toHaveBeenCalled();
  });

  it("cancels deletion after pressing no", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue(concerts);

    conversation.wait.mockResolvedValueOnce({ message: { text: "2" } } as any);
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      match: ["cancel_delete"],
      answerCallbackQuery: jest.fn(),
    } as any);

    await deleteConcertConversation(conversation, ctx as unknown as Context, {
      dbUserId: dbUser.id,
    });

    expect(ctx.reply).toHaveBeenCalledWith("❌ Deletion cancelled.");
    expect(prisma.concert.delete).not.toHaveBeenCalled();
  });
});
