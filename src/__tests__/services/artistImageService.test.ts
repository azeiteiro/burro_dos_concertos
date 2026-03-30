// Mock Spotify client BEFORE imports
let mockSearchArtist = jest.fn();
jest.mock("#/services/spotify/spotifyClient", () => ({
  SpotifyClient: jest.fn().mockImplementation(() => ({
    searchArtist: (...args: any[]) => mockSearchArtist(...args),
  })),
}));

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

import { fetchArtistImage, updateConcertArtistImage } from "#/services/artistImageService";
import { prisma } from "#/config/db";

describe("ArtistImageService - fetchArtistImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    mockSearchArtist = jest.fn().mockResolvedValue(mockArtist);
    const result = await fetchArtistImage("Arctic Monkeys");

    expect(result).not.toBeNull();
    expect(result?.imageUrl).toBe("https://image.url/640.jpg");
    expect(result?.spotifyArtistId).toBe("spotify_123");
    expect(mockSearchArtist).toHaveBeenCalledWith("Arctic Monkeys");
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

    mockSearchArtist = jest.fn().mockResolvedValue(mockArtist);
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

    mockSearchArtist = jest.fn().mockResolvedValue(mockArtist);
    const result = await fetchArtistImage("Indie Artist");

    expect(result?.imageUrl).toBe("https://image.url/300.jpg");
  });

  it("should return null if artist not found", async () => {
    mockSearchArtist = jest.fn().mockResolvedValue(null);
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

    mockSearchArtist = jest.fn().mockResolvedValue(mockArtist);
    const result = await fetchArtistImage("No Image Artist");

    expect(result).toBeNull();
  });

  it("should return null and log error if Spotify API fails", async () => {
    mockSearchArtist = jest.fn().mockRejectedValue(new Error("API Error"));
    const result = await fetchArtistImage("Error Artist");

    expect(result).toBeNull();
  });
});

describe("ArtistImageService - updateConcertArtistImage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    mockSearchArtist = jest.fn().mockResolvedValue(mockArtist);
    (prisma.concert.update as jest.Mock).mockResolvedValue({
      ...mockConcert,
      artistImageUrl: "https://image.url/radiohead.jpg",
      spotifyArtistId: "spotify_radiohead",
    });

    const result = await updateConcertArtistImage(1);

    expect(result).toBe(true);
    expect(prisma.concert.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, artistName: true },
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
    mockSearchArtist = jest.fn().mockResolvedValue(null);
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
    mockSearchArtist = jest.fn().mockResolvedValue(null);
    (prisma.concert.update as jest.Mock).mockRejectedValue(new Error("DB Error"));

    const result = await updateConcertArtistImage(3);

    expect(result).toBe(false);
  });
});
