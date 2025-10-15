import { findOrCreateUser } from "@/utils/user";
import { prisma } from "@/config/db";

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
