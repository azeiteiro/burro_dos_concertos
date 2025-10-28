import { findOrCreateUser, isAdmin } from "@/utils/user";
import { prisma } from "@/config/db";
import { BotContext } from "@/types/global";

jest.mock("@/config/db", () => ({
  prisma: {
    user: { upsert: jest.fn() },
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
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it("returns true if ctx.from.id matches SUPER_ADMIN_ID", () => {
    process.env.SUPER_ADMIN_ID = "12345";
    const ctx = { from: { id: 12345 } } as BotContext;

    expect(isAdmin(ctx)).toBe(true);
  });

  it("returns false if ctx.from.id does not match SUPER_ADMIN_ID", () => {
    process.env.SUPER_ADMIN_ID = "12345";
    const ctx = { from: { id: 67890 } } as BotContext;

    expect(isAdmin(ctx)).toBe(false);
  });

  it("returns false if ctx.from is undefined", () => {
    process.env.SUPER_ADMIN_ID = "12345";
    const ctx = {} as BotContext;

    expect(isAdmin(ctx)).toBe(false);
  });

  it("returns false if SUPER_ADMIN_ID is undefined", () => {
    delete process.env.SUPER_ADMIN_ID;
    const ctx = { from: { id: 12345 } } as BotContext;

    expect(isAdmin(ctx)).toBe(false);
  });
});
