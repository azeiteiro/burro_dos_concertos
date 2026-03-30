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
