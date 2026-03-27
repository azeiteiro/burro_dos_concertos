import startCommand from "#/commands/start";
import { prisma } from "#/config/db";

jest.mock("#/config/db", () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn() },
  },
}));

jest.mock("#/config/logger");

describe("startCommand", () => {
  let ctx: any;

  beforeEach(() => {
    process.env.BOT_TOKEN = "test_token";
    ctx = {
      from: { id: 123, username: "test", first_name: "TestUser", last_name: "User" },
      reply: jest.fn(),
      t: jest.fn((key) => key), // simple mock for translation
      api: {
        getUserProfilePhotos: jest.fn(),
        getFile: jest.fn(),
      },
    };
  });

  it("replies with already_registered if user exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1 });
    await startCommand(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("You are already registered!");
  });

  it("creates a new user if not exists", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 });

    // Mock profile photo API calls
    ctx.api.getUserProfilePhotos.mockResolvedValue({
      photos: [[{ file_id: "photo123" }]],
    });
    ctx.api.getFile.mockResolvedValue({
      file_path: "photos/test.jpg",
    });

    await startCommand(ctx);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        telegramId: 123,
        username: "test",
        firstName: "TestUser",
        lastName: "User",
        profilePhotoUrl: "https://api.telegram.org/file/bottest_token/photos/test.jpg",
      },
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      "Welcome, TestUser! You have been registered successfully."
    );
  });

  it("defaults firstName to 'friend' if missing", async () => {
    ctx.from.first_name = undefined;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 });
    ctx.api.getUserProfilePhotos.mockResolvedValue({ photos: [] });

    await startCommand(ctx);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ firstName: "friend" }) })
    );
  });

  it("handles profile photo fetch failure gracefully", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1 });
    ctx.api.getUserProfilePhotos.mockRejectedValue(new Error("API error"));

    await startCommand(ctx);

    // Should still create user with null profilePhotoUrl
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        telegramId: 123,
        username: "test",
        firstName: "TestUser",
        lastName: "User",
        profilePhotoUrl: null,
      },
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      "Welcome, TestUser! You have been registered successfully."
    );
  });
});
