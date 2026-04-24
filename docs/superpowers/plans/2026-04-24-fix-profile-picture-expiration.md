# Fix Profile Picture URL Expiration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix profile pictures breaking after 1-2 days by self-hosting images in Cloudflare R2 instead of storing temporary Telegram file URLs.

**Architecture:** Store Telegram `file_id` (permanent) in database alongside R2 URLs (permanent). Modify sync service to download images from Telegram and upload to R2. Smart sync only re-downloads when `file_id` changes. Keep weekly cron schedule since URLs never expire.

**Tech Stack:**
- Cloudflare R2 (S3-compatible storage)
- AWS SDK v3 for S3 (@aws-sdk/client-s3)
- Existing: Prisma, Grammy (Telegram Bot), node-cron

---

## File Structure

**New Files:**
- `src/services/r2Storage.ts` - R2 client wrapper for uploading/managing images
- `src/__tests__/services/r2Storage.test.ts` - Tests for R2 storage service

**Modified Files:**
- `prisma/schema.prisma` - Add `profilePhotoFileId` field to User model
- `src/services/profilePhotoService.ts` - Update to download images and upload to R2
- `src/__tests__/services/profilePhotoService.test.ts` - Update tests for new behavior
- `package.json` - Add AWS SDK S3 client dependency
- `.env.example` - Document R2 environment variables

---

## Task 1: Add Dependencies

**Files:**
- Modify: `package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install AWS SDK S3 client**

```bash
pnpm add @aws-sdk/client-s3
```

Expected: Package added to dependencies

- [ ] **Step 2: Update .env.example with R2 variables**

Add after Spotify section:

```env
# Cloudflare R2 (for profile photo storage)
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=burro-profile-photos
R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

- [ ] **Step 3: Verify installation**

```bash
pnpm list @aws-sdk/client-s3
```

Expected: Shows installed version (should be ^3.x.x)

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "chore: add AWS SDK for R2 storage and document env vars"
```

---

## Task 2: Database Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/XXXXXX_add_profile_photo_file_id/migration.sql`

- [ ] **Step 1: Add profilePhotoFileId field to User model**

In `prisma/schema.prisma`, update User model:

```prisma
model User {
  id                 Int               @id @default(autoincrement())
  telegramId         BigInt            @unique
  username           String?
  firstName          String?
  lastName           String?
  languageCode       String?
  profilePhotoUrl    String?
  profilePhotoFileId String?           // NEW: Telegram file_id for change detection
  createdAt          DateTime          @default(now())
  role               String            @default("User")
  concerts           Concert[]
  responses          ConcertResponse[]
}
```

- [ ] **Step 2: Create migration**

```bash
pnpm prisma migrate dev --name add_profile_photo_file_id
```

Expected: Migration file created in `prisma/migrations/`

- [ ] **Step 3: Verify migration in database**

```bash
pnpm prisma studio
```

Check User model has `profilePhotoFileId` column (nullable string)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add profilePhotoFileId to User model for change detection"
```

---

## Task 3: R2 Storage Service (Core Functions)

**Files:**
- Create: `src/services/r2Storage.ts`

- [ ] **Step 1: Create R2 storage service with configuration**

```typescript
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import logger from "#/config/logger";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
}

class R2StorageService {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor(config: R2Config) {
    const endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: "auto",
      endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.bucketName = config.bucketName;
    this.publicUrl = config.publicUrl;

    logger.info({ bucketName: this.bucketName }, "R2 Storage Service initialized");
  }

  /**
   * Upload image buffer to R2
   * @param key - File path/key in bucket (e.g., "profile-photos/123.jpg")
   * @param buffer - Image data as Buffer
   * @param contentType - MIME type (e.g., "image/jpeg")
   * @returns Public URL of uploaded image
   */
  async uploadImage(key: string, buffer: Buffer, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);

      const publicUrl = `${this.publicUrl}/${key}`;
      logger.info({ key, publicUrl }, "Successfully uploaded image to R2");

      return publicUrl;
    } catch (error) {
      logger.error({ error, key }, "Failed to upload image to R2");
      throw error;
    }
  }

  /**
   * Check if image exists in R2
   * @param key - File path/key in bucket
   * @returns true if exists, false otherwise
   */
  async imageExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      logger.error({ error, key }, "Error checking if image exists in R2");
      throw error;
    }
  }
}

// Singleton instance
let r2StorageInstance: R2StorageService | null = null;

export function getR2Storage(): R2StorageService {
  if (!r2StorageInstance) {
    const config: R2Config = {
      accountId: process.env.R2_ACCOUNT_ID!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      bucketName: process.env.R2_BUCKET_NAME!,
      publicUrl: process.env.R2_PUBLIC_URL!,
    };

    // Validate required env vars
    const missing = Object.entries(config)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Missing required R2 environment variables: ${missing.join(", ")}`);
    }

    r2StorageInstance = new R2StorageService(config);
  }

  return r2StorageInstance;
}

export { R2StorageService };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No compilation errors

- [ ] **Step 3: Commit**

```bash
git add src/services/r2Storage.ts
git commit -m "feat: add R2 storage service for image uploads"
```

---

## Task 4: R2 Storage Service Tests

**Files:**
- Create: `src/__tests__/services/r2Storage.test.ts`

- [ ] **Step 1: Write tests for R2 storage service**

```typescript
import { S3Client } from "@aws-sdk/client-s3";
import { getR2Storage, R2StorageService } from "#/services/r2Storage";

// Mock AWS SDK
jest.mock("@aws-sdk/client-s3", () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn((input) => input),
    HeadObjectCommand: jest.fn((input) => input),
  };
});

describe("R2StorageService", () => {
  let mockSend: jest.Mock;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();

    // Save original env
    originalEnv = { ...process.env };

    // Set test environment variables
    process.env.R2_ACCOUNT_ID = "test-account-id";
    process.env.R2_ACCESS_KEY_ID = "test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://test-bucket.example.com";

    // Get mock send function
    const S3ClientMock = S3Client as jest.MockedClass<typeof S3Client>;
    const instances = S3ClientMock.mock.instances;
    if (instances.length > 0) {
      mockSend = instances[instances.length - 1].send as jest.Mock;
    } else {
      mockSend = jest.fn();
    }

    // Reset singleton
    (getR2Storage as any).r2StorageInstance = null;
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

      await expect(
        r2.uploadImage("profile-photos/123.jpg", buffer, "image/jpeg")
      ).rejects.toThrow("Network error");
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

      await expect(r2.imageExists("profile-photos/123.jpg")).rejects.toThrow(
        "Server error"
      );
    });
  });

  describe("getR2Storage singleton", () => {
    it("throws error when required env vars are missing", () => {
      delete process.env.R2_ACCOUNT_ID;

      expect(() => getR2Storage()).toThrow(
        "Missing required R2 environment variables"
      );
    });

    it("returns same instance on multiple calls", () => {
      const instance1 = getR2Storage();
      const instance2 = getR2Storage();

      expect(instance1).toBe(instance2);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
pnpm test src/__tests__/services/r2Storage.test.ts
```

Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/services/r2Storage.test.ts
git commit -m "test: add R2 storage service tests"
```

---

## Task 5: Update Profile Photo Service (Download from Telegram)

**Files:**
- Modify: `src/services/profilePhotoService.ts`

- [ ] **Step 1: Add helper function to download image from Telegram**

Add after imports in `profilePhotoService.ts`:

```typescript
import { getR2Storage } from "./r2Storage";
import got from "got";
```

Add before `fetchUserProfilePhoto` function:

```typescript
/**
 * Download image from Telegram servers
 * @param fileUrl - Full Telegram file URL
 * @returns Image buffer
 */
async function downloadImageFromTelegram(fileUrl: string): Promise<Buffer> {
  try {
    logger.debug({ fileUrl }, "Downloading image from Telegram");

    const response = await got(fileUrl, {
      responseType: "buffer",
      timeout: {
        request: 10000, // 10 second timeout
      },
    });

    logger.debug({ size: response.body.length }, "Successfully downloaded image");
    return response.body;
  } catch (error) {
    logger.error({ error, fileUrl }, "Failed to download image from Telegram");
    throw error;
  }
}

/**
 * Determine content type from file extension
 * @param filePath - File path from Telegram (e.g., "photos/file.jpg")
 * @returns MIME type
 */
function getContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg"; // Default fallback
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No compilation errors

- [ ] **Step 3: Commit**

```bash
git add src/services/profilePhotoService.ts
git commit -m "feat: add helper functions for downloading Telegram images"
```

---

## Task 6: Update Profile Photo Service (Upload to R2)

**Files:**
- Modify: `src/services/profilePhotoService.ts`

- [ ] **Step 1: Modify fetchUserProfilePhoto to upload to R2**

Replace the `fetchUserProfilePhoto` function (lines 23-84):

```typescript
async function fetchUserProfilePhoto(
  botOrApi: Bot | Api,
  user: User
): Promise<{ url: string | null; fileId: string | null } | undefined> {
  try {
    // Support both Bot instance and Api instance
    const api = "api" in botOrApi ? botOrApi.api : botOrApi;

    // Get user's profile photos (limit 1 = most recent)
    const photos = await api.getUserProfilePhotos(Number(user.telegramId), {
      limit: 1,
    });

    // Check if user has any photos
    if (!photos.photos || photos.photos.length === 0) {
      logger.debug(`User ${user.id} has no profile photo`);
      return { url: null, fileId: null };
    }

    // Get the smallest photo size (first element is smallest)
    const photo = photos.photos[0];
    const smallestPhoto = photo[0];

    if (!smallestPhoto) {
      logger.warn(`User ${user.id} photo array is empty`);
      return { url: null, fileId: null };
    }

    const currentFileId = smallestPhoto.file_id;

    // Check if file_id changed (if same, skip download/upload)
    if (user.profilePhotoFileId === currentFileId && user.profilePhotoUrl) {
      logger.debug(
        { userId: user.id, fileId: currentFileId },
        "Profile photo unchanged, skipping upload"
      );
      return { url: user.profilePhotoUrl, fileId: currentFileId };
    }

    // Get file info to download
    const file = await api.getFile(smallestPhoto.file_id);

    if (!file.file_path) {
      logger.warn(`User ${user.id} file has no file_path`);
      return { url: null, fileId: null };
    }

    // Download image from Telegram
    const telegramUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
    const imageBuffer = await downloadImageFromTelegram(telegramUrl);

    // Upload to R2
    const r2 = getR2Storage();
    const fileExtension = file.file_path.split(".").pop() || "jpg";
    const r2Key = `profile-photos/${user.id}.${fileExtension}`;
    const contentType = getContentType(file.file_path);

    const r2Url = await r2.uploadImage(r2Key, imageBuffer, contentType);

    logger.debug({ userId: user.id, r2Url, fileId: currentFileId }, "Uploaded photo to R2");

    return { url: r2Url, fileId: currentFileId };
  } catch (error) {
    // Distinguish between "Bot blocked" and other transient errors
    const isBotBlocked =
      error instanceof GrammyError &&
      (error.description.includes("blocked") || error.description.includes("deactivated"));

    if (isBotBlocked) {
      logger.info(`User ${user.id} has blocked the bot, treating as no photo`);
      return { url: null, fileId: null };
    }

    logger.error(
      { userId: user.id, error: error instanceof Error ? error.message : String(error) },
      `Failed to fetch/upload photo for user ${user.id}`
    );

    // Return undefined to indicate a transient error (don't update DB)
    return undefined;
  }
}
```

- [ ] **Step 2: Update fetchAllUserProfilePhotos to use new return value**

Replace lines 110-126 in `fetchAllUserProfilePhotos`:

```typescript
      try {
        const photoResult = await fetchUserProfilePhoto(botOrApi, user);

        // Only update if we have a definitive result
        // If undefined, it was a transient error, so we skip and keep the old URL
        if (photoResult !== undefined) {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              profilePhotoUrl: photoResult.url,
              profilePhotoFileId: photoResult.fileId,
            },
          });
          result.success++;
        } else {
          result.skipped++;
          logger.warn(`Skipped updating user ${user.id} due to transient error`);
        }

        // Rate limiting: small delay between users to avoid Telegram limits
        await delay(200);
      } catch (error) {
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No compilation errors

- [ ] **Step 4: Commit**

```bash
git add src/services/profilePhotoService.ts
git commit -m "feat: update profile photo service to upload images to R2"
```

---

## Task 7: Update Profile Photo Service Tests

**Files:**
- Modify: `src/__tests__/services/profilePhotoService.test.ts`

- [ ] **Step 1: Add mocks for R2 and got**

Add after existing mocks (after line 38):

```typescript
// Mock R2 storage service
jest.mock("#/services/r2Storage", () => ({
  getR2Storage: jest.fn(() => ({
    uploadImage: jest.fn(),
  })),
}));

// Mock got for downloading images
jest.mock("got", () => jest.fn());
```

- [ ] **Step 2: Update test imports**

Add to imports at top:

```typescript
import { getR2Storage } from "#/services/r2Storage";
import got from "got";
```

- [ ] **Step 3: Update first test to expect R2 upload**

Replace "fetches and updates profile photo for user with photo" test (lines 56-104):

```typescript
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
```

- [ ] **Step 4: Update "handles users with no profile photos" test**

Replace test at lines 106-133:

```typescript
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
```

- [ ] **Step 5: Update "handles Telegram API errors gracefully" test**

Replace test at lines 135-159:

```typescript
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
```

- [ ] **Step 6: Add new test for skipping unchanged photos**

Add new test after "handles Telegram API errors gracefully":

```typescript
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
        photos: [
          [{ file_id: "small_123", width: 160, height: 160 }],
        ],
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
```

- [ ] **Step 7: Update "continues processing after individual failures" test**

Replace test at lines 161-196 with updated version:

```typescript
    it("continues processing after individual failures", async () => {
      const mockR2Url = "https://test-bucket.example.com/profile-photos/1.jpg";

      const mockUsers = [
        { id: 1, telegramId: BigInt(111), firstName: "User1", profilePhotoFileId: null, profilePhotoUrl: null },
        { id: 2, telegramId: BigInt(222), firstName: "User2", profilePhotoFileId: null, profilePhotoUrl: null },
        { id: 3, telegramId: BigInt(333), firstName: "User3", profilePhotoFileId: null, profilePhotoUrl: null },
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
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pnpm test src/__tests__/services/profilePhotoService.test.ts
```

Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/__tests__/services/profilePhotoService.test.ts
git commit -m "test: update profile photo service tests for R2 integration"
```

---

## Task 8: Run All Tests

**Files:**
- N/A (validation step)

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: All tests pass

- [ ] **Step 2: Check test coverage**

Look for coverage report in terminal output. Ensure:
- `r2Storage.ts` has >80% coverage
- `profilePhotoService.ts` maintains existing coverage

- [ ] **Step 3: Fix any failing tests**

If tests fail, debug and fix before proceeding.

- [ ] **Step 4: Commit any fixes**

```bash
git add .
git commit -m "fix: resolve test failures"
```

---

## Task 9: Manual Testing Setup

**Files:**
- N/A (validation step)

- [ ] **Step 1: Verify R2 credentials in .env**

Check that `.env` has:
```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
R2_PUBLIC_URL=...
```

- [ ] **Step 2: Test R2 connection (optional local test)**

Create temporary test script `test-r2.ts`:

```typescript
import { getR2Storage } from "./src/services/r2Storage";

async function testR2() {
  const r2 = getR2Storage();
  const testBuffer = Buffer.from("test");
  const url = await r2.uploadImage("test/hello.txt", testBuffer, "text/plain");
  console.log("Uploaded test file:", url);
}

testR2().catch(console.error);
```

Run:
```bash
tsx test-r2.ts
```

Expected: Prints R2 URL, no errors

Clean up:
```bash
rm test-r2.ts
```

- [ ] **Step 3: Build application**

```bash
pnpm build
```

Expected: No errors

- [ ] **Step 4: Prepare to test sync command**

Make note of test plan:
1. Start bot locally: `pnpm dev`
2. Run `/sync_photos` command in Telegram as SuperAdmin
3. Check logs for R2 uploads
4. Verify images appear in R2 bucket (check R2 dashboard)
5. Check database (`pnpm prisma studio`) - verify `profilePhotoFileId` and `profilePhotoUrl` populated

---

## Task 10: Documentation Update

**Files:**
- Modify: `docs/features/artist-images.md` (or create profile-pictures.md if needed)

- [ ] **Step 1: Create/update feature documentation**

Create `docs/features/profile-pictures.md`:

```markdown
# User Profile Pictures

## Overview

User profile pictures are synced from Telegram and stored in Cloudflare R2 for permanent, reliable access.

## Architecture

**Problem Solved:**
- Telegram file URLs expire after ~1 hour
- Original implementation stored temporary URLs in database
- Images broke after 1-2 days

**Solution:**
- Store Telegram `file_id` (permanent identifier) in database
- Download images from Telegram and upload to Cloudflare R2
- Store R2 URLs (permanent) in `profilePhotoUrl` field
- Smart sync: only re-download if `file_id` changed

## Database Schema

```prisma
model User {
  profilePhotoUrl    String?  // R2 URL (permanent)
  profilePhotoFileId String?  // Telegram file_id (for change detection)
}
```

## Sync Process

**Weekly Cron Job:** Sunday 3 AM (Europe/Lisbon)

**Flow:**
1. Fetch all users from database
2. For each user:
   - Get current `file_id` from Telegram API
   - Compare with stored `profilePhotoFileId`
   - If different or null:
     - Download image from Telegram
     - Upload to R2 (`profile-photos/{userId}.{ext}`)
     - Update database with R2 URL and new `file_id`
   - If same: skip (no change)

**Manual Trigger:** `/sync_photos` (SuperAdmin only)

## R2 Configuration

Required environment variables:

```bash
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=burro-profile-photos
R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

## Storage Service

**File:** `src/services/r2Storage.ts`

**Key Functions:**
- `uploadImage(key, buffer, contentType)` - Upload image to R2
- `imageExists(key)` - Check if image exists
- `getR2Storage()` - Singleton instance

**Usage:**
```typescript
import { getR2Storage } from "#/services/r2Storage";

const r2 = getR2Storage();
const url = await r2.uploadImage("profile-photos/123.jpg", buffer, "image/jpeg");
```

## Error Handling

- **Bot blocked by user:** Sets `profilePhotoUrl` to null
- **Download fails:** Skips user, keeps old URL, logs error
- **Upload fails:** Skips user, keeps old URL, logs error
- **No profile photo:** Sets both fields to null

## Cost & Performance

**Cloudflare R2 Free Tier:**
- 10GB storage (we use ~1MB for 20 users)
- 1M operations/month (we use ~80/month)
- **Cost:** $0.00

**Performance:**
- Weekly sync: ~20 users × 2 API calls = 40 calls
- Images served from R2 CDN (fast, cached)
- No impact on Fly.io costs

## Testing

**Unit Tests:**
- `src/__tests__/services/r2Storage.test.ts`
- `src/__tests__/services/profilePhotoService.test.ts`

**Manual Testing:**
1. Run `/sync_photos` command
2. Check logs for successful uploads
3. Verify images in R2 dashboard
4. Check database (`pnpm prisma studio`)
5. View concert detail modal - see profile pictures

## Future Enhancements

- Automatic cleanup of orphaned images
- Image resizing/optimization before upload
- Support for multiple image sizes (thumbnail, full)
```

- [ ] **Step 2: Commit documentation**

```bash
git add docs/features/profile-pictures.md
git commit -m "docs: add profile pictures feature documentation"
```

---

## Task 11: Final Verification

**Files:**
- N/A (validation step)

- [ ] **Step 1: Verify all tests pass**

```bash
pnpm test
```

Expected: All tests pass with good coverage

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm build
```

Expected: No errors

- [ ] **Step 3: Verify linting passes**

```bash
pnpm lint
```

Expected: No errors

- [ ] **Step 4: Review all changes**

```bash
git diff master
```

Review to ensure:
- No debug code left in
- No commented code
- All TODOs addressed
- Clean, focused commits

- [ ] **Step 5: Final commit if needed**

If any cleanup needed:
```bash
git add .
git commit -m "chore: final cleanup before deployment"
```

---

## Deployment Checklist

**Before deploying to production:**

- [ ] Verify R2 bucket is created and configured for public access
- [ ] Add R2 environment variables to Fly.io secrets:
  ```bash
  fly secrets set R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=xxx R2_SECRET_ACCESS_KEY=xxx R2_BUCKET_NAME=xxx R2_PUBLIC_URL=xxx
  ```
- [ ] Deploy to Fly.io: `fly deploy`
- [ ] Run migration: `pnpm prisma migrate deploy` (if not auto-migrated)
- [ ] Test `/sync_photos` command in production
- [ ] Verify first sync populates images in R2
- [ ] Check concert detail modal shows profile pictures
- [ ] Monitor logs for next weekly cron run (Sunday 3 AM)

---

## Success Criteria

✅ Database has `profilePhotoFileId` column
✅ R2 storage service uploads images successfully
✅ Profile photo sync downloads from Telegram and uploads to R2
✅ Smart sync skips unchanged photos (efficiency)
✅ All tests pass (unit tests for R2 and profile service)
✅ Images stored in R2 with permanent URLs
✅ Profile pictures never expire (fixed the bug!)
✅ Weekly cron job continues working
✅ Zero cost (R2 free tier)
✅ Zero impact on Fly.io bill

---

## Notes

- **Why R2?** Free tier covers our use case forever, S3-compatible, fast CDN
- **Why weekly sync?** Images never expire now, users rarely change photos
- **Why store file_id?** Efficient change detection, avoid unnecessary downloads
- **Why got library?** Already in dependencies, simple HTTP client for downloads
- **Extension handling:** Preserves original extension from Telegram (.jpg, .png, .webp)
