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
}
