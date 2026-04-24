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
