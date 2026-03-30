import logger from "#/config/logger";
import { SpotifyToken, CachedToken, SpotifyArtist, SpotifyErrorResponse } from "./types";

const SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async searchArtist(_artistName: string): Promise<SpotifyArtist | null> {
    // Will implement in next task
    throw new Error("Not implemented yet");
  }

  /**
   * Get artist by Spotify ID
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getArtist(_artistId: string): Promise<SpotifyArtist | null> {
    // Will implement in next task
    throw new Error("Not implemented yet");
  }
}
