import { syncPhotosCommand } from "#/commands/users/sync_photos";
import { fetchAllUserProfilePhotos } from "#/services/profilePhotoService";
import { BotContext } from "#/types/global";

jest.mock("#/services/profilePhotoService", () => ({
  fetchAllUserProfilePhotos: jest.fn(),
}));

describe("/sync_photos command", () => {
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx = {
      reply: jest.fn(),
      from: { id: 123456 },
      api: {} as any,
    };
  });

  it("triggers sync and returns success message", async () => {
    const mockResult = {
      success: 18,
      failed: 2,
      errors: ["User 5: Bot was blocked", "User 12: Network timeout"],
    };

    (fetchAllUserProfilePhotos as jest.Mock).mockResolvedValue(mockResult);

    await syncPhotosCommand(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledWith("🔄 Syncing profile photos for all users...");
    expect(fetchAllUserProfilePhotos).toHaveBeenCalledWith(mockCtx.api);
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("✅ Sync complete! Success: 18/20")
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("⚠️ Failed users:"));
  });

  it("handles sync with no errors", async () => {
    const mockResult = {
      success: 20,
      failed: 0,
      errors: [],
    };

    (fetchAllUserProfilePhotos as jest.Mock).mockResolvedValue(mockResult);

    await syncPhotosCommand(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("✅ Sync complete! Success: 20/20")
    );
    expect(mockCtx.reply).not.toHaveBeenCalledWith(expect.stringContaining("⚠️ Failed users:"));
  });

  it("handles fatal errors gracefully", async () => {
    (fetchAllUserProfilePhotos as jest.Mock).mockRejectedValue(
      new Error("Database connection failed")
    );

    await syncPhotosCommand(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("❌ Sync failed: Database connection failed")
    );
  });
});
