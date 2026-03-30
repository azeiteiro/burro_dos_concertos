import { syncArtistImagesCommand } from "#/commands/concerts/sync_artist_images";
import { syncAllArtistImages } from "#/services/artistImageService";
import { BotContext } from "#/types/global";

// Mock the service
jest.mock("#/services/artistImageService", () => ({
  syncAllArtistImages: jest.fn(),
}));

describe("syncArtistImagesCommand", () => {
  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCtx = {
      reply: jest.fn(),
    };
  });

  it("should sync and report success", async () => {
    const mockResult = {
      success: 5,
      failed: 0,
      skipped: 2,
      errors: [],
    };

    (syncAllArtistImages as jest.Mock).mockResolvedValue(mockResult);

    await syncArtistImagesCommand(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledWith("🎨 Syncing artist images for all concerts...");
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Success: 5"));
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Skipped: 2"));
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Failed: 0"));
  });

  it("should report failures with error details", async () => {
    const mockResult = {
      success: 3,
      failed: 2,
      skipped: 1,
      errors: ["Concert 5 (Artist A): Error 1", "Concert 8 (Artist B): Error 2"],
    };

    (syncAllArtistImages as jest.Mock).mockResolvedValue(mockResult);

    await syncArtistImagesCommand(mockCtx as BotContext);

    const lastCall = (mockCtx.reply as jest.Mock).mock.calls[1][0];
    expect(lastCall).toContain("Failed: 2");
    expect(lastCall).toContain("Artist A");
    expect(lastCall).toContain("Artist B");
  });

  it("should handle sync errors gracefully", async () => {
    (syncAllArtistImages as jest.Mock).mockRejectedValue(new Error("Database error"));

    await syncArtistImagesCommand(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("❌ Sync failed"));
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Database error"));
  });
});
