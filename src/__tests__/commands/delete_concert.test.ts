import { deleteConcertCommand } from "@/commands/delete_concert";
import { prisma } from "@/config/db";
import { CommandContext } from "grammy";
import { ConversationFlavor } from "@grammyjs/conversations";
import { BotContext } from "@/types/global";

// ---- Mock Prisma ----
jest.mock("@/config/db", () => ({
  prisma: {
    user: { upsert: jest.fn() },
  },
}));

describe("deleteConcertCommand", () => {
  const tgUser = {
    id: 12345,
    username: "john_doe",
    first_name: "John",
    last_name: "Doe",
    language_code: "en",
  };

  const dbUser = { id: 2, telegramId: BigInt(tgUser.id) };

  it("replies with an error if user not found in context", async () => {
    const ctx: Partial<CommandContext<ConversationFlavor<BotContext>>> = {
      from: undefined,
      reply: jest.fn(),
    };

    await deleteConcertCommand(ctx as any);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Could not identify user.");
    expect(prisma.user.upsert).not.toHaveBeenCalled();
  });

  it("upserts the user and enters the deleteConcertConversation", async () => {
    (prisma.user.upsert as jest.Mock).mockResolvedValue(dbUser);

    const enterMock = jest.fn();
    const ctx: Partial<CommandContext<ConversationFlavor<BotContext>>> = {
      from: tgUser,
      conversation: { enter: enterMock } as any,
      reply: jest.fn(),
    };

    await deleteConcertCommand(ctx as any);

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { telegramId: BigInt(tgUser.id) },
      update: {
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        languageCode: tgUser.language_code,
      },
      create: {
        telegramId: BigInt(tgUser.id),
        username: tgUser.username,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        languageCode: tgUser.language_code,
      },
    });

    expect(enterMock).toHaveBeenCalledWith("deleteConcertConversation", { dbUserId: dbUser.id });
  });
});
