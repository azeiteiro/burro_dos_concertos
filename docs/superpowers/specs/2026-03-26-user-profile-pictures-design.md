# User Profile Pictures in Attendance Lists

**Date:** 2026-03-26
**Status:** Approved
**Author:** Design session with user

## Overview

Add Telegram user profile pictures to the attendance lists in the concert detail modal. Users will see avatars next to names in the "Going", "Interested", and "Not Going" sections, with an initials-based fallback for users without profile photos.

## Goals

- Display user profile pictures in attendance chips to make the UI more personal and visually appealing
- Handle existing production users (20 users already registered)
- Keep implementation simple and maintainable
- Ensure graceful fallbacks for users without profile photos
- Minimize server load and API calls

## Non-Goals

- Profile pictures in concert cards (future enhancement)
- User profile page with larger photos (future enhancement)
- Artist pictures for concerts (separate project)
- Real-time profile picture updates

## Context

This is a production Telegram mini app with 20 registered users. The app displays concert attendance in a modal (`ConcertDetail.tsx`) showing who is going, interested, or not going. Currently, only usernames/names are displayed. Profile pictures rarely change, and all users are in the same timezone with no traffic during night hours (3-4 AM).

## Requirements

### Functional Requirements

1. Fetch user profile pictures from Telegram Bot API
2. Store profile picture URLs in the database
3. Display pictures in attendance chips (40x40px circular avatars)
4. Show initials in colored circles when no profile picture available
5. Refresh profile pictures weekly via cron job (Sunday 3 AM)
6. Provide manual sync trigger via admin command (`/sync_photos`)
7. Use smallest available photo size from Telegram (optimized for 40-50px display)

### User Experience Requirements

1. **Name Priority**: Display format
   - First choice: `firstName + lastName` → initials "JS" (John Smith)
   - Fallback: `username` → first 1-2 letters
   - Last resort: "?" character

2. **Avatar Display**:
   - 32x32px circular avatar
   - If photo exists: display image
   - If no photo: colored circle with white initials
   - 8 distinct colors, deterministically generated from name

3. **Performance**:
   - Frontend displays cached images from Telegram CDN
   - No blocking API calls on page load
   - Graceful degradation if images fail to load

## Database Schema Changes

### Migration

```prisma
model User {
  id              Int               @id @default(autoincrement())
  telegramId      BigInt            @unique
  username        String?
  firstName       String?
  lastName        String?
  languageCode    String?
  profilePhotoUrl String?           // NEW: Telegram profile photo URL (small size)
  createdAt       DateTime          @default(now())
  role            String            @default("User")
  concerts        Concert[]
  responses       ConcertResponse[]
}
```

**Field Details:**
- `profilePhotoUrl`: Nullable string containing full Telegram file URL
- Format: `https://api.telegram.org/file/bot<BOT_TOKEN>/<file_path>`
- Size: Smallest available from Telegram (~160x160px source, displayed at 32x32px)

**Migration Strategy:**
- Add field as nullable
- Existing 20 users will have `null` initially
- First cron job run populates all users
- No manual data migration needed

## Backend Architecture

### New Service: Profile Photo Service

**File:** `src/services/profilePhotoService.ts`

**Core Functions:**

```typescript
/**
 * Fetches and updates profile photos for all users
 * @returns Summary with success/failure counts and errors
 */
export async function fetchAllUserProfilePhotos(bot: Bot): Promise<{
  success: number;
  failed: number;
  errors: string[];
}>

/**
 * Fetches single user's profile photo from Telegram
 * @returns Photo URL or null if no photo available
 */
async function fetchUserProfilePhoto(bot: Bot, user: User): Promise<string | null>

/**
 * Schedules weekly profile photo sync (Sunday 3 AM)
 */
export function scheduleProfilePhotoSync(bot: Bot): void
```

**Implementation Logic:**

1. **`fetchAllUserProfilePhotos()` flow:**
   ```
   1. Query all users from database
   2. For each user:
      a. Call bot.api.getUserProfilePhotos(user.telegramId, { limit: 1 })
      b. If photos exist:
         - Get smallest size file_id from first photo
         - Call bot.api.getFile(file_id) to get file_path
         - Construct URL: https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}
         - Update user.profilePhotoUrl in database
      c. If no photos or error:
         - Set profilePhotoUrl to null
         - Log error (continue to next user)
   3. Return summary report
   ```

2. **Error Handling:**
   - Catch errors per user (don't fail entire batch)
   - Log errors with user ID and error message
   - Continue processing remaining users
   - Return detailed error report

3. **Cron Schedule:**
   - Runs every Sunday at 3:00 AM (Europe/Lisbon timezone)
   - Uses `node-cron` library (already in dependencies)
   - Logs start/completion/results

### New Admin Command

**File:** `src/commands/admin/sync_photos.ts`

```typescript
/**
 * Manual trigger for profile photo sync
 * SuperAdmin only
 * Shows progress and results in Telegram
 */
Command: /sync_photos
Access: SuperAdmin only
Response:
  - "🔄 Syncing profile photos for all users..."
  - "✅ Sync complete! Success: 18/20, Failed: 2"
  - [Error details if any]
```

### Bot Integration

**File:** `src/bot.ts`

```typescript
// On bot startup
import { scheduleProfilePhotoSync } from './services/profilePhotoService';

// Start cron job
scheduleProfilePhotoSync(bot);

// Register admin command
bot.command('sync_photos', syncPhotosCommand);
```

### API Changes

**File:** `src/api/routes/concerts.routes.ts`

**Endpoint:** `GET /api/concerts/:id/responses`

**Current Response:**
```json
{
  "concertId": 1,
  "going": {
    "count": 5,
    "users": [
      {
        "id": 1,
        "telegramId": "123456789",
        "username": "john_doe",
        "firstName": "John"
      }
    ]
  },
  "interested": { "count": 2, "users": [...] },
  "not_going": { "count": 1, "users": [...] }
}
```

**New Response:**
```json
{
  "concertId": 1,
  "going": {
    "count": 5,
    "users": [
      {
        "id": 1,
        "telegramId": "123456789",
        "username": "john_doe",
        "firstName": "John",
        "lastName": "Smith",
        "profilePhotoUrl": "https://api.telegram.org/file/bot<TOKEN>/photos/file_123.jpg"
      }
    ]
  },
  "interested": { "count": 2, "users": [...] },
  "not_going": { "count": 1, "users": [...] }
}
```

**Changes:**
- Add `profilePhotoUrl` (optional) to user objects
- Add `lastName` (optional) to user objects (may already exist)
- No breaking changes (fields are optional)

## Frontend Architecture

### Component Changes

**File:** `web/src/components/ConcertDetail.tsx`

**Current Chip Structure:**
```tsx
<span className="px-3 py-1 rounded-full text-sm">
  {formatUserName(user)}
</span>
```

**New Chip Structure:**
```tsx
<span className="px-3 py-1 rounded-full text-sm flex items-center gap-2">
  {/* Avatar circle */}
  <div className="w-8 h-8 rounded-full flex-shrink-0">
    {user.profilePhotoUrl ? (
      <img
        src={user.profilePhotoUrl}
        alt={user.firstName}
        className="w-full h-full rounded-full object-cover"
        onError={(e) => {
          // Fallback to initials if image fails to load
          e.currentTarget.style.display = 'none';
        }}
      />
    ) : (
      <div
        className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold text-xs"
        style={{ backgroundColor: generateColorFromName(user.firstName) }}
      >
        {getInitials(user)}
      </div>
    )}
  </div>

  {/* Username */}
  <span>{formatUserName(user)}</span>
</span>
```

### New Utility Functions

**Location:** Add to `ConcertDetail.tsx` (or extract to `web/src/utils/avatar.ts` if reused)

```typescript
/**
 * Generate initials from user data
 * Priority: firstName + lastName > username > "?"
 */
function getInitials(user: AttendanceResponse): string {
  // Try firstName + lastName
  if (user.firstName) {
    const first = user.firstName.charAt(0).toUpperCase();
    const last = user.lastName?.charAt(0).toUpperCase() || '';
    return last ? first + last : first;
  }

  // Fallback to username
  if (user.username) {
    return user.username.substring(0, 2).toUpperCase();
  }

  // Last resort
  return '?';
}

/**
 * Generate consistent color from name for initials background
 * Uses 8 distinct colors, deterministically selected by name hash
 */
function generateColorFromName(name: string): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Orange
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2'  // Light Blue
  ];

  // Generate hash from name
  const hash = name?.split('').reduce((acc, char) =>
    acc + char.charCodeAt(0), 0) || 0;

  return colors[hash % colors.length];
}
```

### Type Updates

```typescript
interface AttendanceResponse {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName?: string;           // NEW (might already exist)
  profilePhotoUrl?: string;    // NEW
}
```

### Visual Design Specs

- **Avatar size**: 32x32px (`w-8 h-8` in Tailwind)
- **Shape**: Circular (`rounded-full`)
- **Photo display**: `object-cover` to crop/center images
- **Initials circle**: Same size, colored background, white text, 12px font
- **Chip layout**: Horizontal flex with 8px gap between avatar and name
- **Chip padding**: Existing `px-3 py-1` maintained

## Error Handling & Edge Cases

### Backend Error Scenarios

| Scenario | Handling |
|----------|----------|
| User has no profile photo | Set `profilePhotoUrl` to `null`, frontend shows initials |
| Telegram API error (bot blocked) | Log error, set URL to `null`, continue to next user |
| Telegram API rate limit | Catch error, log, retry after delay (rare with 20 users) |
| User deleted account | API returns error, set URL to `null` |
| Network timeout | Catch error, log, continue to next user |
| Concurrent cron runs | Low risk (weekly schedule), add lock flag if needed |

### Frontend Error Scenarios

| Scenario | Handling |
|----------|----------|
| Image fails to load | `onError` handler hides image, shows initials fallback |
| User has no name or username | `getInitials()` returns `"?"`, shows in colored circle |
| API response missing `profilePhotoUrl` | Type is optional, renders initials by default |
| Slow image loading | Browser handles naturally, no spinner needed (small images) |

### Security Considerations

**Bot Token in URLs:**
- Profile photo URLs contain bot token: `https://api.telegram.org/file/bot<TOKEN>/<file_path>`
- This is safe and intentional - Telegram requires the token to serve images
- Token is already exposed in bot API requests
- No additional security risk introduced

**Access Control:**
- `/sync_photos` command restricted to SuperAdmin role
- API endpoint uses existing authentication
- No new attack surface

### Performance Considerations

**Storage:**
- 20 users × ~50KB per photo = ~1MB total storage
- Negligible database impact (just URL strings)

**Network:**
- Weekly sync: 20 API calls to Telegram (at 3 AM, zero traffic)
- Frontend: Images served by Telegram CDN, cached by browser
- No pagination needed for attendance lists (small user base)

**API Rate Limits:**
- Telegram Bot API is generous with rate limits
- 20 calls once per week is well within limits
- Manual `/sync_photos` command throttled by SuperAdmin access

## Testing Strategy

### Backend Tests

**1. Profile Photo Service Tests**
**File:** `src/__tests__/services/profilePhotoService.test.ts`

```typescript
describe('ProfilePhotoService', () => {
  describe('fetchAllUserProfilePhotos', () => {
    it('fetches and updates photos for all users')
    it('handles users with no profile photos')
    it('handles Telegram API errors gracefully')
    it('continues processing after individual failures')
    it('returns accurate success/failure summary')
  })

  describe('fetchUserProfilePhoto', () => {
    it('constructs correct Telegram URL')
    it('selects smallest photo size')
    it('returns null when user has no photos')
  })
})
```

**2. API Endpoint Tests**
**File:** `src/__tests__/api/routes.test.ts`

```typescript
describe('GET /api/concerts/:id/responses', () => {
  it('includes profilePhotoUrl for users with photos')
  it('includes null profilePhotoUrl for users without photos')
  it('includes lastName field')
  it('maintains backward compatibility')
})
```

**3. Admin Command Tests**
**File:** `src/__tests__/commands/admin/sync_photos.test.ts`

```typescript
describe('/sync_photos command', () => {
  it('requires SuperAdmin role')
  it('triggers fetchAllUserProfilePhotos')
  it('returns success message with summary')
  it('returns error details on failures')
})
```

### Frontend Tests

**1. Avatar Utility Tests**
**File:** `web/src/__tests__/utils/avatar.test.ts`

```typescript
describe('Avatar Utils', () => {
  describe('getInitials', () => {
    it('returns firstName + lastName initials')
    it('returns single initial if no lastName')
    it('falls back to username initials')
    it('returns "?" when no name or username')
  })

  describe('generateColorFromName', () => {
    it('generates consistent color for same name')
    it('returns one of 8 predefined colors')
    it('handles null/undefined names')
  })
})
```

**2. Component Tests**
**File:** `web/src/__tests__/components/ConcertDetail.test.tsx`

```typescript
describe('ConcertDetail - Avatars', () => {
  it('renders profile photo when URL provided')
  it('renders initials fallback when no URL')
  it('handles image load errors')
  it('displays correct initials for various users')
  it('maintains existing attendance list functionality')
})
```

### Manual Testing Checklist

- [ ] Run database migration successfully
- [ ] Verify cron job starts on bot startup (check logs)
- [ ] Run `/sync_photos` command as SuperAdmin
- [ ] Verify photos populate in database (check Prisma Studio)
- [ ] View concert attendance list with avatars
- [ ] Verify initials fallback for users without photos
- [ ] Test with user who has no firstName (username only)
- [ ] Add new user, verify shows initials until next sync
- [ ] Verify image loading error handling (break URL manually)
- [ ] Check logs for cron job execution on Sunday 3 AM

## Implementation Phases

### Phase 1: Database & Backend Core
1. Create and run database migration
2. Implement `profilePhotoService.ts`
3. Add cron job scheduler
4. Write backend unit tests
5. Manual testing of service functions

### Phase 2: Admin Command & API
1. Implement `/sync_photos` command
2. Update concert responses API endpoint
3. Test API endpoint changes
4. Run `/sync_photos` to populate existing users

### Phase 3: Frontend
1. Update TypeScript types
2. Implement avatar utility functions
3. Update `ConcertDetail.tsx` component
4. Write frontend tests
5. Visual testing in mini app

### Phase 4: Integration & Deployment
1. End-to-end testing
2. Verify cron job in production-like environment
3. Deploy to staging (Digital Ocean)
4. Test with real Telegram accounts
5. Deploy to production (Fly.io)
6. Monitor first cron job run

## Future Enhancements

**Not included in this design:**

1. **Artist Profile Pictures** - Separate project for concert cards
2. **User Profile Page** - Larger photos, user details, concert history
3. **Smart Refresh Logic** - Only refresh active users (overkill for 20 users)
4. **Multiple Photo Sizes** - Store small + large URLs (add when profile page built)
5. **Real-time Updates** - Fetch photos on user interaction (unnecessary complexity)
6. **Profile Picture Upload** - Allow users to customize (out of scope)

## Success Metrics

**Technical:**
- Migration runs successfully with zero downtime
- Cron job populates all 20 users within 2 minutes
- API response time remains under 200ms
- Image load time < 500ms (Telegram CDN is fast)
- Zero test failures

**User Experience:**
- Attendance lists feel more personal and engaging
- Initials fallback is visually consistent and polished
- No performance degradation in mini app
- Admin can manually trigger sync when needed

## Open Questions

None - all questions resolved during design session.

## Decisions Made

1. **Storage:** Telegram file URLs (not local files or cloud storage)
2. **Refresh frequency:** Weekly (Sunday 3 AM)
3. **Photo size:** Smallest available from Telegram
4. **Manual trigger:** Admin bot command (not API endpoint or npm script)
5. **Display location:** Attendance chips only (not concert cards)
6. **Fallback:** Initials in colored circles
7. **Name priority:** firstName + lastName > username > "?"
8. **Migration timing:** One feature at a time (not combining with artist pictures)
9. **Scope:** Focus on this feature only, defer other enhancements
