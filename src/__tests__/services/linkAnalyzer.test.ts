// Mock got, puppeteer-core, and http/https before importing anything that uses them
jest.mock("got", () => jest.fn());
jest.mock("puppeteer-core", () => ({
  default: {
    connect: jest.fn(),
  },
}));
jest.mock("http", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: jest.fn((_options, _callback) => {
    const req = {
      on: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    };
    // Simulate immediate error
    setTimeout(() => {
      const errorHandler = req.on.mock.calls.find((call) => call[0] === "error");
      if (errorHandler) {
        errorHandler[1](new Error("Mocked network error"));
      }
    }, 0);
    return req;
  }),
}));
jest.mock("https", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  request: jest.fn((_options, _callback) => {
    const req = {
      on: jest.fn(),
      end: jest.fn(),
      destroy: jest.fn(),
    };
    // Simulate immediate error
    setTimeout(() => {
      const errorHandler = req.on.mock.calls.find((call) => call[0] === "error");
      if (errorHandler) {
        errorHandler[1](new Error("Mocked network error"));
      }
    }, 0);
    return req;
  }),
}));

import { extractMetadata, parseConcertInfo, formatConcertPreview } from "@/services/linkAnalyzer";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const got = require("got");
const mockedGot = got as jest.MockedFunction<typeof got>;

describe("linkAnalyzer", () => {
  describe("extractMetadata", () => {
    it("should extract metadata from a valid page", async () => {
      mockedGot.mockResolvedValueOnce({
        body: `
          <html>
            <head>
              <meta property="og:title" content="Arctic Monkeys @ MEO Arena" />
              <meta property="og:description" content="Concert on June 15" />
              <meta property="og:image" content="https://example.com/image.jpg" />
            </head>
          </html>
        `,
        url: "https://example.com/concert",
      } as any);

      const result = await extractMetadata("https://example.com/concert");

      expect(result).toBeDefined();
      expect(result?.title).toBe("Arctic Monkeys @ MEO Arena");
      expect(result?.description).toContain("Concert");
      expect(result?.url).toBe("https://example.com/concert");
    });

    it("should return null when metadata extraction fails", async () => {
      mockedGot.mockRejectedValueOnce(new Error("Network error"));

      const result = await extractMetadata("https://invalid.com");

      expect(result).toBeNull();
    });

    it("should return null when no title or description found", async () => {
      mockedGot.mockResolvedValueOnce({
        body: "<html><head></head><body></body></html>",
        url: "https://example.com",
      } as any);

      const result = await extractMetadata("https://example.com");

      expect(result).toBeNull();
    });

    it("should return null when HTML is empty", async () => {
      mockedGot.mockResolvedValueOnce({
        body: "",
        url: "https://example.com",
      } as any);

      const result = await extractMetadata("https://example.com");

      expect(result).toBeNull();
    });

    it("should include HTML in metadata for later parsing", async () => {
      jest.clearAllMocks();

      const html = '<html><head><meta property="og:title" content="Test Concert" /></head></html>';
      mockedGot.mockResolvedValueOnce({
        body: html,
        url: "https://example.com",
      } as any);

      const result = await extractMetadata("https://example.com");

      expect(result).not.toBeNull();
      expect(result?.html).toBe(html);
    });

    it("should detect JavaScript requirement and skip Browserless when API key not set", async () => {
      const originalApiKey = process.env.BROWSERLESS_API_KEY;
      delete process.env.BROWSERLESS_API_KEY;

      const htmlWithJS = `
        <html>
          <head>
            <script>document.location.href = 'redirect';</script>
            <meta property="og:title" content="JS Required" />
          </head>
          <body><noscript>JavaScript required</noscript></body>
        </html>
      `;

      mockedGot.mockResolvedValueOnce({
        body: htmlWithJS,
        url: "https://example.com",
      } as any);

      const result = await extractMetadata("https://example.com");

      expect(result).toBeDefined();
      expect(result?.title).toBe("JS Required");

      if (originalApiKey) {
        process.env.BROWSERLESS_API_KEY = originalApiKey;
      }
    });
  });

  describe("parseConcertInfo", () => {
    it("should parse artist and venue from title with @ separator", () => {
      const metadata = {
        title: "Arctic Monkeys @ MEO Arena",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = parseConcertInfo(metadata);

      expect(result.artist).toBe("Arctic Monkeys");
      expect(result.venue).toBe("MEO Arena");
    });

    it("should parse artist and venue from title with - separator", () => {
      const metadata = {
        title: "Radiohead - Altice Arena",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = parseConcertInfo(metadata);

      expect(result.artist).toBe("Radiohead");
      expect(result.venue).toBe("Altice Arena");
    });

    it("should parse Portuguese pattern 'em'", () => {
      const metadata = {
        title: "Coldplay em Lisboa",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = parseConcertInfo(metadata);

      expect(result.artist).toBe("Coldplay");
      expect(result.venue).toBe("Lisboa");
    });

    it("should extract venue from HTML when not in title", () => {
      const metadata = {
        title: "RIVAL CONSOLES | LISBOA",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const html = '<p class="venue" itemprop="name">Lav - Lisboa Ao Vivo</p>';

      const result = parseConcertInfo(metadata, html);

      expect(result.artist).toBe("RIVAL CONSOLES | LISBOA");
      expect(result.venue).toBe("Lav - Lisboa Ao Vivo");
    });

    it("should use title as artist when no pattern matches", () => {
      const metadata = {
        title: "Amazing Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = parseConcertInfo(metadata);

      expect(result.artist).toBe("Amazing Concert");
      expect(result.venue).toBeUndefined();
    });

    it("should include date when available", () => {
      const metadata = {
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: "2026-05-15",
      };

      const result = parseConcertInfo(metadata);

      expect(result.date).toBe("2026-05-15");
    });

    it("should parse 'at' pattern in title", () => {
      const metadata = {
        title: "The Beatles at Wembley Stadium",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = parseConcertInfo(metadata);

      expect(result.artist).toBe("The Beatles");
      expect(result.venue).toBe("Wembley Stadium");
    });

    it("should parse 'no' pattern in Portuguese", () => {
      const metadata = {
        title: "Metallica no Estádio da Luz",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = parseConcertInfo(metadata);

      expect(result.artist).toBe("Metallica");
      expect(result.venue).toBe("Estádio da Luz");
    });

    it("should extract venue from schema.org HTML markup", () => {
      const metadata = {
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const html = '<div class="venue-info" itemprop="name">Test Venue</div>';

      const result = parseConcertInfo(metadata, html);

      expect(result.venue).toBe("Test Venue");
    });

    it("should extract venue from location itemprop", () => {
      const metadata = {
        title: "Artist",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const html = '<span itemprop="location">Location Venue</span>';

      const result = parseConcertInfo(metadata, html);

      expect(result.venue).toBe("Location Venue");
    });
  });

  describe("formatConcertPreview", () => {
    it("should format preview with all fields", () => {
      const metadata = {
        title: "Arctic Monkeys @ MEO Arena",
        description: "Amazing concert",
        image: "https://example.com/image.jpg",
        url: "https://example.com/concert",
        date: "2026-06-15T20:00:00.000Z",
      };

      const result = formatConcertPreview(metadata);

      expect(result).toContain("🎵");
      expect(result).toContain("Arctic Monkeys");
      expect(result).toContain("MEO Arena");
      expect(result).toContain("2026-06-15");
      expect(result).toContain("⏰"); // Should contain time emoji
      expect(result).toContain(metadata.url);
    });

    it("should format preview without time when date has no time", () => {
      const metadata = {
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: "2026-06-15",
      };

      const result = formatConcertPreview(metadata);

      expect(result).toContain("2026-06-15");
      expect(result).toContain("📅"); // Should contain date emoji
    });

    it("should truncate long descriptions", () => {
      const longDesc = "a".repeat(250);
      const metadata = {
        title: "Concert",
        description: longDesc,
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = formatConcertPreview(metadata);

      expect(result).toContain("...");
      expect(result.length).toBeLessThan(longDesc.length + 200);
    });

    it("should format with date containing time", () => {
      const metadata = {
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: "2026-06-15T19:30:00.000Z",
      };

      const result = formatConcertPreview(metadata);

      expect(result).toContain("2026-06-15");
      expect(result).toContain("⏰");
    });

    it("should handle metadata with only description", () => {
      const metadata = {
        title: null,
        description: "Some description",
        image: null,
        url: "https://example.com",
        date: null,
      };

      const result = formatConcertPreview(metadata);

      expect(result).toContain("Some description");
      expect(result).toContain("🔗");
    });

    it("should format preview with HTML in metadata", () => {
      const metadata = {
        title: "Artist @ Venue",
        description: "Description",
        image: null,
        url: "https://example.com",
        date: null,
        html: "<html><body>Content</body></html>",
      };

      const result = formatConcertPreview(metadata);

      expect(result).toContain("Artist");
      expect(result).toContain("Venue");
      expect(result).toContain("Description");
    });
  });
});
