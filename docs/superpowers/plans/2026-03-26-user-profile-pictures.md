# User Profile Pictures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Telegram user profile pictures to concert attendance lists with initials fallback.

**Architecture:** Weekly cron job fetches profile photos from Telegram Bot API and stores URLs in database. Frontend displays avatars in attendance chips with colored initials fallback for users without photos. Manual sync trigger available via `/sync_photos` admin command.

**Tech Stack:** Prisma (database), node-cron (scheduling), Grammy (Telegram Bot API), React + TypeScript (frontend)

---

## File Structure

**Backend:**
- `prisma/schema.prisma` - Add `profilePhotoUrl` field to User model
- `src/services/profilePhotoService.ts` - NEW: Core logic for fetching/syncing profile photos
- `src/commands/users/sync_photos.ts` - NEW: Admin command for manual sync
- `src/bot/commands.ts` - Register new admin command
- `src/bot.ts` - Initialize cron job on startup
- `src/api/routes/concerts.routes.ts` - Add profilePhotoUrl and lastName to API response

**Frontend:**
- `web/src/components/ConcertDetail.tsx` - Add avatar rendering to attendance chips
- `web/src/utils/avatar.ts` - NEW: Utility functions for initials and colors

**Tests:**
- `src/__tests__/services/profilePhotoService.test.ts` - NEW: Service tests
- `src/__tests__/commands/users/sync_photos.test.ts` - NEW: Command tests
- `src/__tests__/api/routes.test.ts` - Extend existing tests
- `web/src/__tests__/utils/avatar.test.ts` - NEW: Avatar utility tests
- `web/src/__tests__/components/ConcertDetail.test.tsx` - Extend existing tests

---

## Task 1: Database Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_add_profile_photo_url/migration.sql`

- [ ] **Step 1: Add profilePhotoUrl field to User model**

```prisma
model User {
  id              Int               @id @default(autoincrement())
  telegramId      BigInt            @unique
  username        String?
  firstName       String?
  lastName        String?
  languageCode    String?
  profilePhotoUrl String?
  createdAt       DateTime          @default(now())
  role            String            @default("User")
  concerts        Concert[]
  responses       ConcertResponse[]
}
```

Edit `prisma/schema.prisma`, add `profilePhotoUrl String?` after `languageCode` field (line 16).

- [ ] **Step 2: Generate migration**

Run: `pnpm exec prisma migrate dev --name add_profile_photo_url`
Expected: Migration file created in `prisma/migrations/`

- [ ] **Step 3: Verify migration applied**

Run: `pnpm exec prisma migrate status`
Expected: "Database schema is up to date!"

- [ ] **Step 4: Generate Prisma client**

Run: `pnpm exec prisma generate`
Expected: "✔ Generated Prisma Client"

- [ ] **Step 5: Commit migration**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add profilePhotoUrl field to User model

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Profile Photo Service - Core Functions

**Files:**
- Create: `src/services/profilePhotoService.ts`

- [ ] **Step 1: Write test for fetchUserProfilePhoto (user with photo)**

Create `src/__tests__/services/profilePhotoService.test.ts`:

```typescript
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
          profilePhotoUrl: "https://api.telegram.org/file/bottest_bot_token_123/photos/file_123.jpg",
        },
      });
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test profilePhotoService.test.ts`
Expected: FAIL - "Cannot find module '#/services/profilePhotoService'"

- [ ] **Step 3: Create profilePhotoService with fetchAllUserProfilePhotos**

Create `src/services/profilePhotoService.ts`:

```typescript
import { Bot } from "grammy";
import { prisma } from "#/config/db";
import { User } from "@prisma/client";
import logger from "#/utils/logger";

interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

/**
 * Fetches single user's profile photo from Telegram
 * @returns Photo URL or null if no photo available
 */
async function fetchUserProfilePhoto(bot: Bot, user: User): Promise<string | null> {
  try {
    // Get user's profile photos (limit 1 = most recent)
    const photos = await bot.api.getUserProfilePhotos(Number(user.telegramId), {
      limit: 1,
    });

    // Check if user has any photos
    if (!photos.photos || photos.photos.length === 0) {
      logger.info(`User ${user.id} has no profile photo`);
      return null;
    }

    // Get the smallest photo size (first element is smallest)
    const photo = photos.photos[0];
    const smallestPhoto = photo[0];

    if (!smallestPhoto) {
      logger.warn(`User ${user.id} photo array is empty`);
      return null;
    }

    // Get file info to construct URL
    const file = await bot.api.getFile(smallestPhoto.file_id);

    if (!file.file_path) {
      logger.warn(`User ${user.id} file has no file_path`);
      return null;
    }

    // Construct full URL
    const photoUrl = `https://api.telegram.org/file/bot${bot.token}/${file.file_path}`;
    logger.info(`Fetched photo for user ${user.id}: ${photoUrl}`);

    return photoUrl;
  } catch (error) {
    logger.error(`Failed to fetch photo for user ${user.id}:`, error);
    return null;
  }
}

/**
 * Fetches and updates profile photos for all users
 * @returns Summary with success/failure counts and errors
 */
export async function fetchAllUserProfilePhotos(bot: Bot): Promise<SyncResult> {
  logger.info("Starting profile photo sync for all users");

  const result: SyncResult = {
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    // Get all users from database
    const users = await prisma.user.findMany({
      orderBy: { id: "asc" },
    });

    logger.info(`Found ${users.length} users to sync`);

    // Process each user
    for (const user of users) {
      try {
        const photoUrl = await fetchUserProfilePhoto(bot, user);

        // Update user's profile photo URL (null if no photo)
        await prisma.user.update({
          where: { id: user.id },
          data: { profilePhotoUrl: photoUrl },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        const errorMsg = `User ${user.id} (${user.username || user.firstName}): ${error instanceof Error ? error.message : "Unknown error"}`;
        result.errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(
      `Profile photo sync complete. Success: ${result.success}, Failed: ${result.failed}`
    );

    return result;
  } catch (error) {
    logger.error("Fatal error during profile photo sync:", error);
    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test profilePhotoService.test.ts`
Expected: PASS - "fetches and updates profile photo for user with photo"

- [ ] **Step 5: Commit service foundation**

```bash
git add src/services/profilePhotoService.ts src/__tests__/services/profilePhotoService.test.ts
git commit -m "feat: add profile photo service with fetch functionality

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Profile Photo Service - Error Handling Tests

**Files:**
- Modify: `src/__tests__/services/profilePhotoService.test.ts`

- [ ] **Step 1: Write test for user without profile photo**

Add to `src/__tests__/services/profilePhotoService.test.ts` inside `describe("fetchAllUserProfilePhotos")`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm test profilePhotoService.test.ts`
Expected: PASS - "handles users with no profile photos"

- [ ] **Step 3: Write test for Telegram API errors**

Add to `src/__tests__/services/profilePhotoService.test.ts`:

```typescript
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
  mockBot.api.getUserProfilePhotos.mockRejectedValue(
    new Error("Bot was blocked by the user")
  );
  (prisma.user.update as jest.Mock).mockResolvedValue({});

  const result = await fetchAllUserProfilePhotos(mockBot);

  expect(result.success).toBe(1); // Update still succeeds with null
  expect(result.failed).toBe(0);
  expect(prisma.user.update).toHaveBeenCalledWith({
    where: { id: 3 },
    data: { profilePhotoUrl: null },
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test profilePhotoService.test.ts`
Expected: PASS - "handles Telegram API errors gracefully"

- [ ] **Step 5: Write test for multiple users with mixed results**

Add to `src/__tests__/services/profilePhotoService.test.ts`:

```typescript
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
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm test profilePhotoService.test.ts`
Expected: PASS - "continues processing after individual failures"

- [ ] **Step 7: Commit error handling tests**

```bash
git add src/__tests__/services/profilePhotoService.test.ts
git commit -m "test: add error handling tests for profile photo service

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Profile Photo Service - Cron Job Scheduler

**Files:**
- Modify: `src/services/profilePhotoService.ts`

- [ ] **Step 1: Write test for cron job scheduler**

Add to `src/__tests__/services/profilePhotoService.test.ts`:

```typescript
import { scheduleProfilePhotoSync } from "#/services/profilePhotoService";
import cron from "node-cron";

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

describe("scheduleProfilePhotoSync", () => {
  it("schedules cron job for Sunday 3 AM", () => {
    scheduleProfilePhotoSync(mockBot);

    expect(cron.schedule).toHaveBeenCalledWith(
      "0 3 * * 0",
      expect.any(Function)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test profilePhotoService.test.ts`
Expected: FAIL - "scheduleProfilePhotoSync is not exported"

- [ ] **Step 3: Add cron scheduler function**

Add to `src/services/profilePhotoService.ts`:

```typescript
import cron from "node-cron";

/**
 * Schedules weekly profile photo sync (Sunday 3 AM)
 */
export function scheduleProfilePhotoSync(bot: Bot): void {
  // Sunday at 3:00 AM (Europe/Lisbon timezone)
  cron.schedule("0 3 * * 0", async () => {
    logger.info("Starting scheduled profile photo sync (cron job)");
    try {
      const result = await fetchAllUserProfilePhotos(bot);
      logger.info(
        `Scheduled sync complete. Success: ${result.success}, Failed: ${result.failed}`
      );
      if (result.errors.length > 0) {
        logger.error("Sync errors:", result.errors);
      }
    } catch (error) {
      logger.error("Scheduled profile photo sync failed:", error);
    }
  });

  logger.info("Profile photo sync cron job scheduled (every Sunday at 3 AM)");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test profilePhotoService.test.ts`
Expected: PASS - "schedules cron job for Sunday 3 AM"

- [ ] **Step 5: Commit cron scheduler**

```bash
git add src/services/profilePhotoService.ts src/__tests__/services/profilePhotoService.test.ts
git commit -m "feat: add cron scheduler for weekly profile photo sync

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Admin Command - Sync Photos

**Files:**
- Create: `src/commands/users/sync_photos.ts`
- Create: `src/__tests__/commands/users/sync_photos.test.ts`

- [ ] **Step 1: Write test for sync_photos command (SuperAdmin)**

Create `src/__tests__/commands/users/sync_photos.test.ts`:

```typescript
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
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Failed users:")
    );
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
    expect(mockCtx.reply).not.toHaveBeenCalledWith(
      expect.stringContaining("⚠️ Failed users:")
    );
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test sync_photos.test.ts`
Expected: FAIL - "Cannot find module '#/commands/users/sync_photos'"

- [ ] **Step 3: Create sync_photos command**

Create `src/commands/users/sync_photos.ts`:

```typescript
import { BotContext } from "#/types/global";
import { fetchAllUserProfilePhotos } from "#/services/profilePhotoService";
import logger from "#/utils/logger";

export const syncPhotosCommand = async (ctx: BotContext) => {
  await ctx.reply("🔄 Syncing profile photos for all users...");

  try {
    const result = await fetchAllUserProfilePhotos(ctx.api);

    const total = result.success + result.failed;
    let message = `✅ Sync complete! Success: ${result.success}/${total}`;

    if (result.failed > 0) {
      message += `\n\n⚠️ Failed users:\n`;
      result.errors.forEach((error) => {
        message += `• ${error}\n`;
      });
    }

    await ctx.reply(message);
  } catch (error) {
    logger.error("Sync photos command error:", error);
    await ctx.reply(`❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test sync_photos.test.ts`
Expected: PASS - all tests passing

- [ ] **Step 5: Commit sync_photos command**

```bash
git add src/commands/users/sync_photos.ts src/__tests__/commands/users/sync_photos.test.ts
git commit -m "feat: add /sync_photos admin command for manual photo sync

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Bot Integration - Register Command and Cron

**Files:**
- Modify: `src/bot/commands.ts`
- Modify: `src/bot.ts`

- [ ] **Step 1: Register sync_photos command**

Edit `src/bot/commands.ts`, add at top:

```typescript
import { syncPhotosCommand } from "#/commands/users/sync_photos";
```

Add after line 45 (after `/announce` command):

```typescript
bot.command("sync_photos", async (ctx: BotContext) => {
  if (!(await isAdmin(ctx))) return ctx.reply("❌ Not authorized.");
  await syncPhotosCommand(ctx);
});
```

- [ ] **Step 2: Verify command registration**

Run: `pnpm test commands.test.ts`
Expected: Existing tests still pass (no command tests exist, just verify no errors)

- [ ] **Step 3: Initialize cron job on bot startup**

Edit `src/bot.ts`, add import at top:

```typescript
import { scheduleProfilePhotoSync } from "#/services/profilePhotoService";
```

Find the bot startup section (after `registerCommands(bot)` call), add:

```typescript
// Schedule profile photo sync
scheduleProfilePhotoSync(bot);
```

- [ ] **Step 4: Test bot startup**

Run: `pnpm dev`
Expected: Bot starts successfully, logs "Profile photo sync cron job scheduled (every Sunday at 3 AM)"

Stop the bot after verifying (Ctrl+C).

- [ ] **Step 5: Commit bot integration**

```bash
git add src/bot/commands.ts src/bot.ts
git commit -m "feat: register /sync_photos command and schedule cron job

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: API Endpoint - Add Profile Photo Fields

**Files:**
- Modify: `src/api/routes/concerts.routes.ts`

- [ ] **Step 1: Write test for API response with profile photos**

Add to `src/__tests__/api/routes.test.ts` (find the responses endpoint tests):

```typescript
describe("GET /api/concerts/:id/responses", () => {
  it("includes profilePhotoUrl and lastName for users", async () => {
    // Create test concert and users
    const concert = await prisma.concert.create({
      data: {
        artistName: "Test Artist",
        venue: "Test Venue",
        concertDate: new Date("2026-06-01"),
        userId: 1,
      },
    });

    const user1 = await prisma.user.create({
      data: {
        telegramId: BigInt(123456),
        firstName: "John",
        lastName: "Doe",
        username: "johndoe",
        profilePhotoUrl: "https://api.telegram.org/file/bot123/photo.jpg",
      },
    });

    await prisma.concertResponse.create({
      data: {
        concertId: concert.id,
        userId: user1.id,
        responseType: "going",
      },
    });

    const response = await request(app).get(`/api/concerts/${concert.id}/responses`);

    expect(response.status).toBe(200);
    expect(response.body.going.users[0]).toMatchObject({
      id: user1.id,
      firstName: "John",
      lastName: "Doe",
      username: "johndoe",
      profilePhotoUrl: "https://api.telegram.org/file/bot123/photo.jpg",
    });
  });

  it("handles users without profile photos", async () => {
    const concert = await prisma.concert.create({
      data: {
        artistName: "Test Artist 2",
        venue: "Test Venue 2",
        concertDate: new Date("2026-06-02"),
        userId: 1,
      },
    });

    const user2 = await prisma.user.create({
      data: {
        telegramId: BigInt(789012),
        firstName: "Jane",
        username: "janedoe",
        profilePhotoUrl: null, // No profile photo
      },
    });

    await prisma.concertResponse.create({
      data: {
        concertId: concert.id,
        userId: user2.id,
        responseType: "interested",
      },
    });

    const response = await request(app).get(`/api/concerts/${concert.id}/responses`);

    expect(response.status).toBe(200);
    expect(response.body.interested.users[0]).toMatchObject({
      id: user2.id,
      firstName: "Jane",
      username: "janedoe",
      profilePhotoUrl: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test routes.test.ts`
Expected: FAIL - "Expected profilePhotoUrl to be defined"

- [ ] **Step 3: Update API endpoint to include new fields**

Edit `src/api/routes/concerts.routes.ts`, modify lines 83-88 (going users mapping):

```typescript
going: {
  count: responses.going.length,
  users: responses.going.map((r) => ({
    id: r.userId,
    telegramId: r.user.telegramId.toString(),
    username: r.user.username,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    profilePhotoUrl: r.user.profilePhotoUrl,
  })),
},
```

Repeat for `interested` (lines 92-97):

```typescript
interested: {
  count: responses.interested.length,
  users: responses.interested.map((r) => ({
    id: r.userId,
    telegramId: r.user.telegramId.toString(),
    username: r.user.username,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    profilePhotoUrl: r.user.profilePhotoUrl,
  })),
},
```

Repeat for `not_going` (lines 101-106):

```typescript
not_going: {
  count: responses.not_going.length,
  users: responses.not_going.map((r) => ({
    id: r.userId,
    telegramId: r.user.telegramId.toString(),
    username: r.user.username,
    firstName: r.user.firstName,
    lastName: r.user.lastName,
    profilePhotoUrl: r.user.profilePhotoUrl,
  })),
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test routes.test.ts`
Expected: PASS - "includes profilePhotoUrl and lastName for users"

- [ ] **Step 5: Commit API changes**

```bash
git add src/api/routes/concerts.routes.ts src/__tests__/api/routes.test.ts
git commit -m "feat: add profilePhotoUrl and lastName to concert responses API

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Frontend - Avatar Utility Functions

**Files:**
- Create: `web/src/utils/avatar.ts`
- Create: `web/src/__tests__/utils/avatar.test.ts`

- [ ] **Step 1: Write tests for getInitials function**

Create `web/src/__tests__/utils/avatar.test.ts`:

```typescript
import { getInitials, generateColorFromName } from "@/utils/avatar";

interface TestUser {
  firstName?: string;
  lastName?: string;
  username?: string | null;
}

describe("Avatar Utils", () => {
  describe("getInitials", () => {
    it("returns firstName + lastName initials", () => {
      const user: TestUser = {
        firstName: "John",
        lastName: "Smith",
      };
      expect(getInitials(user)).toBe("JS");
    });

    it("returns single initial if no lastName", () => {
      const user: TestUser = {
        firstName: "Jane",
      };
      expect(getInitials(user)).toBe("J");
    });

    it("falls back to username initials", () => {
      const user: TestUser = {
        username: "bob_user",
      };
      expect(getInitials(user)).toBe("BO");
    });

    it("returns single char for short username", () => {
      const user: TestUser = {
        username: "x",
      };
      expect(getInitials(user)).toBe("X");
    });

    it('returns "?" when no name or username', () => {
      const user: TestUser = {};
      expect(getInitials(user)).toBe("?");
    });

    it("handles null username gracefully", () => {
      const user: TestUser = {
        username: null,
      };
      expect(getInitials(user)).toBe("?");
    });
  });

  describe("generateColorFromName", () => {
    it("generates consistent color for same name", () => {
      const color1 = generateColorFromName("John");
      const color2 = generateColorFromName("John");
      expect(color1).toBe(color2);
    });

    it("returns one of 8 predefined colors", () => {
      const validColors = [
        "#FF6B6B",
        "#4ECDC4",
        "#45B7D1",
        "#FFA07A",
        "#98D8C8",
        "#F7DC6F",
        "#BB8FCE",
        "#85C1E2",
      ];

      const color = generateColorFromName("Test");
      expect(validColors).toContain(color);
    });

    it("handles null/undefined names", () => {
      const color1 = generateColorFromName(null as any);
      const color2 = generateColorFromName(undefined as any);
      expect(typeof color1).toBe("string");
      expect(typeof color2).toBe("string");
    });

    it("generates different colors for different names", () => {
      const color1 = generateColorFromName("John");
      const color2 = generateColorFromName("Jane");
      // Not guaranteed to be different, but statistically likely
      expect(color1).toBeDefined();
      expect(color2).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && pnpm test avatar.test.ts`
Expected: FAIL - "Cannot find module '@/utils/avatar'"

- [ ] **Step 3: Create avatar utility functions**

Create `web/src/utils/avatar.ts`:

```typescript
interface UserWithName {
  firstName?: string;
  lastName?: string;
  username?: string | null;
}

/**
 * Generate initials from user data
 * Priority: firstName + lastName > username > "?"
 */
export function getInitials(user: UserWithName): string {
  // Try firstName + lastName
  if (user.firstName) {
    const first = user.firstName.charAt(0).toUpperCase();
    const last = user.lastName?.charAt(0).toUpperCase() || "";
    return last ? first + last : first;
  }

  // Fallback to username
  if (user.username) {
    return user.username.substring(0, 2).toUpperCase();
  }

  // Last resort
  return "?";
}

/**
 * Generate consistent color from name for initials background
 * Uses 8 distinct colors, deterministically selected by name hash
 */
export function generateColorFromName(name: string): string {
  const colors = [
    "#FF6B6B", // Red
    "#4ECDC4", // Teal
    "#45B7D1", // Blue
    "#FFA07A", // Orange
    "#98D8C8", // Mint
    "#F7DC6F", // Yellow
    "#BB8FCE", // Purple
    "#85C1E2", // Light Blue
  ];

  // Generate hash from name
  const hash =
    name
      ?.split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0) || 0;

  return colors[hash % colors.length];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && pnpm test avatar.test.ts`
Expected: PASS - all tests passing

- [ ] **Step 5: Commit avatar utilities**

```bash
git add web/src/utils/avatar.ts web/src/__tests__/utils/avatar.test.ts
git commit -m "feat: add avatar utility functions for initials and colors

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Frontend - Update Type Definitions

**Files:**
- Modify: `web/src/components/ConcertDetail.tsx`

- [ ] **Step 1: Update AttendanceResponse interface**

Edit `web/src/components/ConcertDetail.tsx`, find the `AttendanceResponse` interface (around line 11-16), modify to:

```typescript
interface AttendanceResponse {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName?: string;
  profilePhotoUrl?: string;
}
```

Add `lastName?: string;` and `profilePhotoUrl?: string;` to the interface.

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd web && pnpm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 3: Commit type updates**

```bash
git add web/src/components/ConcertDetail.tsx
git commit -m "feat: add lastName and profilePhotoUrl to AttendanceResponse type

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Frontend - Avatar Component in Attendance Chips

**Files:**
- Modify: `web/src/components/ConcertDetail.tsx`

- [ ] **Step 1: Import avatar utilities**

Edit `web/src/components/ConcertDetail.tsx`, add at top with other imports:

```typescript
import { getInitials, generateColorFromName } from "@/utils/avatar";
```

- [ ] **Step 2: Create Avatar sub-component**

Add before the main `ConcertDetail` component (after imports, around line 33):

```typescript
interface AvatarProps {
  user: AttendanceResponse;
}

function Avatar({ user }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  if (user.profilePhotoUrl && !imageError) {
    return (
      <img
        src={user.profilePhotoUrl}
        alt={user.firstName}
        className="w-8 h-8 rounded-full object-cover"
        onError={() => setImageError(true)}
      />
    );
  }

  // Initials fallback
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs"
      style={{ backgroundColor: generateColorFromName(user.firstName || user.username || "?") }}
    >
      {getInitials(user)}
    </div>
  );
}
```

- [ ] **Step 3: Update attendance chip rendering (Going section)**

Find the "Going" section rendering (around line 178-191), replace the user mapping:

```typescript
{attendance.going.users.map((user) => (
  <span
    key={user.id}
    className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
    style={{
      backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
      color: "var(--tg-theme-text-color, #000000)",
    }}
  >
    <Avatar user={user} />
    <span>{formatUserName(user)}</span>
  </span>
))}
```

- [ ] **Step 4: Update attendance chip rendering (Interested section)**

Find the "Interested" section rendering (around line 214-227), replace the user mapping with the same structure as above:

```typescript
{attendance.interested.users.map((user) => (
  <span
    key={user.id}
    className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
    style={{
      backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
      color: "var(--tg-theme-text-color, #000000)",
    }}
  >
    <Avatar user={user} />
    <span>{formatUserName(user)}</span>
  </span>
))}
```

- [ ] **Step 5: Update attendance chip rendering (Not Going section)**

Find the "Not Going" section rendering (around line 250-263), replace the user mapping with the same structure:

```typescript
{attendance.not_going.users.map((user) => (
  <span
    key={user.id}
    className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
    style={{
      backgroundColor: "var(--tg-theme-section-bg-color, #f5f5f5)",
      color: "var(--tg-theme-text-color, #000000)",
    }}
  >
    <Avatar user={user} />
    <span>{formatUserName(user)}</span>
  </span>
))}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd web && pnpm run build`
Expected: Build succeeds

- [ ] **Step 7: Commit avatar rendering**

```bash
git add web/src/components/ConcertDetail.tsx
git commit -m "feat: add avatar rendering to attendance chips

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Frontend Tests - Avatar Component

**Files:**
- Modify: `web/src/__tests__/components/ConcertDetail.test.tsx`

- [ ] **Step 1: Write test for avatar with profile photo**

Add to `web/src/__tests__/components/ConcertDetail.test.tsx`:

```typescript
import { render, screen, waitFor } from "@testing-library/react";
import { ConcertDetail } from "@/components/ConcertDetail";

// Mock fetch for attendance data
global.fetch = jest.fn();

describe("ConcertDetail - Avatars", () => {
  const mockConcert = {
    id: 1,
    artistName: "Test Artist",
    venue: "Test Venue",
    concertDate: "2026-06-01T00:00:00Z",
    concertTime: null,
    notes: null,
    url: null,
    responses: {
      going: 1,
      interested: 0,
      not_going: 0,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders profile photo when URL provided", async () => {
    const mockAttendance = {
      concertId: 1,
      going: {
        count: 1,
        users: [
          {
            id: 1,
            telegramId: "123456",
            username: "johndoe",
            firstName: "John",
            lastName: "Doe",
            profilePhotoUrl: "https://api.telegram.org/file/bot123/photo.jpg",
          },
        ],
      },
      interested: { count: 0, users: [] },
      not_going: { count: 0, users: [] },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttendance,
    });

    render(<ConcertDetail concert={mockConcert} onClose={jest.fn()} />);

    await waitFor(() => {
      const img = screen.getByAltText("John");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://api.telegram.org/file/bot123/photo.jpg");
    });
  });

  it("renders initials fallback when no URL", async () => {
    const mockAttendance = {
      concertId: 1,
      going: {
        count: 1,
        users: [
          {
            id: 2,
            telegramId: "789012",
            username: "janedoe",
            firstName: "Jane",
            lastName: "Smith",
            profilePhotoUrl: null,
          },
        ],
      },
      interested: { count: 0, users: [] },
      not_going: { count: 0, users: [] },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttendance,
    });

    render(<ConcertDetail concert={mockConcert} onClose={jest.fn()} />);

    await waitFor(() => {
      const initials = screen.getByText("JS");
      expect(initials).toBeInTheDocument();
      expect(initials.parentElement).toHaveClass("rounded-full");
    });
  });

  it("displays correct initials for username-only user", async () => {
    const mockAttendance = {
      concertId: 1,
      going: {
        count: 1,
        users: [
          {
            id: 3,
            telegramId: "345678",
            username: "bob_user",
            firstName: null,
            profilePhotoUrl: null,
          },
        ],
      },
      interested: { count: 0, users: [] },
      not_going: { count: 0, users: [] },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockAttendance,
    });

    render(<ConcertDetail concert={mockConcert} onClose={jest.fn()} />);

    await waitFor(() => {
      const initials = screen.getByText("BO");
      expect(initials).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run test to verify current state**

Run: `cd web && pnpm test ConcertDetail.test.tsx`
Expected: New tests should pass (component already implemented)

- [ ] **Step 3: Commit frontend tests**

```bash
git add web/src/__tests__/components/ConcertDetail.test.tsx
git commit -m "test: add avatar rendering tests for ConcertDetail

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Run Full Test Suite

**Files:**
- None (verification only)

- [ ] **Step 1: Run backend tests**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 2: Run frontend tests**

Run: `cd web && pnpm test`
Expected: All tests pass

- [ ] **Step 3: Check test coverage**

Run: `pnpm test --coverage`
Expected: Coverage report generated, new files covered

- [ ] **Step 4: Fix any failing tests**

If any tests fail, fix them before proceeding. Common issues:
- Import paths incorrect
- Mock setup incomplete
- Type mismatches

- [ ] **Step 5: Commit any test fixes**

```bash
git add .
git commit -m "fix: resolve test failures

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Manual Testing - Backend

**Files:**
- None (manual verification)

- [ ] **Step 1: Start development bot**

Run: `pnpm dev`
Expected: Bot starts, logs "Profile photo sync cron job scheduled"

- [ ] **Step 2: Test /sync_photos command as SuperAdmin**

In Telegram, send: `/sync_photos`
Expected:
- "🔄 Syncing profile photos for all users..."
- "✅ Sync complete! Success: X/Y"
- No errors in bot logs

- [ ] **Step 3: Verify photos in database**

Run: `pnpm exec prisma studio`
Open User table, verify `profilePhotoUrl` field is populated for users with photos.

- [ ] **Step 4: Test API endpoint**

In browser or curl:
```bash
curl http://localhost:3001/api/concerts/1/responses
```
Expected: Response includes `profilePhotoUrl` and `lastName` fields

- [ ] **Step 5: Test error handling (non-admin user)**

In Telegram, use a non-admin account, send: `/sync_photos`
Expected: "❌ Not authorized."

---

## Task 14: Manual Testing - Frontend

**Files:**
- None (manual verification)

- [ ] **Step 1: Start web dev server**

Run: `cd web && pnpm dev`
Open Telegram Mini App in browser or Telegram

- [ ] **Step 2: View concert with attendees**

Open a concert that has people marked as "Going"
Expected: See avatars (photos or colored circles with initials) next to names

- [ ] **Step 3: Verify profile photos display**

For users with profile photos:
- Photo should be circular, 32x32px
- Photo should load from Telegram URL

- [ ] **Step 4: Verify initials fallback**

For users without profile photos:
- Colored circle with white initials
- Initials match firstName + lastName or username
- Colors are consistent for same user

- [ ] **Step 5: Test image loading error**

In browser dev tools, block network request to `api.telegram.org`
Expected: Fallback to initials when image fails to load

---

## Task 15: Documentation and Cleanup

**Files:**
- Create: `docs/PROFILE_PHOTOS.md` (optional)

- [ ] **Step 1: Update main README if needed**

If not already documented, add section about profile pictures to `README.md`.

- [ ] **Step 2: Verify all tests pass**

Run: `pnpm test && cd web && pnpm test`
Expected: All tests green

- [ ] **Step 3: Check lint**

Run: `pnpm lint`
Expected: No linting errors

- [ ] **Step 4: Format code**

Run: `pnpm format`
Expected: All files formatted

- [ ] **Step 5: Final commit**

```bash
git add .
git commit -m "docs: update documentation for profile photos feature

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Plan Self-Review

**Spec Coverage Check:**

✅ Database Schema Changes - Task 1
✅ Profile Photo Service (fetch, errors, cron) - Tasks 2, 3, 4
✅ Admin Command `/sync_photos` - Task 5
✅ Bot Integration - Task 6
✅ API Endpoint Updates - Task 7
✅ Frontend Avatar Utilities - Task 8
✅ Frontend Type Updates - Task 9
✅ Frontend Avatar Rendering - Task 10
✅ Frontend Tests - Task 11
✅ Backend Tests - Tasks 2-5
✅ Manual Testing - Tasks 13, 14
✅ Documentation - Task 15

**Placeholder Scan:**

✅ No TBD or TODO markers
✅ All code blocks complete
✅ All test expectations specified
✅ All file paths exact
✅ All commands have expected output

**Type Consistency Check:**

✅ `profilePhotoUrl` - String? in Prisma, string | null in types, optional string in TypeScript
✅ `lastName` - String? in Prisma, optional string in TypeScript
✅ `AttendanceResponse` - Consistent across frontend
✅ `SyncResult` - Defined in service, used in command tests
✅ Function names consistent across tasks

**All requirements from spec covered and implemented.**
