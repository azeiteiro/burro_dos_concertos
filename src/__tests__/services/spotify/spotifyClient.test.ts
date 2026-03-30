import { SpotifyClient } from "#/services/spotify/spotifyClient";

// Mock fetch globally
global.fetch = jest.fn();

describe("SpotifyClient - Authentication", () => {
  let client: SpotifyClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set dummy env vars for tests
    process.env.SPOTIFY_CLIENT_ID = "test_client_id";
    process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
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

    await expect(client.getAccessToken()).rejects.toThrow("SPOTIFY_CLIENT_ID not configured");

    process.env.SPOTIFY_CLIENT_ID = originalClientId;
  });

  it("should throw error if CLIENT_SECRET missing", async () => {
    const originalClientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    delete process.env.SPOTIFY_CLIENT_SECRET;

    await expect(client.getAccessToken()).rejects.toThrow("SPOTIFY_CLIENT_SECRET not configured");

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

    await expect(client.getAccessToken()).rejects.toThrow("Spotify authentication failed: 401");
  });
});

describe("SpotifyClient - Artist Search", () => {
  let client: SpotifyClient;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set dummy env vars for tests
    process.env.SPOTIFY_CLIENT_ID = "test_client_id";
    process.env.SPOTIFY_CLIENT_SECRET = "test_client_secret";
    client = new SpotifyClient();
    (client as any).token = null;

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

    await expect(client.searchArtist("")).rejects.toThrow("Spotify search failed: 400");
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
