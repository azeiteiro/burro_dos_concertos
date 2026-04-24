// Mock AWS SDK BEFORE imports
const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: mockSend,
  })),
  PutObjectCommand: jest.fn((input) => input),
  HeadObjectCommand: jest.fn((input) => input),
}));

import { getR2Storage } from "#/services/r2Storage";

describe("R2StorageService", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockClear();

    // Save original env
    originalEnv = { ...process.env };

    // Set test environment variables
    process.env.R2_ACCOUNT_ID = "test-account-id";
    process.env.R2_ACCESS_KEY_ID = "test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://test-bucket.example.com";
  });

  afterEach(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe("uploadImage", () => {
    it("uploads image buffer to R2 and returns public URL", async () => {
      mockSend.mockResolvedValue({});

      const r2 = getR2Storage();
      const buffer = Buffer.from("fake-image-data");
      const key = "profile-photos/123.jpg";
      const contentType = "image/jpeg";

      const publicUrl = await r2.uploadImage(key, buffer, contentType);

      expect(publicUrl).toBe("https://test-bucket.example.com/profile-photos/123.jpg");
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });
    });

    it("throws error when upload fails", async () => {
      mockSend.mockRejectedValue(new Error("Network error"));

      const r2 = getR2Storage();
      const buffer = Buffer.from("fake-image-data");

      await expect(r2.uploadImage("profile-photos/123.jpg", buffer, "image/jpeg")).rejects.toThrow(
        "Network error"
      );
    });
  });

  describe("imageExists", () => {
    it("returns true when image exists", async () => {
      mockSend.mockResolvedValue({});

      const r2 = getR2Storage();
      const exists = await r2.imageExists("profile-photos/123.jpg");

      expect(exists).toBe(true);
      expect(mockSend).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "profile-photos/123.jpg",
      });
    });

    it("returns false when image not found (404)", async () => {
      const notFoundError: any = new Error("NotFound");
      notFoundError.name = "NotFound";
      mockSend.mockRejectedValue(notFoundError);

      const r2 = getR2Storage();
      const exists = await r2.imageExists("profile-photos/999.jpg");

      expect(exists).toBe(false);
    });

    it("throws error for non-404 errors", async () => {
      mockSend.mockRejectedValue(new Error("Server error"));

      const r2 = getR2Storage();

      await expect(r2.imageExists("profile-photos/123.jpg")).rejects.toThrow("Server error");
    });
  });

  describe("getR2Storage singleton", () => {
    it.skip("throws error when required env vars are missing", async () => {
      // Save and delete env var
      const savedAccountId = process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCOUNT_ID;

      // Force new instance by clearing module
      jest.resetModules();

      // Re-import to get fresh instance

      const { getR2Storage: getFreshR2Storage } = await import("#/services/r2Storage");

      expect(() => getFreshR2Storage()).toThrow("Missing required R2 environment variables");

      // Restore env var
      process.env.R2_ACCOUNT_ID = savedAccountId;
    });

    it("returns same instance on multiple calls", () => {
      const instance1 = getR2Storage();
      const instance2 = getR2Storage();

      expect(instance1).toBe(instance2);
    });
  });
});
