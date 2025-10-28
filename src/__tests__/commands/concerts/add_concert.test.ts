jest.mock("@/config/db", () => ({
  prisma: {
    user: { upsert: jest.fn() },
  },
}));

import { addConcertCommand } from "@/commands/concerts/add_concert";
import { prisma } from "@/config/db";

describe("addConcertCommand", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      reply: jest.fn(),
      from: {
        id: 123,
        username: "test",
        first_name: "Test",
        last_name: "User",
        language_code: "en",
      },
      conversation: { enter: jest.fn() },
    };
  });

  it("replies error if ctx.from is missing", async () => {
    ctx.from = undefined;
    await addConcertCommand(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Could not identify user.");
  });

  it("upserts user and enters conversation", async () => {
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertCommand(ctx);

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { telegramId: BigInt(123) },
      })
    );
    expect(ctx.conversation.enter).toHaveBeenCalledWith("addConcertConversation", { dbUserId: 1 });
  });
});
