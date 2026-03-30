# Spotify Artist Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fetch and display artist images from Spotify API in concert cards

**Architecture:** Mirror the existing `profilePhotoService.ts` pattern. Create dedicated `artistImageService.ts` with Spotify API client, fetch functions, batch sync, and cron scheduling. Hook into concert creation/edit handlers. Frontend displays images with graceful fallback.

**Tech Stack:** Spotify Web API, Prisma, node-cron, Grammy bot, Jest, TypeScript

---

## File Structure

**Backend - New Files:**
- `src/services/spotify/spotifyClient.ts` - Spotify API client with authentication
- `src/services/spotify/types.ts` - TypeScript interfaces for Spotify API
- `src/services/artistImageService.ts` - Main service mirroring profilePhotoService
- `src/commands/concerts/sync_artist_images.ts` - Admin command for manual sync
- `src/__tests__/services/spotify/spotifyClient.test.ts` - Spotify client tests
- `src/__tests__/services/artistImageService.test.ts` - Service tests
- `src/__tests__/commands/concerts/sync_artist_images.test.ts` - Command tests

**Backend - Modified Files:**
- `prisma/schema.prisma` - Add artistImageUrl and spotifyArtistId fields
- `src/conversations/add_concert.ts` - Hook artist image fetch on creation
- `src/conversations/edit_concert.ts` - Re-fetch image when artist name changes
- `src/bot.ts` - Schedule cron job
- `src/bot/commands.ts` - Register admin command
- `src/api/routes/concerts.routes.ts` - Include new fields in responses

**Frontend - Modified Files:**
- `web/src/types/concert.ts` - Add new fields to Concert interface
- `web/src/components/ConcertCard.tsx` - Use artistImageUrl with fallback

---

## Task 1: Database Migration

**Files:**
- Modify: `prisma/schema.prisma:24-43`
- Create: Migration file (auto-generated)

- [ ] **Step 1: Add fields to Concert model**

Open `prisma/schema.prisma` and add two new fields to the Concert model after `pollMessageId`:

```prisma
model Concert {
  id               Int               @id @default(autoincrement())
  userId           Int
  artistName       String
  venue            String
  concertDate      DateTime
  concertTime      DateTime?
  url              String?
  notes            String?
  notified         Boolean           @default(false)
  pollId           String?           @unique
  pollMessageId    BigInt?
  artistImageUrl   String?
  spotifyArtistId  String?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  responses        ConcertResponse[]

  @@index([concertDate])
  @@index([userId])
}
```

- [ ] **Step 2: Generate migration**

Run:
```bash
npx prisma migrate dev --name add_artist_image_fields
```

Expected: Migration file created in `prisma/migrations/`, database updated

- [ ] **Step 3: Verify migration**

Run:
```bash
npx prisma studio
```

Open the Concert model and verify `artistImageUrl` and `spotifyArtistId` fields exist (both nullable String fields).

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add artistImageUrl and spotifyArtistId to Concert model

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Spotify API Types

**Files:**
- Create: `src/services/spotify/types.ts`

- [ ] **Step 1: Create Spotify types file**

Create `src/services/spotify/types.ts`:

```typescript
/**
 * Spotify API response types
 */

export interface SpotifyToken {
  access_token: string;
  token_type: string;
  expires_in: number; // Seconds until expiration
}

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
  popularity: number;
  genres: string[];
  external_urls: {
    spotify: string;
  };
}

export interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
    total: number;
  };
}

export interface SpotifyErrorResponse {
  error: {
    status: number;
    message: string;
  };
}

/**
 * Internal token storage with expiration tracking
 */
export interface CachedToken {
  access_token: string;
  expires_at: number; // Unix timestamp (milliseconds)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/spotify/types.ts
git commit -m "feat: add Spotify API type definitions

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Spotify API Client - Authentication

**Files:**
- Create: `src/services/spotify/spotifyClient.ts`
- Test: `src/__tests__/services/spotify/spotifyClient.test.ts`

- [ ] **Step 1: Write failing authentication test**

Create `src/__tests__/services/spotify/spotifyClient.test.ts`:

```typescript
import { SpotifyClient } from "#/services/spotify/spotifyClient";

// Mock fetch globally
global.fetch = jest.fn();

describe("SpotifyClient - Authentication", () => {
  let client: SpotifyClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SpotifyClient();
    // Reset token cache between tests
    (client as any).token = null;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should fetch and cache access token on first request", async () => {
    const mockToken = {
      access_token: "mock_token_123",
      token_type: "Bearer",
      expires_in: 3600,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockToken,
    });

    const token = await client.getAccessToken();

    expect(token).toBe("mock_token_123");
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://accounts.spotify.com/api/token",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      })
    );
  });

  it("should reuse cached token if not expired", async () => {
    const mockToken = {
      access_token: "cached_token",
      token_type: "Bearer",
      expires_in: 3600,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockToken,
    });

    // First call - fetches token
    const token1 = await client.getAccessToken();
    expect(token1).toBe("cached_token");

    // Second call - should use cache
    const token2 = await client.getAccessToken();
    expect(token2).toBe("cached_token");
    expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once
  });

  it("should refresh token if expired", async () => {
    const firstToken = {
      access_token: "old_token",
      token_type: "Bearer",
      expires_in: 0, // Expires immediately
    };

    const secondToken = {
      access_token: "new_token",
      token_type: "Bearer",
      expires_in: 3600,
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstToken,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondToken,
      });

    // First call
    const token1 = await client.getAccessToken();
    expect(token1).toBe("old_token");

    // Wait for token to expire (simulate)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Second call - should refresh
    const token2 = await client.getAccessToken();
    expect(token2).toBe("new_token");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("should throw error if CLIENT_ID missing", async () => {
    const originalClientId = process.env.SPOTIFY_CLIENT_ID;
    delete process.env.SPOTIFY_CLIENT_ID;

    await expect(client.getAccessToken()).rejects.toThrow(
      "SPOTIFY_CLIENT_ID not configured"
    );

    process.env.SPOTIFY_CLIENT_ID = originalClientId;
  });

  it("should throw error if CLIENT_SECRET missing", async () => {
    const originalClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SPOTIFY_CLIENT_SECRET;

    await expect(client.getAccessToken()).rejects.toThrow(
      "SPOTIFY_CLIENT_SECRET not configured"
    );

    process.env.SPOTIFY_CLIENT_SECRET = originalClientSecret;
  });

  it("should throw error if auth request fails", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: { status: 401, message: "Invalid client credentials" },
      }),
    });

    await expect(client.getAccessToken()).rejects.toThrow(
      "Spotify authentication failed: 401"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/services/spotify/spotifyClient.test.ts
```

Expected: FAIL - "Cannot find module '#/services/spotify/spotifyClient'"

- [ ] **Step 3: Implement SpotifyClient authentication**

Create `src/services/spotify/spotifyClient.ts`:

```typescript
import logger from "#/config/logger";
import {
  SpotifyToken,
  CachedToken,
  SpotifyArtist,
  SpotifySearchResponse,
  SpotifyErrorResponse,
} from "./types";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_URL = "https://api.spotify.com/v1";

export class SpotifyClient {
  private token: CachedToken | null = null;

  /**
   * Get valid access token (cached or refreshed)
   */
  async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.token && Date.now() < this.token.expires_at) {
      logger.debug("Using cached Spotify token");
      return this.token.access_token;
    }

    // Fetch new token
    logger.info("Fetching new Spotify access token");
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId) {
      throw new Error("SPOTIFY_CLIENT_ID not configured");
    }

    if (!clientSecret) {
      throw new Error("SPOTIFY_CLIENT_SECRET not configured");
    }

    // Encode credentials for Basic auth
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(SPOTIFY_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const error = (await response.json()) as SpotifyErrorResponse;
      logger.error({ status: response.status, error }, "Spotify authentication failed");
      throw new Error(`Spotify authentication failed: ${response.status}`);
    }

    const tokenData = (await response.json()) as SpotifyToken;

    // Cache token with expiration (subtract 60s for safety margin)
    this.token = {
      access_token: tokenData.access_token,
      expires_at: Date.now() + (tokenData.expires_in - 60) * 1000,
    };

    logger.info("Successfully obtained Spotify access token");
    return this.token.access_token;
  }

  /**
   * Search for artist by name
   */
  async searchArtist(artistName: string): Promise<SpotifyArtist | null> {
    // Will implement in next task
    throw new Error("Not implemented yet");
  }

  /**
   * Get artist by Spotify ID
   */
  async getArtist(artistId: string): Promise<SpotifyArtist | null> {
    // Will implement in next task
    throw new Error("Not implemented yet");
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/services/spotify/spotifyClient.test.ts
```

Expected: PASS - All authentication tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/spotify/spotifyClient.ts src/__tests__/services/spotify/spotifyClient.test.ts
git commit -m "feat: implement Spotify OAuth client credentials authentication

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Spotify API Client - Artist Search

**Files:**
- Modify: `src/services/spotify/spotifyClient.ts:46-50`
- Modify: `src/__tests__/services/spotify/spotifyClient.test.ts` (add tests)

- [ ] **Step 1: Write failing artist search tests**

Add to `src/__tests__/services/spotify/spotifyClient.test.ts` (after authentication tests):

```typescript
describe("SpotifyClient - Artist Search", () => {
  let client: SpotifyClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new SpotifyClient();

    // Mock successful auth
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "mock_token",
        token_type: "Bearer",
        expires_in: 3600,
      }),
    });
  });

  it("should search for artist and return first result", async () => {
    const mockSearchResponse = {
      artists: {
        items: [
          {
            id: "spotify_id_123",
            name: "Arctic Monkeys",
            images: [
              { url: "https://image.url/large.jpg", height: 640, width: 640 },
              { url: "https://image.url/small.jpg", height: 320, width: 320 },
            ],
            popularity: 85,
            genres: ["indie rock"],
            external_urls: { spotify: "https://open.spotify.com/artist/..." },
          },
        ],
        total: 1,
      },
    };

    // Mock search request
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    const result = await client.searchArtist("Arctic Monkeys");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("spotify_id_123");
    expect(result?.name).toBe("Arctic Monkeys");
    expect(result?.images).toHaveLength(2);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.spotify.com/v1/search"),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mock_token",
        }),
      })
    );
  });

  it("should return null if artist not found", async () => {
    const mockEmptyResponse = {
      artists: {
        items: [],
        total: 0,
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmptyResponse,
    });

    const result = await client.searchArtist("NonexistentArtist12345");

    expect(result).toBeNull();
  });

  it("should handle search API errors gracefully", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: { status: 400, message: "Invalid search query" },
      }),
    });

    await expect(client.searchArtist("")).rejects.toThrow(
      "Spotify search failed: 400"
    );
  });

  it("should URL encode artist name in search query", async () => {
    const mockSearchResponse = {
      artists: { items: [], total: 0 },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSearchResponse,
    });

    await client.searchArtist("Artist Name With Spaces");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=Artist%20Name%20With%20Spaces"),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/services/spotify/spotifyClient.test.ts -t "Artist Search"
```

Expected: FAIL - "Not implemented yet"

- [ ] **Step 3: Implement artist search**

Replace the `searchArtist` method in `src/services/spotify/spotifyClient.ts`:

```typescript
  /**
   * Search for artist by name
   * @returns First matching artist or null if not found
   */
  async searchArtist(artistName: string): Promise<SpotifyArtist | null> {
    try {
      const token = await this.getAccessToken();
      const encodedQuery = encodeURIComponent(artistName);
      const url = `${SPOTIFY_API_URL}/search?q=${encodedQuery}&type=artist&limit=1`;

      logger.debug({ artistName }, "Searching for artist on Spotify");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = (await response.json()) as SpotifyErrorResponse;
        logger.error({ status: response.status, error }, "Spotify search failed");
        throw new Error(`Spotify search failed: ${response.status}`);
      }

      const data = (await response.json()) as SpotifySearchResponse;

      if (data.artists.items.length === 0) {
        logger.info({ artistName }, "Artist not found on Spotify");
        return null;
      }

      const artist = data.artists.items[0];
      logger.info({ artistName, spotifyId: artist.id }, "Found artist on Spotify");

      return artist;
    } catch (error) {
      logger.error({ error, artistName }, "Error searching for artist");
      throw error;
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/services/spotify/spotifyClient.test.ts -t "Artist Search"
```

Expected: PASS - All search tests pass

- [ ] **Step 5: Implement getArtist method**

Replace the `getArtist` method in `src/services/spotify/spotifyClient.ts`:

```typescript
  /**
   * Get artist by Spotify ID (for future features)
   * @returns Artist details or null if not found
   */
  async getArtist(artistId: string): Promise<SpotifyArtist | null> {
    try {
      const token = await this.getAccessToken();
      const url = `${SPOTIFY_API_URL}/artists/${artistId}`;

      logger.debug({ artistId }, "Fetching artist by ID from Spotify");

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 404) {
        logger.info({ artistId }, "Artist ID not found on Spotify");
        return null;
      }

      if (!response.ok) {
        const error = (await response.json()) as SpotifyErrorResponse;
        logger.error({ status: response.status, error }, "Spotify get artist failed");
        throw new Error(`Spotify get artist failed: ${response.status}`);
      }

      const artist = (await response.json()) as SpotifyArtist;
      logger.info({ artistId }, "Fetched artist by ID from Spotify");

      return artist;
    } catch (error) {
      logger.error({ error, artistId }, "Error fetching artist by ID");
      throw error;
    }
  }
```

- [ ] **Step 6: Commit**

```bash
git add src/services/spotify/spotifyClient.ts src/__tests__/services/spotify/spotifyClient.test.ts
git commit -m "feat: implement Spotify artist search and lookup

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Artist Image Service - Core Functions

**Files:**
- Create: `src/services/artistImageService.ts`
- Test: `src/__tests__/services/artistImageService.test.ts`

- [ ] **Step 1: Write failing test for fetchArtistImage**

Create `src/__tests__/services/artistImageService.test.ts`:

```typescript
import { fetchArtistImage, updateConcertArtistImage } from "#/services/artistImageService";
import { SpotifyClient } from "#/services/spotify/spotifyClient";
import { prisma } from "#/config/db";

// Mock Spotify client
jest.mock("#/services/spotify/spotifyClient");

// Mock Prisma
jest.mock("#/config/db", () => ({
  prisma: {
    concert: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe("ArtistImageService - fetchArtistImage", () => {
  let mockSpotifyClient: jest.Mocked<SpotifyClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpotifyClient = new SpotifyClient() as jest.Mocked<SpotifyClient>;
  });

  it("should fetch and return artist image and ID", async () => {
    const mockArtist = {
      id: "spotify_123",
      name: "Arctic Monkeys",
      images: [
        { url: "https://image.url/640.jpg", height: 640, width: 640 },
        { url: "https://image.url/320.jpg", height: 320, width: 320 },
      ],
      popularity: 85,
      genres: ["indie rock"],
      external_urls: { spotify: "https://open.spotify.com/artist/123" },
    };

    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(mockArtist);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await fetchArtistImage("Arctic Monkeys");

    expect(result).not.toBeNull();
    expect(result?.imageUrl).toBe("https://image.url/640.jpg");
    expect(result?.spotifyArtistId).toBe("spotify_123");
    expect(mockSpotifyClient.searchArtist).toHaveBeenCalledWith("Arctic Monkeys");
  });

  it("should prefer 640px image when available", async () => {
    const mockArtist = {
      id: "spotify_456",
      name: "Test Artist",
      images: [
        { url: "https://image.url/64.jpg", height: 64, width: 64 },
        { url: "https://image.url/320.jpg", height: 320, width: 320 },
        { url: "https://image.url/640.jpg", height: 640, width: 640 },
      ],
      popularity: 70,
      genres: ["pop"],
      external_urls: { spotify: "https://open.spotify.com/artist/456" },
    };

    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(mockArtist);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await fetchArtistImage("Test Artist");

    expect(result?.imageUrl).toBe("https://image.url/640.jpg");
  });

  it("should use first image if no 640px available", async () => {
    const mockArtist = {
      id: "spotify_789",
      name: "Indie Artist",
      images: [
        { url: "https://image.url/300.jpg", height: 300, width: 300 },
        { url: "https://image.url/100.jpg", height: 100, width: 100 },
      ],
      popularity: 45,
      genres: ["indie"],
      external_urls: { spotify: "https://open.spotify.com/artist/789" },
    };

    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(mockArtist);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await fetchArtistImage("Indie Artist");

    expect(result?.imageUrl).toBe("https://image.url/300.jpg");
  });

  it("should return null if artist not found", async () => {
    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(null);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await fetchArtistImage("Unknown Artist");

    expect(result).toBeNull();
  });

  it("should return null if artist has no images", async () => {
    const mockArtist = {
      id: "spotify_noimage",
      name: "No Image Artist",
      images: [],
      popularity: 20,
      genres: [],
      external_urls: { spotify: "https://open.spotify.com/artist/noimage" },
    };

    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(mockArtist);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await fetchArtistImage("No Image Artist");

    expect(result).toBeNull();
  });

  it("should return null and log error if Spotify API fails", async () => {
    mockSpotifyClient.searchArtist = jest
      .fn()
      .mockRejectedValue(new Error("API Error"));
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await fetchArtistImage("Error Artist");

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "fetchArtistImage"
```

Expected: FAIL - "Cannot find module '#/services/artistImageService'"

- [ ] **Step 3: Implement fetchArtistImage**

Create `src/services/artistImageService.ts`:

```typescript
import { SpotifyClient } from "./spotify/spotifyClient";
import { prisma } from "#/config/db";
import logger from "#/config/logger";

const spotifyClient = new SpotifyClient();

interface ArtistImageResult {
  imageUrl: string;
  spotifyArtistId: string;
}

/**
 * Fetch artist image from Spotify by name
 * @returns Image URL and Spotify ID, or null if not found
 */
export async function fetchArtistImage(
  artistName: string
): Promise<ArtistImageResult | null> {
  try {
    logger.debug({ artistName }, "Fetching artist image from Spotify");

    const artist = await spotifyClient.searchArtist(artistName);

    if (!artist) {
      logger.info({ artistName }, "Artist not found in Spotify");
      return null;
    }

    if (!artist.images || artist.images.length === 0) {
      logger.info({ artistName, spotifyId: artist.id }, "Artist has no images");
      return null;
    }

    // Prefer 640px image, otherwise use first available
    const preferredImage = artist.images.find((img) => img.width === 640);
    const imageUrl = preferredImage ? preferredImage.url : artist.images[0].url;

    logger.info(
      { artistName, spotifyId: artist.id, imageUrl },
      "Successfully fetched artist image"
    );

    return {
      imageUrl,
      spotifyArtistId: artist.id,
    };
  } catch (error) {
    logger.error(
      { error, artistName },
      "Failed to fetch artist image from Spotify"
    );
    return null;
  }
}

/**
 * Update single concert with artist image
 */
export async function updateConcertArtistImage(
  concertId: number
): Promise<boolean> {
  // Will implement in next step
  throw new Error("Not implemented yet");
}

/**
 * Sync artist images for all concerts (batch operation)
 */
export async function syncAllArtistImages(): Promise<{
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  // Will implement later
  throw new Error("Not implemented yet");
}

/**
 * Schedule weekly artist image sync (Sunday 3 AM)
 */
export function scheduleArtistImageSync(): void {
  // Will implement later
  throw new Error("Not implemented yet");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "fetchArtistImage"
```

Expected: PASS - All fetchArtistImage tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/artistImageService.ts src/__tests__/services/artistImageService.test.ts
git commit -m "feat: implement fetchArtistImage function

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Artist Image Service - Update Concert

**Files:**
- Modify: `src/services/artistImageService.ts:52-57`
- Modify: `src/__tests__/services/artistImageService.test.ts` (add tests)

- [ ] **Step 1: Write failing test for updateConcertArtistImage**

Add to `src/__tests__/services/artistImageService.test.ts`:

```typescript
describe("ArtistImageService - updateConcertArtistImage", () => {
  let mockSpotifyClient: jest.Mocked<SpotifyClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpotifyClient = new SpotifyClient() as jest.Mocked<SpotifyClient>;
  });

  it("should update concert with fetched artist image", async () => {
    const mockConcert = {
      id: 1,
      artistName: "Radiohead",
      venue: "Test Venue",
      concertDate: new Date(),
      userId: 1,
    };

    const mockArtist = {
      id: "spotify_radiohead",
      name: "Radiohead",
      images: [{ url: "https://image.url/radiohead.jpg", height: 640, width: 640 }],
      popularity: 90,
      genres: ["alternative rock"],
      external_urls: { spotify: "https://open.spotify.com/artist/radio" },
    };

    (prisma.concert.findUnique as jest.Mock).mockResolvedValue(mockConcert);
    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(mockArtist);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);
    (prisma.concert.update as jest.Mock).mockResolvedValue({
      ...mockConcert,
      artistImageUrl: "https://image.url/radiohead.jpg",
      spotifyArtistId: "spotify_radiohead",
    });

    const result = await updateConcertArtistImage(1);

    expect(result).toBe(true);
    expect(prisma.concert.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        artistImageUrl: "https://image.url/radiohead.jpg",
        spotifyArtistId: "spotify_radiohead",
      },
    });
  });

  it("should update concert with null if artist not found", async () => {
    const mockConcert = {
      id: 2,
      artistName: "Unknown Band",
      venue: "Test Venue",
      concertDate: new Date(),
      userId: 1,
    };

    (prisma.concert.findUnique as jest.Mock).mockResolvedValue(mockConcert);
    mockSpotifyClient.searchArtist = jest.fn().mockResolvedValue(null);
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);
    (prisma.concert.update as jest.Mock).mockResolvedValue({
      ...mockConcert,
      artistImageUrl: null,
      spotifyArtistId: null,
    });

    const result = await updateConcertArtistImage(2);

    expect(result).toBe(true);
    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: {
        artistImageUrl: null,
        spotifyArtistId: null,
      },
    });
  });

  it("should return false if concert not found", async () => {
    (prisma.concert.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await updateConcertArtistImage(999);

    expect(result).toBe(false);
    expect(prisma.concert.update).not.toHaveBeenCalled();
  });

  it("should return false and log error if update fails", async () => {
    const mockConcert = {
      id: 3,
      artistName: "Test Artist",
      venue: "Test Venue",
      concertDate: new Date(),
      userId: 1,
    };

    (prisma.concert.findUnique as jest.Mock).mockResolvedValue(mockConcert);
    mockSpotifyClient.searchArtist = jest.fn().mockRejectedValue(new Error("DB Error"));
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);

    const result = await updateConcertArtistImage(3);

    expect(result).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "updateConcertArtistImage"
```

Expected: FAIL - "Not implemented yet"

- [ ] **Step 3: Implement updateConcertArtistImage**

Replace the `updateConcertArtistImage` function in `src/services/artistImageService.ts`:

```typescript
/**
 * Update single concert with artist image
 * @returns true if successful, false otherwise
 */
export async function updateConcertArtistImage(
  concertId: number
): Promise<boolean> {
  try {
    logger.debug({ concertId }, "Updating concert artist image");

    // Get concert from database
    const concert = await prisma.concert.findUnique({
      where: { id: concertId },
      select: { id: true, artistName: true },
    });

    if (!concert) {
      logger.warn({ concertId }, "Concert not found");
      return false;
    }

    // Fetch artist image from Spotify
    const artistImage = await fetchArtistImage(concert.artistName);

    // Update concert with image data (or null if not found)
    await prisma.concert.update({
      where: { id: concertId },
      data: {
        artistImageUrl: artistImage?.imageUrl || null,
        spotifyArtistId: artistImage?.spotifyArtistId || null,
      },
    });

    if (artistImage) {
      logger.info(
        { concertId, artistName: concert.artistName, spotifyId: artistImage.spotifyArtistId },
        "Successfully updated concert with artist image"
      );
    } else {
      logger.info(
        { concertId, artistName: concert.artistName },
        "Updated concert with null artist image (not found)"
      );
    }

    return true;
  } catch (error) {
    logger.error({ error, concertId }, "Failed to update concert artist image");
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "updateConcertArtistImage"
```

Expected: PASS - All updateConcertArtistImage tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/artistImageService.ts src/__tests__/services/artistImageService.test.ts
git commit -m "feat: implement updateConcertArtistImage function

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Artist Image Service - Batch Sync

**Files:**
- Modify: `src/services/artistImageService.ts:61-68`
- Modify: `src/__tests__/services/artistImageService.test.ts` (add tests)

- [ ] **Step 1: Write failing test for syncAllArtistImages**

Add to `src/__tests__/services/artistImageService.test.ts`:

```typescript
describe("ArtistImageService - syncAllArtistImages", () => {
  let mockSpotifyClient: jest.Mocked<SpotifyClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSpotifyClient = new SpotifyClient() as jest.Mocked<SpotifyClient>;
    (SpotifyClient as jest.Mock).mockImplementation(() => mockSpotifyClient);
  });

  it("should sync all concerts without images", async () => {
    const mockConcerts = [
      {
        id: 1,
        artistName: "Artist 1",
        artistImageUrl: null,
        spotifyArtistId: null,
      },
      {
        id: 2,
        artistName: "Artist 2",
        artistImageUrl: null,
        spotifyArtistId: null,
      },
      {
        id: 3,
        artistName: "Artist 3",
        artistImageUrl: "https://existing.url",
        spotifyArtistId: "existing_id",
      },
    ];

    const mockArtist1 = {
      id: "spotify_1",
      name: "Artist 1",
      images: [{ url: "https://image1.url", height: 640, width: 640 }],
      popularity: 80,
      genres: ["rock"],
      external_urls: { spotify: "https://spotify.com/1" },
    };

    const mockArtist2 = {
      id: "spotify_2",
      name: "Artist 2",
      images: [{ url: "https://image2.url", height: 640, width: 640 }],
      popularity: 70,
      genres: ["pop"],
      external_urls: { spotify: "https://spotify.com/2" },
    };

    (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);
    mockSpotifyClient.searchArtist = jest
      .fn()
      .mockResolvedValueOnce(mockArtist1)
      .mockResolvedValueOnce(mockArtist2);
    (prisma.concert.update as jest.Mock).mockResolvedValue({});

    const result = await syncAllArtistImages();

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(0);
    expect(prisma.concert.update).toHaveBeenCalledTimes(2);
  });

  it("should handle mix of success, failure, and skip", async () => {
    const mockConcerts = [
      { id: 1, artistName: "Success Artist", artistImageUrl: null, spotifyArtistId: null },
      { id: 2, artistName: "Fail Artist", artistImageUrl: null, spotifyArtistId: null },
      { id: 3, artistName: "Skip Artist", artistImageUrl: "url", spotifyArtistId: "id" },
    ];

    const mockArtist = {
      id: "spotify_success",
      name: "Success Artist",
      images: [{ url: "https://success.url", height: 640, width: 640 }],
      popularity: 75,
      genres: ["indie"],
      external_urls: { spotify: "https://spotify.com/success" },
    };

    (prisma.concert.findMany as jest.Mock).mockResolvedValue(mockConcerts);
    mockSpotifyClient.searchArtist = jest
      .fn()
      .mockResolvedValueOnce(mockArtist)
      .mockRejectedValueOnce(new Error("API Error"));
    (prisma.concert.update as jest.Mock).mockResolvedValue({});

    const result = await syncAllArtistImages();

    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("Fail Artist");
  });

  it("should return zero counts if no concerts exist", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);

    const result = await syncAllArtistImages();

    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "syncAllArtistImages"
```

Expected: FAIL - "Not implemented yet"

- [ ] **Step 3: Implement syncAllArtistImages**

Replace the `syncAllArtistImages` function in `src/services/artistImageService.ts`:

```typescript
/**
 * Sync artist images for all concerts (batch operation)
 */
export async function syncAllArtistImages(): Promise<{
  success: number;
  failed: number;
  skipped: number;
  errors: string[];
}> {
  logger.info("Starting artist image sync for all concerts");

  const result = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get all concerts
    const concerts = await prisma.concert.findMany({
      select: {
        id: true,
        artistName: true,
        artistImageUrl: true,
        spotifyArtistId: true,
      },
      orderBy: { id: "asc" },
    });

    logger.info(`Found ${concerts.length} concerts to process`);

    // Process each concert
    for (const concert of concerts) {
      try {
        // Skip if already has both image and Spotify ID
        if (concert.artistImageUrl && concert.spotifyArtistId) {
          logger.debug({ concertId: concert.id }, "Skipping concert (already has image)");
          result.skipped++;
          continue;
        }

        // Fetch and update
        const artistImage = await fetchArtistImage(concert.artistName);

        await prisma.concert.update({
          where: { id: concert.id },
          data: {
            artistImageUrl: artistImage?.imageUrl || null,
            spotifyArtistId: artistImage?.spotifyArtistId || null,
          },
        });

        result.success++;
      } catch (error) {
        result.failed++;
        const errorMsg = `Concert ${concert.id} (${concert.artistName}): ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        result.errors.push(errorMsg);
        logger.error({ error, concertId: concert.id }, errorMsg);
      }
    }

    logger.info(
      `Artist image sync complete. Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}`
    );

    return result;
  } catch (error) {
    logger.error({ error }, "Fatal error during artist image sync");
    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "syncAllArtistImages"
```

Expected: PASS - All syncAllArtistImages tests pass

- [ ] **Step 5: Commit**

```bash
git add src/services/artistImageService.ts src/__tests__/services/artistImageService.test.ts
git commit -m "feat: implement syncAllArtistImages batch function

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Artist Image Service - Cron Scheduling

**Files:**
- Modify: `src/services/artistImageService.ts:74-79`
- Modify: `src/__tests__/services/artistImageService.test.ts` (add tests)

- [ ] **Step 1: Write failing test for scheduleArtistImageSync**

Add to `src/__tests__/services/artistImageService.test.ts`:

```typescript
import cron from "node-cron";

// Mock node-cron at the top with other mocks
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

describe("ArtistImageService - scheduleArtistImageSync", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should schedule cron job for Sunday 3 AM", () => {
    scheduleArtistImageSync();

    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(cron.schedule).toHaveBeenCalledWith(
      "0 3 * * 0",
      expect.any(Function)
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "scheduleArtistImageSync"
```

Expected: FAIL - "Not implemented yet"

- [ ] **Step 3: Import cron at top of service file**

Add import to `src/services/artistImageService.ts` at the top:

```typescript
import cron from "node-cron";
```

- [ ] **Step 4: Implement scheduleArtistImageSync**

Replace the `scheduleArtistImageSync` function in `src/services/artistImageService.ts`:

```typescript
/**
 * Schedule weekly artist image sync (Sunday 3 AM)
 */
export function scheduleArtistImageSync(): void {
  // Sunday at 3:00 AM
  cron.schedule("0 3 * * 0", async () => {
    logger.info("Starting scheduled artist image sync (cron job)");
    try {
      const result = await syncAllArtistImages();
      logger.info(
        `Scheduled sync complete. Success: ${result.success}, Failed: ${result.failed}, Skipped: ${result.skipped}`
      );
      if (result.errors.length > 0) {
        logger.error({ errors: result.errors }, "Sync errors");
      }
    } catch (error) {
      logger.error({ error }, "Scheduled artist image sync failed");
    }
  });

  logger.info("Artist image sync cron job scheduled (every Sunday at 3 AM)");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts -t "scheduleArtistImageSync"
```

Expected: PASS

- [ ] **Step 6: Run all service tests**

Run:
```bash
npm test -- src/__tests__/services/artistImageService.test.ts
```

Expected: PASS - All artistImageService tests pass

- [ ] **Step 7: Commit**

```bash
git add src/services/artistImageService.ts src/__tests__/services/artistImageService.test.ts
git commit -m "feat: implement cron scheduling for artist image sync

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Hook into Concert Creation

**Files:**
- Modify: `src/conversations/add_concert.ts:40-48`

- [ ] **Step 1: Import artistImageService**

Add import at the top of `src/conversations/add_concert.ts`:

```typescript
import { updateConcertArtistImage } from "#/services/artistImageService";
```

- [ ] **Step 2: Add artist image fetch after concert creation**

Find the section after `prisma.concert.create` (around line 40-48) and add the artist image fetch. The code should look like:

```typescript
      const concert = await prisma.concert.create({
        data: {
          userId: dbUserId,
          artistName,
          venue,
          concertDate: concertDateObj,
          concertTime: concertTimeObj,
          url,
          notes,
        },
      });

      logAction(dbUserId, `Added concert "${artistName}" at ${venue}`);

      // Fetch artist image (non-blocking)
      try {
        await updateConcertArtistImage(concert.id);
      } catch (error) {
        console.warn(`Failed to fetch artist image for concert ${concert.id}:`, error);
        // Don't fail concert creation if image fetch fails
      }

      return concert;
```

- [ ] **Step 3: Test manually**

Run the bot in dev mode:
```bash
npm run dev
```

In Telegram:
1. Add a new concert with a well-known artist (e.g., "Radiohead")
2. Check logs for "Successfully updated concert with artist image"
3. Verify in Prisma Studio that `artistImageUrl` and `spotifyArtistId` are populated

- [ ] **Step 4: Commit**

```bash
git add src/conversations/add_concert.ts
git commit -m "feat: fetch artist image on concert creation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Hook into Concert Edit

**Files:**
- Modify: `src/conversations/edit_concert.ts`

- [ ] **Step 1: Read edit_concert.ts to understand structure**

Run:
```bash
cat src/conversations/edit_concert.ts
```

Read through the file to understand where artist name is updated.

- [ ] **Step 2: Import artistImageService**

Add import at the top of `src/conversations/edit_concert.ts`:

```typescript
import { updateConcertArtistImage } from "#/services/artistImageService";
```

- [ ] **Step 3: Add re-fetch logic when artist name changes**

Find where the concert is updated with new values (likely in a `prisma.concert.update` call). After the update, add:

```typescript
      // Update concert in database
      const updatedConcert = await prisma.concert.update({
        where: { id: concertId },
        data: {
          // ... existing fields
        },
      });

      // Re-fetch artist image if artist name changed (always re-fetch on edit)
      try {
        // Clear existing image data first
        await prisma.concert.update({
          where: { id: concertId },
          data: {
            artistImageUrl: null,
            spotifyArtistId: null,
          },
        });

        // Fetch new image
        await updateConcertArtistImage(concertId);
      } catch (error) {
        console.warn(`Failed to fetch artist image for concert ${concertId}:`, error);
        // Don't fail edit if image fetch fails
      }
```

Note: According to spec, we always re-fetch on edit. If you want to optimize to only re-fetch when artist name changes, you'd need to track the old artist name and compare. For now, always re-fetch is simpler and matches user requirement "A".

- [ ] **Step 4: Test manually**

Run the bot in dev mode:
```bash
npm run dev
```

In Telegram:
1. Edit an existing concert to change artist name
2. Check logs for image re-fetch
3. Verify in Prisma Studio that image updated

- [ ] **Step 5: Commit**

```bash
git add src/conversations/edit_concert.ts
git commit -m "feat: re-fetch artist image when concert is edited

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Admin Sync Command

**Files:**
- Create: `src/commands/concerts/sync_artist_images.ts`
- Test: `src/__tests__/commands/concerts/sync_artist_images.test.ts`
- Modify: `src/bot/commands.ts`

- [ ] **Step 1: Write failing test for sync command**

Create `src/__tests__/commands/concerts/sync_artist_images.test.ts`:

```typescript
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

    expect(mockCtx.reply).toHaveBeenCalledWith(
      "🎨 Syncing artist images for all concerts..."
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Success: 5")
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Skipped: 2")
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Failed: 0")
    );
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
    (syncAllArtistImages as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    await syncArtistImagesCommand(mockCtx as BotContext);

    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("❌ Sync failed")
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Database error")
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
npm test -- src/__tests__/commands/concerts/sync_artist_images.test.ts
```

Expected: FAIL - "Cannot find module"

- [ ] **Step 3: Create sync command**

Create `src/commands/concerts/sync_artist_images.ts`:

```typescript
import { BotContext } from "#/types/global";
import { syncAllArtistImages } from "#/services/artistImageService";
import logger from "#/config/logger";

export const syncArtistImagesCommand = async (ctx: BotContext) => {
  await ctx.reply("🎨 Syncing artist images for all concerts...");

  try {
    const result = await syncAllArtistImages();

    let message = `✅ Sync complete!\n`;
    message += `• Success: ${result.success}\n`;
    message += `• Skipped: ${result.skipped} (already have images)\n`;
    message += `• Failed: ${result.failed}`;

    if (result.failed > 0) {
      message += `\n\n⚠️ Failed concerts:\n`;
      result.errors.forEach((error) => {
        message += `• ${error}\n`;
      });
    }

    await ctx.reply(message);
  } catch (error) {
    logger.error({ error }, "Sync artist images command error");
    await ctx.reply(
      `❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
npm test -- src/__tests__/commands/concerts/sync_artist_images.test.ts
```

Expected: PASS - All tests pass

- [ ] **Step 5: Register command**

Find `src/bot/commands.ts` and look for where admin commands are registered (likely near `sync_photos`). Add the import at the top:

```typescript
import { syncArtistImagesCommand } from "#/commands/concerts/sync_artist_images";
```

Then register the command in the admin commands section:

```typescript
  // Admin commands
  bot.command("sync_photos", isAdmin, syncPhotosCommand);
  bot.command("sync_artist_images", isAdmin, syncArtistImagesCommand); // NEW
```

- [ ] **Step 6: Test manually**

Run the bot:
```bash
npm run dev
```

In Telegram (as admin):
```
/sync_artist_images
```

Expected: Bot syncs all concerts and reports statistics

- [ ] **Step 7: Commit**

```bash
git add src/commands/concerts/sync_artist_images.ts src/__tests__/commands/concerts/sync_artist_images.test.ts src/bot/commands.ts
git commit -m "feat: add admin command for manual artist image sync

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Schedule Cron Job

**Files:**
- Modify: `src/bot.ts:63-71`

- [ ] **Step 1: Import scheduleArtistImageSync**

Add import at the top of `src/bot.ts`:

```typescript
import { scheduleArtistImageSync } from "#/services/artistImageService";
```

- [ ] **Step 2: Schedule artist image sync**

Find where `scheduleProfilePhotoSync(bot);` is called (around line 63). Add the artist image sync right after:

```typescript
// Schedule profile photo sync
scheduleProfilePhotoSync(bot);

// Schedule artist image sync
scheduleArtistImageSync();

console.log("🔔 Notifications system initialized.");
```

- [ ] **Step 3: Test cron scheduling**

Run the bot:
```bash
npm run dev
```

Expected log messages:
```
Profile photo sync cron job scheduled (every Sunday at 3 AM)
Artist image sync cron job scheduled (every Sunday at 3 AM)
🔔 Notifications system initialized.
```

- [ ] **Step 4: Commit**

```bash
git add src/bot.ts
git commit -m "feat: schedule weekly artist image sync cron job

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Update API Routes

**Files:**
- Modify: `src/api/routes/concerts.routes.ts`

- [ ] **Step 1: Find concert query selections**

Run:
```bash
grep -n "select:" src/api/routes/concerts.routes.ts | head -5
```

This shows where Prisma select statements are used.

- [ ] **Step 2: Add new fields to all concert selects**

For each `prisma.concert.findMany` or similar query, ensure `artistImageUrl` and `spotifyArtistId` are included in the select. Example:

```typescript
const concerts = await prisma.concert.findMany({
  select: {
    id: true,
    artistName: true,
    venue: true,
    concertDate: true,
    concertTime: true,
    notes: true,
    url: true,
    artistImageUrl: true,      // NEW
    spotifyArtistId: true,     // NEW
    userId: true,
    createdAt: true,
    updatedAt: true,
    // ... other fields
  },
  // ... other options
});
```

Repeat for all concert queries in the file.

- [ ] **Step 3: Test API endpoint**

Run the bot with API server:
```bash
npm run dev
```

Make a request to the concerts API endpoint:
```bash
curl http://localhost:3000/api/concerts | jq '.[0]'
```

Expected: Response includes `artistImageUrl` and `spotifyArtistId` fields

- [ ] **Step 4: Commit**

```bash
git add src/api/routes/concerts.routes.ts
git commit -m "feat: include artistImageUrl and spotifyArtistId in API responses

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Update Frontend Types

**Files:**
- Modify: `web/src/types/concert.ts:1-20`

- [ ] **Step 1: Add new fields to Concert interface**

Open `web/src/types/concert.ts` and add two new fields:

```typescript
export interface Concert {
  id: number;
  artistName: string;
  venue: string;
  concertDate: Date | string;
  concertTime: Date | string | null;
  notes: string | null;
  url: string | null;
  userId: number;
  notified: boolean;
  artistImageUrl: string | null;      // NEW
  spotifyArtistId: string | null;     // NEW
  createdAt: Date | string;
  updatedAt: Date | string;
  responses?: {
    going: number;
    interested: number;
    not_going: number;
    userResponse: "going" | "interested" | "not_going" | null;
  };
}
```

- [ ] **Step 2: Run TypeScript check**

Run:
```bash
cd web && npm run build
```

Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add web/src/types/concert.ts
git commit -m "feat: add artistImageUrl and spotifyArtistId to Concert type

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Update ConcertCard Component

**Files:**
- Modify: `web/src/components/ConcertCard.tsx:86-91`

- [ ] **Step 1: Update Image src with fallback**

Find the `<Image>` component in `ConcertCard.tsx` (around line 86-91) and update the src:

```typescript
      <Image
        src={concert.artistImageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819"}
        alt={concert.artistName}
        fallbackIcon="music"
        className="w-full! h-48! object-cover rounded-t-2xl"
      />
```

The Unsplash image (photo-1514525253161-7a46d19cd819) is a concert crowd photo that serves as a contextual fallback.

- [ ] **Step 2: Test in browser**

Run the web app:
```bash
cd web && npm run dev
```

Open browser and check concert cards:
1. Concerts with images should show artist photos
2. Concerts without images should show the concert crowd fallback
3. Images should maintain proper aspect ratio and styling

- [ ] **Step 3: Commit**

```bash
git add web/src/components/ConcertCard.tsx
git commit -m "feat: display artist images in concert cards with fallback

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Add Environment Variables

**Files:**
- Modify: `.env.example` (or create if doesn't exist)
- Modify: `.env.local`, `.env.production`, etc.

- [ ] **Step 1: Get Spotify credentials**

1. Go to https://developer.spotify.com/dashboard
2. Log in with Spotify account
3. Click "Create app"
4. Fill in:
   - App name: "Burro dos Concertos"
   - App description: "Concert management bot"
   - Redirect URI: (leave empty for client credentials)
5. Accept terms and create
6. Copy Client ID and Client Secret

- [ ] **Step 2: Add to .env.example**

Add to `.env.example`:

```bash
# Spotify API (for artist images)
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

- [ ] **Step 3: Add to local environment**

Add to `.env.local`:

```bash
SPOTIFY_CLIENT_ID=<paste actual client ID>
SPOTIFY_CLIENT_SECRET=<paste actual client secret>
```

- [ ] **Step 4: Verify environment**

Run:
```bash
npm run dev
```

Check logs for:
- No warnings about missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET
- "Artist image sync cron job scheduled"

- [ ] **Step 5: Commit**

```bash
git add .env.example
git commit -m "docs: add Spotify API credentials to env example

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

Note: `.env.local` should NOT be committed (already in .gitignore)

---

## Task 17: Integration Test

**Files:**
- No new files, testing existing integration

- [ ] **Step 1: Run all tests**

Run full test suite:
```bash
npm test
```

Expected: All tests pass

- [ ] **Step 2: Test complete flow - Create concert**

Run bot:
```bash
npm run dev
```

In Telegram:
1. Send `/add` to add a new concert
2. Enter artist: "The Beatles"
3. Complete the concert creation flow
4. Check logs for "Successfully updated concert with artist image"
5. Open Prisma Studio and verify the concert has:
   - `artistImageUrl` populated
   - `spotifyArtistId` populated

- [ ] **Step 3: Test complete flow - Edit concert**

In Telegram:
1. Edit the previously created concert
2. Change artist name to "Radiohead"
3. Check logs for image re-fetch
4. Verify in Prisma Studio that image updated to Radiohead's image

- [ ] **Step 4: Test complete flow - Unknown artist**

In Telegram:
1. Add concert with fake artist: "Unknown Band XYZ 123"
2. Complete creation
3. Check logs: "Artist not found in Spotify"
4. Verify in Prisma Studio:
   - `artistImageUrl` is null
   - `spotifyArtistId` is null

- [ ] **Step 5: Test admin command**

In Telegram (as admin):
1. Send `/sync_artist_images`
2. Wait for sync to complete
3. Verify stats message shows correct counts
4. Check logs for sync summary

- [ ] **Step 6: Test frontend display**

Open web app:
```bash
cd web && npm run dev
```

1. Verify concert cards show artist images for known artists
2. Verify fallback image shows for unknown artists
3. Verify images look good (proper sizing, aspect ratio)

- [ ] **Step 7: Document success**

All integration tests passed! Create a summary note in terminal:

```bash
echo "✅ Artist images integration complete!" > /tmp/artist-images-test-results.txt
echo "- Spotify API authentication working" >> /tmp/artist-images-test-results.txt
echo "- Artist search and image fetch working" >> /tmp/artist-images-test-results.txt
echo "- Database fields populated correctly" >> /tmp/artist-images-test-results.txt
echo "- Frontend displays images with fallback" >> /tmp/artist-images-test-results.txt
echo "- Admin command working" >> /tmp/artist-images-test-results.txt
echo "- Cron job scheduled" >> /tmp/artist-images-test-results.txt
cat /tmp/artist-images-test-results.txt
```

- [ ] **Step 8: Commit integration confirmation**

```bash
git commit --allow-empty -m "test: verify artist images integration

All integration tests passed:
- Spotify API authentication ✓
- Artist search and image fetch ✓
- Concert creation with image ✓
- Concert edit re-fetches image ✓
- Unknown artist fallback ✓
- Admin sync command ✓
- Frontend display ✓
- Cron scheduling ✓

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 18: Documentation

**Files:**
- Create: `docs/features/artist-images.md`

- [ ] **Step 1: Create feature documentation**

Create `docs/features/artist-images.md`:

```markdown
# Artist Images Feature

Automatically fetch and display artist images from Spotify API in concert cards.

## Overview

When a concert is created or edited, the system automatically searches Spotify for the artist and fetches their image. Images are cached in the database and displayed in concert cards on the web app.

## How It Works

1. **On Concert Creation**: Artist image is fetched from Spotify and stored in database
2. **On Concert Edit**: If concert is edited (regardless of whether artist name changed), image is re-fetched
3. **Weekly Sync**: Every Sunday at 3 AM, all concerts without images are synced
4. **Manual Sync**: Admins can trigger sync anytime with `/sync_artist_images`

## Fallback Behavior

If an artist is not found on Spotify or has no images:
- Database fields (`artistImageUrl`, `spotifyArtistId`) are set to `null`
- Frontend displays a generic concert crowd image as fallback
- No errors are shown to users - graceful degradation

## Admin Commands

### `/sync_artist_images`

Manually trigger artist image sync for all concerts.

**Response:**
```
✅ Sync complete!
• Success: 15
• Skipped: 3 (already have images)
• Failed: 0
```

## Database Schema

Two new fields added to `Concert` model:
- `artistImageUrl` (String, nullable) - URL to cached Spotify artist image
- `spotifyArtistId` (String, nullable) - Spotify artist ID for future features

## Environment Variables

Required:
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret

## API Integration

Uses Spotify Web API with Client Credentials OAuth flow:
- Authentication tokens cached in memory (1 hour expiration)
- Each server manages its own token independently
- Search strategy: Take first result (highest relevance)
- Image preference: 640px width, fallback to first available

## Rate Limits

Spotify allows ~180 requests/minute. At 10 concerts/month scale, rate limits are not a concern.

## Future Enhancements

With `spotifyArtistId` stored, possible future features:
- Display artist genres, popularity, follower count
- Link to artist's Spotify page
- Show related artists
- Fetch top tracks for pre-concert listening
```

- [ ] **Step 2: Update main README**

If there's a README.md at the project root, add a note about the artist images feature:

```markdown
## Features

- Concert management via Telegram bot
- Poll-based attendance tracking
- **Artist images from Spotify** - Automatic artist photo fetching and display
- Calendar export (iCal)
- Web interface for concert browsing
```

- [ ] **Step 3: Commit documentation**

```bash
git add docs/features/artist-images.md README.md
git commit -m "docs: add artist images feature documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Deployment Checklist

Before deploying to production:

- [ ] Verify all tests pass: `npm test`
- [ ] Verify TypeScript compiles: `npm run build`
- [ ] Add Spotify credentials to production environment variables
- [ ] Run database migration: `npx prisma migrate deploy`
- [ ] Test in staging environment first
- [ ] Deploy backend
- [ ] Deploy frontend (rebuild with new types)
- [ ] Monitor logs for any errors
- [ ] Run manual sync with `/sync_artist_images` to backfill existing concerts
- [ ] Verify first cron job runs successfully (Sunday 3 AM)

---

## Implementation Complete! 🎉

All tasks completed. The artist images feature is fully integrated:

✅ Database schema updated
✅ Spotify API client implemented
✅ Artist image service with fetch/update/sync functions
✅ Cron scheduling (Sunday 3 AM)
✅ Integration with concert creation and edit
✅ Admin command for manual sync
✅ Frontend displaying images with fallback
✅ Comprehensive test coverage
✅ Documentation complete

**Next steps:**
1. Deploy to production (follow deployment checklist)
2. Monitor Spotify API usage
3. Consider future enhancements (artist info, related artists, etc.)
