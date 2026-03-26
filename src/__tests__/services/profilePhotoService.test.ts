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

    it("handles users with no profile photos", async () => {
      const mockUsers = [
        {
          id: 2,
          telegramId: BigInt(987654321),
          firstName: "Jane",
          username: "jane_doe",
        },
      ];

      const mockPhotos = {
        total_count: 0,
        photos: [],
      };

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockBot.api.getUserProfilePhotos.mockResolvedValue(mockPhotos as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { profilePhotoUrl: null },
      });
    });

    it("handles Telegram API errors gracefully", async () => {
      const mockUsers = [
        {
          id: 3,
          telegramId: BigInt(111222333),
          firstName: "Bob",
          username: "bob_user",
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockBot.api.getUserProfilePhotos.mockRejectedValue(new Error("Bot was blocked by the user"));
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(1); // Update still succeeds with null
      expect(result.failed).toBe(0);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { profilePhotoUrl: null },
      });
    });

    it("continues processing after individual failures", async () => {
      const mockUsers = [
        { id: 1, telegramId: BigInt(111), firstName: "User1" },
        { id: 2, telegramId: BigInt(222), firstName: "User2" },
        { id: 3, telegramId: BigInt(333), firstName: "User3" },
      ];

      const mockPhotos = {
        total_count: 1,
        photos: [[{ file_id: "photo_123", width: 160, height: 160 }]],
      };

      const mockFile = {
        file_id: "photo_123",
        file_path: "photos/file.jpg",
      };

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      // User 1: success
      mockBot.api.getUserProfilePhotos
        .mockResolvedValueOnce(mockPhotos as any)
        // User 2: no photos
        .mockResolvedValueOnce({ total_count: 0, photos: [] } as any)
        // User 3: success
        .mockResolvedValueOnce(mockPhotos as any);

      mockBot.api.getFile.mockResolvedValue(mockFile as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(prisma.user.update).toHaveBeenCalledTimes(3);
    });
  });
});
