# Artist Images from Spotify API

**Date:** 2026-03-30
**Status:** Approved Design

## Overview

Replace static placeholder images in concert cards with dynamic artist images fetched from Spotify API. Images are fetched on concert creation/edit and synced weekly via cron job. When an artist isn't found, a generic concert fallback image is displayed.

## Requirements

- Fetch artist images from Spotify API using artist name search
- Store both image URL and Spotify artist ID in database for future features
- Fetch images on concert creation and when artist name is edited
- Weekly cron job (Sunday 3 AM) to sync/backfill images
- Admin command for manual sync
- Graceful fallback to generic concert image when artist not found
- Never block or fail concert operations due to image fetch failures

## Architecture Approach

**Selected: Mirror Profile Photo Service Pattern**

Create dedicated `artistImageService.ts` that follows the proven pattern established by `profilePhotoService.ts`. This ensures consistency with existing codebase, clean separation of concerns, and maintainable structure.

## Database Schema Changes

Add two new fields to `Concert` model in `prisma/schema.prisma`:

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
  artistImageUrl   String?           // NEW: Cached Spotify artist image URL
  spotifyArtistId  String?           // NEW: Spotify artist ID for future features
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  user             User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  responses        ConcertResponse[]

  @@index([concertDate])
  @@index([userId])
}
```

**Migration Strategy:**
- Existing concerts will have `null` for both new fields
- Backward compatible - no data loss
- Weekly cron job will backfill images for existing concerts
- Frontend handles null gracefully with fallback image

## Spotify API Integration

### Authentication

**OAuth Flow:** Client Credentials Flow (server-to-server, no user interaction)

**Environment Variables:**
```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

**Setup Process:**
1. Create one Spotify app in Spotify Developer Dashboard
2. Use same credentials across all environments (prod/staging/dev)
3. Each server independently manages its own access token in memory

**Token Management:**
- Access tokens valid for 1 hour
- Auto-refresh when expired
- Cached in memory with expiration timestamp
- Transparent to service consumers
- No token sharing between servers (each manages independently)

### Spotify Client

Create `src/services/spotify/spotifyClient.ts`:

```typescript
interface SpotifyToken {
  access_token: string;
  expires_at: number; // Unix timestamp
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{ url: string; width: number; height: number }>;
}

class SpotifyClient {
  private token: SpotifyToken | null = null;

  async getAccessToken(): Promise<string>
  async searchArtist(artistName: string): Promise<SpotifyArtist | null>
  async getArtist(artistId: string): Promise<SpotifyArtist | null>
}
```

**Search Strategy:**
- Use Spotify `/search` endpoint with `type=artist`
- Take first result (Spotify ranks by relevance/popularity)
- Extract artist ID and best quality image (prefer 640px width)
- Return null if no results found

**Rate Limits:**
- Spotify allows ~180 requests/minute
- More than sufficient for 10 concerts/month + weekly sync
- No rate limit handling needed at current scale

## Artist Image Service

Create `src/services/artistImageService.ts`:

### Core Functions

```typescript
/**
 * Fetch artist image from Spotify by name
 * @returns Image URL and Spotify ID, or null if not found
 */
async function fetchArtistImage(
  artistName: string
): Promise<{ imageUrl: string; spotifyArtistId: string } | null>

/**
 * Update single concert with artist image from Spotify
 * @returns true if successful, false otherwise
 */
async function updateConcertArtistImage(
  concertId: number
): Promise<boolean>

/**
 * Sync artist images for all concerts (batch operation)
 * @returns Summary with success/failure/skip counts
 */
async function syncAllArtistImages(): Promise<{
  success: number;
  failed: number;
  skipped: number; // Already has image
  errors: string[];
}>

/**
 * Schedule weekly artist image sync (Sunday 3 AM)
 */
function scheduleArtistImageSync(): void
```

### Implementation Details

**fetchArtistImage:**
1. Call `spotifyClient.searchArtist(artistName)`
2. If found → return `{ imageUrl, spotifyArtistId }`
3. If not found → return `null`
4. Log outcome for monitoring

**updateConcertArtistImage:**
1. Fetch concert from database
2. Call `fetchArtistImage(concert.artistName)`
3. Update concert with results (or null if not found)
4. Return success/failure
5. Never throw errors - log and return false

**syncAllArtistImages:**
1. Query all concerts from database
2. For each concert:
   - Skip if already has both `artistImageUrl` and `spotifyArtistId`
   - Otherwise fetch and update
3. Collect statistics: success/failed/skipped counts
4. Return summary with error details

**scheduleArtistImageSync:**
- Use node-cron with expression `0 3 * * 0` (Sunday 3 AM)
- Call `syncAllArtistImages()`
- Log results with success/failure counts
- Log errors if any occurred

## Integration Points

### Concert Creation

In `src/conversations/add_concert.ts` (after saving concert):

```typescript
// After concert is saved
const concert = await prisma.concert.create({ data: concertData });

// Fetch artist image (non-blocking)
try {
  await updateConcertArtistImage(concert.id);
} catch (error) {
  logger.warn({ concertId: concert.id }, "Failed to fetch artist image on creation");
  // Continue - don't fail concert creation
}
```

### Concert Edit

In `src/conversations/edit_concert.ts` (when artist name changes):

```typescript
// Check if artist name changed
if (oldArtistName !== newArtistName) {
  // Clear old image data
  await prisma.concert.update({
    where: { id: concertId },
    data: {
      artistName: newArtistName,
      artistImageUrl: null,
      spotifyArtistId: null,
    }
  });

  // Fetch new artist image
  try {
    await updateConcertArtistImage(concertId);
  } catch (error) {
    logger.warn({ concertId }, "Failed to fetch new artist image");
    // Continue - don't fail edit operation
  }
}
```

### Cron Job Setup

In `src/bot.ts` (add after profile photo sync):

```typescript
scheduleProfilePhotoSync(bot);
scheduleArtistImageSync(); // NEW
```

### Admin Command

Create `src/commands/concerts/sync_artist_images.ts`:

```typescript
import { BotContext } from "#/types/global";
import { syncAllArtistImages } from "#/services/artistImageService";
import logger from "#/config/logger";

export const syncArtistImagesCommand = async (ctx: BotContext) => {
  await ctx.reply("🎨 Syncing artist images for all concerts...");

  try {
    const result = await syncAllArtistImages();

    const total = result.success + result.failed + result.skipped;
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
    await ctx.reply(`❌ Sync failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
};
```

Register in `src/bot/commands.ts` as admin-only command.

## Frontend Changes

### Type Updates

In `web/src/types/concert.ts`:

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

### ConcertCard Component

In `web/src/components/ConcertCard.tsx`:

```typescript
// Replace hardcoded image
<Image
  src={concert.artistImageUrl || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819"}
  alt={concert.artistName}
  fallbackIcon="music"
  className="w-full! h-48! object-cover rounded-t-2xl"
/>
```

**Fallback Image:** Concert crowd photo from Unsplash (photo ID: 1514525253161-7a46d19cd819)
- More contextually relevant than current blurred lines image
- Zero setup needed (external CDN)
- Clearly communicates "concert" even without artist image

### API Route Updates

Update `src/api/routes/concerts.routes.ts` to include new fields in responses:

```typescript
// Ensure artistImageUrl and spotifyArtistId are included in concert queries
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
    // ... other fields
  }
});
```

## Error Handling & Fallbacks

### Failure Scenarios

**1. Authentication Failure (invalid credentials)**
- Log error with details
- Don't crash concert creation/edit
- Return null (use fallback image)
- Alert admin via logs

**2. Artist Not Found**
- Log: `"Artist '{name}' not found in Spotify"` (info level)
- Set `artistImageUrl` and `spotifyArtistId` to null
- Frontend shows fallback image
- Normal operation continues

**3. Rate Limit Exceeded (429)**
- Log warning
- Skip this concert in batch sync
- Will retry next week
- Don't block concert creation

**4. Network Timeout**
- Retry once with exponential backoff
- If still fails, log and continue
- Don't block user operations

**5. Invalid Response Format**
- Log error with response details
- Treat as "not found"
- Continue gracefully

### Logging Strategy

```typescript
// Success
logger.info({ concertId, artistName, spotifyArtistId }, "Fetched artist image");

// Artist not found (not an error)
logger.info({ artistName }, "Artist not found in Spotify");

// API/network errors
logger.warn({ error, artistName }, "Failed to fetch artist image");

// Auth errors
logger.error({ error }, "Spotify authentication failed");
```

### Critical Principle

**Artist image fetching must never block or fail concert operations.** It's an enhancement, not a requirement. If anything goes wrong at any point:
- Log the error appropriately
- Continue with null values
- Frontend displays fallback image
- User experience remains smooth

## Testing Considerations

### Unit Tests

- `spotifyClient.ts`: Mock Spotify API responses, test token refresh, test search parsing
- `artistImageService.ts`: Mock Spotify client, test all functions with various scenarios
- Test error handling for all failure cases

### Integration Tests

- Test concert creation with successful image fetch
- Test concert creation with failed image fetch (doesn't break creation)
- Test concert edit with artist name change
- Test batch sync with mixed success/failure/skip scenarios
- Test admin command response formatting

### Manual Testing

1. Create concert with well-known artist (e.g., "Radiohead") → should fetch image
2. Create concert with unknown artist (e.g., "asdfqwerzxcv") → should use fallback
3. Edit concert to change artist name → should fetch new image
4. Run admin sync command → should show correct counts
5. Verify fallback image displays correctly in frontend
6. Check logs for appropriate level and content

## Implementation Phases

### Phase 1: Backend Foundation
1. Add database migration for new fields
2. Create Spotify client with authentication
3. Create artist image service with core functions
4. Add unit tests

### Phase 2: Integration
1. Hook into concert creation handler
2. Hook into concert edit handler
3. Add cron job scheduling
4. Create admin command
5. Add integration tests

### Phase 3: Frontend
1. Update TypeScript types
2. Update ConcertCard component
3. Update API routes to include new fields
4. Test in dev environment

### Phase 4: Deployment
1. Add Spotify credentials to production environment
2. Deploy database migration
3. Deploy code changes
4. Run manual sync for existing concerts
5. Monitor logs for any issues

## Success Criteria

- Concert cards display artist images when available
- Fallback image displays when artist not found
- Concert creation never fails due to image fetch
- Weekly cron runs successfully and logs results
- Admin command works and shows accurate statistics
- No performance degradation in concert operations
- Logs provide clear visibility into success/failure cases

## Future Enhancements

With `spotifyArtistId` now stored, future features could include:
- Display artist genres, popularity, follower count
- Link to artist's Spotify page
- Show related artists
- Fetch top tracks for pre-concert listening
- Artist popularity trends over time
