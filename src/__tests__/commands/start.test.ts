import startCommand from "#/commands/start";
import { prisma } from "#/config/db";
import { syncUserProfilePhoto } from "#/services/profilePhotoService";

jest.mock("#/config/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("#/config/logger");
jest.mock("#/services/profilePhotoService", () => ({
  syncUserProfilePhoto: jest.fn(),
}));

describe("startCommand", () => {
  let ctx: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = {
      from: { id: 123, username: "test", first_name: "TestUser", last_name: "User" },
      reply: jest.fn(),
      api: {},
    };
  });

  it("replies with already_registered if user exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    await startCommand(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("You are already registered!");
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("creates a new user without storing any Telegram file URL", async () => {
    const createdUser = { id: 1 };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

    await startCommand(ctx);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        telegramId: 123,
        username: "test",
        firstName: "TestUser",
        lastName: "User",
      },
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      "Welcome, TestUser! You have been registered successfully."
    );
  });

  it("syncs the profile photo through the R2 service after registering", async () => {
    const createdUser = { id: 1 };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(createdUser);

    await startCommand(ctx);

    expect(syncUserProfilePhoto).toHaveBeenCalledWith(ctx.api, createdUser);
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

  it("still registers the user if profile photo sync fails", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 });
    (syncUserProfilePhoto as jest.Mock).mockRejectedValue(new Error("R2 down"));

    await expect(startCommand(ctx)).resolves.not.toThrow();

    expect(ctx.reply).toHaveBeenCalledWith(
      "Welcome, TestUser! You have been registered successfully."
    );
  });
});
