import startCommand from "@/commands/start";
import { prisma } from "@/config/db";

jest.mock("@/config/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

describe("startCommand", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      from: { id: 123, username: "test", first_name: "TestUser" },
      reply: jest.fn(),
      t: jest.fn((key) => key), // simple mock for translation
    };
  });

  it("replies with already_registered if user exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    await startCommand(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("already_registered");
  });

  it("creates a new user if not exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 });

    await startCommand(ctx);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        telegramId: 123,
        username: "test",
        firstName: "TestUser",
      },
    });
    expect(ctx.reply).toHaveBeenCalledWith("start_welcome");
  });

  it("defaults firstName to 'friend' if missing", async () => {
    ctx.from.first_name = undefined;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 });

    await startCommand(ctx);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ firstName: "friend" }) })
    );
  });
});
