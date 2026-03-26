import { Bot } from "grammy";
import { fetchAllUserProfilePhotos } from "#/services/profilePhotoService";
import { prisma } from "#/config/db";

// Mock Grammy Bot API
jest.mock("grammy", () => ({
  Bot: jest.fn(),
}));

// Mock Prisma
jest.mock("#/config/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe("ProfilePhotoService", () => {
  let mockBot: jest.Mocked<Bot>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBot = {
      api: {
        getUserProfilePhotos: jest.fn(),
        getFile: jest.fn(),
      },
      token: "test_bot_token_123",
    } as any;
  });

  describe("fetchAllUserProfilePhotos", () => {
    it("fetches and updates profile photo for user with photo", async () => {
      const mockUsers = [
        {
          id: 1,
          telegramId: BigInt(123456789),
          firstName: "John",
          username: "john_doe",
        },
      ];

      const mockPhotos = {
        total_count: 1,
        photos: [
          [
            { file_id: "small_123", width: 160, height: 160 },
            { file_id: "medium_123", width: 320, height: 320 },
          ],
        ],
      };

      const mockFile = {
        file_id: "small_123",
        file_unique_id: "unique_123",
        file_path: "photos/file_123.jpg",
      };

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockBot.api.getUserProfilePhotos.mockResolvedValue(mockPhotos as any);
      mockBot.api.getFile.mockResolvedValue(mockFile as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockBot.api.getUserProfilePhotos).toHaveBeenCalledWith(123456789, {
        limit: 1,
      });
      expect(mockBot.api.getFile).toHaveBeenCalledWith("small_123");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          profilePhotoUrl:
            "https://api.telegram.org/file/bottest_bot_token_123/photos/file_123.jpg",
        },
      });
    });
  });
});
