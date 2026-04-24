import { Bot, GrammyError } from "grammy";
import {
  fetchAllUserProfilePhotos,
  scheduleProfilePhotoSync,
} from "#/services/profilePhotoService";
import { prisma } from "#/config/db";
import cron from "node-cron";
import { getR2Storage } from "#/services/r2Storage";
import got from "got";

// Mock Grammy Bot API
jest.mock("grammy", () => {
  class MockGrammyError extends Error {
    description: string;
    constructor(description: string) {
      super(description);
      this.description = description;
      this.name = "GrammyError";
    }
  }
  return {
    Bot: jest.fn(),
    GrammyError: MockGrammyError,
  };
});

// Mock Prisma
jest.mock("#/config/db", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

// Mock node-cron
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

// Mock R2 storage service
jest.mock("#/services/r2Storage", () => ({
  getR2Storage: jest.fn(() => ({
    uploadImage: jest.fn(),
  })),
}));

// Mock got for downloading images
jest.mock("got", () => jest.fn());

describe("ProfilePhotoService", () => {
  let mockBot: jest.Mocked<Bot>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BOT_TOKEN = "test_bot_token_123";
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
          profilePhotoFileId: null,
          profilePhotoUrl: null,
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

      const mockImageBuffer = Buffer.from("fake-image-data");
      const mockR2Url = "https://test-bucket.example.com/profile-photos/1.jpg";

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockBot.api.getUserProfilePhotos.mockResolvedValue(mockPhotos as any);
      mockBot.api.getFile.mockResolvedValue(mockFile as any);
      (got as unknown as jest.Mock).mockResolvedValue({ body: mockImageBuffer });
      (getR2Storage as jest.Mock).mockReturnValue({
        uploadImage: jest.fn().mockResolvedValue(mockR2Url),
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);

      expect(mockBot.api.getUserProfilePhotos).toHaveBeenCalledWith(123456789, {
        limit: 1,
      });
      expect(mockBot.api.getFile).toHaveBeenCalledWith("small_123");
      expect(got).toHaveBeenCalledWith(
        "https://api.telegram.org/file/bottest_bot_token_123/photos/file_123.jpg",
        expect.any(Object)
      );

      const r2Storage = getR2Storage();
      expect(r2Storage.uploadImage).toHaveBeenCalledWith(
        "profile-photos/1.jpg",
        mockImageBuffer,
        "image/jpeg"
      );

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          profilePhotoUrl: mockR2Url,
          profilePhotoFileId: "small_123",
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
          profilePhotoFileId: null,
          profilePhotoUrl: null,
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
        data: {
          profilePhotoUrl: null,
          profilePhotoFileId: null,
        },
      });
    });

    it("handles Telegram API errors gracefully", async () => {
      const mockUsers = [
        {
          id: 3,
          telegramId: BigInt(111222333),
          firstName: "Bob",
          username: "bob_user",
          profilePhotoFileId: null,
          profilePhotoUrl: null,
        },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockBot.api.getUserProfilePhotos.mockRejectedValue(
        new GrammyError("Forbidden: bot was blocked by the user")
      );
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(1); // Update still succeeds with null
      expect(result.failed).toBe(0);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: {
          profilePhotoUrl: null,
          profilePhotoFileId: null,
        },
      });
    });

    it("skips upload when file_id unchanged", async () => {
      const existingR2Url = "https://test-bucket.example.com/profile-photos/4.jpg";

      const mockUsers = [
        {
          id: 4,
          telegramId: BigInt(444555666),
          firstName: "Alice",
          username: "alice",
          profilePhotoFileId: "small_123",
          profilePhotoUrl: existingR2Url,
        },
      ];

      const mockPhotos = {
        total_count: 1,
        photos: [[{ file_id: "small_123", width: 160, height: 160 }]],
      };

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);
      mockBot.api.getUserProfilePhotos.mockResolvedValue(mockPhotos as any);
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);

      // Should NOT call getFile or got (no download)
      expect(mockBot.api.getFile).not.toHaveBeenCalled();
      expect(got).not.toHaveBeenCalled();

      // Should still update with existing values
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 4 },
        data: {
          profilePhotoUrl: existingR2Url,
          profilePhotoFileId: "small_123",
        },
      });
    });

    it("continues processing after individual failures", async () => {
      const mockR2Url = "https://test-bucket.example.com/profile-photos/1.jpg";

      const mockUsers = [
        {
          id: 1,
          telegramId: BigInt(111),
          firstName: "User1",
          profilePhotoFileId: null,
          profilePhotoUrl: null,
        },
        {
          id: 2,
          telegramId: BigInt(222),
          firstName: "User2",
          profilePhotoFileId: null,
          profilePhotoUrl: null,
        },
        {
          id: 3,
          telegramId: BigInt(333),
          firstName: "User3",
          profilePhotoFileId: null,
          profilePhotoUrl: null,
        },
      ];

      const mockPhotos = {
        total_count: 1,
        photos: [[{ file_id: "photo_123", width: 160, height: 160 }]],
      };

      const mockFile = {
        file_id: "photo_123",
        file_path: "photos/file.jpg",
      };

      const mockImageBuffer = Buffer.from("fake-image");

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      // User 1: success
      mockBot.api.getUserProfilePhotos
        .mockResolvedValueOnce(mockPhotos as any)
        // User 2: no photos
        .mockResolvedValueOnce({ total_count: 0, photos: [] } as any)
        // User 3: success
        .mockResolvedValueOnce(mockPhotos as any);

      mockBot.api.getFile.mockResolvedValue(mockFile as any);
      (got as unknown as jest.Mock).mockResolvedValue({ body: mockImageBuffer });
      (getR2Storage as jest.Mock).mockReturnValue({
        uploadImage: jest.fn().mockResolvedValue(mockR2Url),
      });
      (prisma.user.update as jest.Mock).mockResolvedValue({});

      const result = await fetchAllUserProfilePhotos(mockBot);

      expect(result.success).toBe(3);
      expect(result.failed).toBe(0);
      expect(prisma.user.update).toHaveBeenCalledTimes(3);
    });
  });

  describe("scheduleProfilePhotoSync", () => {
    it("schedules cron job for Sunday 3 AM", () => {
      scheduleProfilePhotoSync(mockBot);

      expect(cron.schedule).toHaveBeenCalledWith("0 3 * * 0", expect.any(Function));
    });
  });
});
