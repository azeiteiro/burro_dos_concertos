import { findOrCreateUser, isAdmin } from "@/utils/user";
import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";

jest.mock("@/config/db", () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

describe("findOrCreateUser", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates a new user if not existing", async () => {
    const tgUser = { id: 123, username: "testuser", first_name: "John", last_name: "Doe" };
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 1, telegramId: 123 });

    const result = await findOrCreateUser(tgUser as any);

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { telegramId: BigInt(123) },
      update: {
        username: "testuser",
        firstName: "John",
        lastName: "Doe",
        languageCode: undefined,
      },
      create: {
        telegramId: BigInt(123),
        username: "testuser",
        firstName: "John",
        lastName: "Doe",
        languageCode: undefined,
      },
    });
    expect(result).toEqual({ id: 1, telegramId: 123 });
  });

  it("updates existing user", async () => {
    const tgUser = { id: 456, username: "updated", first_name: "Alice" };
    (prisma.user.upsert as jest.Mock).mockResolvedValue({ id: 2, telegramId: 456 });

    const result = await findOrCreateUser(tgUser as any);

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { telegramId: BigInt(456) },
      update: {
        username: "updated",
        firstName: "Alice",
        lastName: undefined,
        languageCode: undefined,
      },
      create: {
        telegramId: BigInt(456),
        username: "updated",
        firstName: "Alice",
        lastName: undefined,
        languageCode: undefined,
      },
    });

    expect(result).toEqual({ id: 2, telegramId: 456 });
  });
});

describe("isAdmin", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns true if ctx.from.id matches SUPER_ADMIN_ID (emergency fallback)", async () => {
    process.env.SUPER_ADMIN_ID = "12345";
    const ctx = { from: { id: 12345 } } as BotContext;

    const result = await isAdmin(ctx);

    expect(result).toBe(true);
    // Should not query database when SUPER_ADMIN_ID matches
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns true if user role is Admin", async () => {
    delete process.env.SUPER_ADMIN_ID;
    const ctx = { from: { id: 67890 } } as BotContext;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "Admin" });

    const result = await isAdmin(ctx);

    expect(result).toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { telegramId: BigInt(67890) },
    });
  });

  it("returns true if user role is Moderator", async () => {
    delete process.env.SUPER_ADMIN_ID;
    const ctx = { from: { id: 11111 } } as BotContext;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "Moderator" });

    const result = await isAdmin(ctx);

    expect(result).toBe(true);
  });

  it("returns false if user role is User", async () => {
    delete process.env.SUPER_ADMIN_ID;
    const ctx = { from: { id: 22222 } } as BotContext;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: "User" });

    const result = await isAdmin(ctx);

    expect(result).toBe(false);
  });

  it("returns false if user is not found in database", async () => {
    delete process.env.SUPER_ADMIN_ID;
    const ctx = { from: { id: 99999 } } as BotContext;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await isAdmin(ctx);

    expect(result).toBe(false);
  });

  it("returns false if ctx.from is undefined", async () => {
    process.env.SUPER_ADMIN_ID = "12345";
    const ctx = {} as BotContext;

    const result = await isAdmin(ctx);

    expect(result).toBe(false);
  });
});
