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
