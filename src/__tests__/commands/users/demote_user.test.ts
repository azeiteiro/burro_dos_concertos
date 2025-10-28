import { prisma } from "@/config/db";
import { logAction } from "@/utils/logger";
import { roles } from "@/utils/constants";
import { demoteUserCommand } from "@/commands/users/demote_user";

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

describe("demoteUserCommand", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should reply with usage message if no id is provided", async () => {
    const ctx = createCtx("/demote");
    await demoteUserCommand(ctx as any);
    expect(ctx.reply).toHaveBeenCalledWith("❌ Usage: /demote <userId>");
  });

  it("should reply if user is not found", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const ctx = createCtx("/demote 123");
    await demoteUserCommand(ctx as any);
    expect(ctx.reply).toHaveBeenCalledWith("❌ User not found.");
  });

  it("should reply if user already has the lowest role", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 123,
      username: "testUser",
      role: roles[0], // "User"
    });

    const ctx = createCtx("/demote 123");
    await demoteUserCommand(ctx as any);

    expect(ctx.reply).toHaveBeenCalledWith("⚠️ Already at lowest role.");
  });

  it("should demote user and log action", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 123,
      username: "testUser",
      role: roles[2], // e.g. Moderator
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const ctx = createCtx("/demote 123");
    await demoteUserCommand(ctx as any);

    const newRole = roles[1]; // one below Moderator (Admin if roles = [User, Admin, Moderator, SuperAdmin])

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 123 },
      data: { role: newRole },
    });

    expect(logAction).toHaveBeenCalledWith(
      999, // the admin Telegram ID
      expect.stringContaining("Demoted user testUser")
    );

    expect(ctx.reply).toHaveBeenCalledWith(
      `✅ User testUser demoted to ${newRole} by admin with Telegram ID 999`
    );
  });
});
