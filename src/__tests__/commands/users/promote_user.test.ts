import { prisma } from "@/config/db";
import { logAction } from "@/utils/logger";
import { roles } from "@/utils/constants";
import { promoteUserCommand } from "@/commands/users/promote_user";

jest.mock("@/config/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/utils/logger", () => ({
  logAction: jest.fn(),
}));

const createCtx = (text: string) => ({
  message: { text },
  reply: jest.fn(),
  from: { id: 999, username: "adminUser" },
});

describe("promoteUserCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reply with usage message if no id is provided", async () => {
    const ctx = createCtx("/promote");
    await promoteUserCommand(ctx as any);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Usage: /promote <userId>");
  });

  it("should reply if user is not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const ctx = createCtx("/promote 123");
    await promoteUserCommand(ctx as any);
    expect(ctx.reply).toHaveBeenCalledWith("❌ User not found.");
  });

  it("should reply if user already has highest role", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 123,
      username: "testUser",
      role: roles[roles.length - 1],
    });

    const ctx = createCtx("/promote 123");
    await promoteUserCommand(ctx as any);
    expect(ctx.reply).toHaveBeenCalledWith("⚠️ Already at highest role.");
  });

  it("should promote user and log action", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 123,
      username: "testUser",
      role: "User",
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const ctx = createCtx("/promote 123");
    await promoteUserCommand(ctx as any);

    const newRole = roles[roles.indexOf("User") + 1];

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 123 },
      data: { role: newRole },
    });

    expect(logAction).toHaveBeenCalledWith(
      999, // the admin who executed the command
      expect.stringContaining("Promoted user")
    );

    expect(ctx.reply).toHaveBeenCalledWith(
      `✅ User testUser promoted to ${newRole} by admin with Telegram ID 999`
    );
  });
});
