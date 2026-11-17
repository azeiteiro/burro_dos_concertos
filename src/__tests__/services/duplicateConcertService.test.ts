import {
  findPossibleDuplicate,
  normalizeVenue,
  venuesMatch,
} from "#/services/duplicateConcertService";
import { prisma } from "#/config/db";

jest.mock("#/config/db", () => ({
  prisma: {
    concert: {
      findMany: jest.fn(),
    },
  },
}));

const findMany = prisma.concert.findMany as jest.Mock;

describe("normalizeVenue", () => {
  it("lowercases, strips accents and punctuation, and collapses whitespace", () => {
    expect(normalizeVenue("  Casa   Capitão, Lisboa! ")).toBe("casa capitao lisboa");
  });
});

describe("venuesMatch", () => {
  it("matches the same venue regardless of case and accents", () => {
    expect(venuesMatch("Casa Capitão", "casa capitao")).toBe(true);
  });

  it("matches when one name contains the other", () => {
    expect(venuesMatch("Casa Capitão", "Casa Capitão, Lisboa")).toBe(true);
    expect(venuesMatch("Coliseu do Porto", "Coliseu")).toBe(true);
  });

  it("does not match different venues", () => {
    expect(venuesMatch("Casa Capitão", "Teatro Tivoli")).toBe(false);
  });

  it("does not use containment for very short names", () => {
    expect(venuesMatch("Bar", "Barraca Bar Lisboa")).toBe(false);
    expect(venuesMatch("ab", "Cabaret")).toBe(false);
  });

  it("does not match empty venues", () => {
    expect(venuesMatch("", "Casa Capitão")).toBe(false);
    expect(venuesMatch("!!!", "!!!")).toBe(false);
  });
});

describe("findPossibleDuplicate", () => {
  const concertDate = new Date("2026-11-20T00:00:00Z");

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: 56,
    artistName: "Old Title",
    venue: "Casa Capitão",
    concertDate,
    url: null,
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("returns null when there are no candidates", async () => {
    await expect(
      findPossibleDuplicate({ url: null, venue: "Casa Capitão", concertDate })
    ).resolves.toBeNull();
  });

  it("matches the same date and venue even when the artist differs", async () => {
    findMany.mockResolvedValue([row()]);

    await expect(
      findPossibleDuplicate({ url: null, venue: "casa capitao", concertDate })
    ).resolves.toEqual({
      id: 56,
      artistName: "Old Title",
      venue: "Casa Capitão",
      concertDate: "2026-11-20",
      matchedBy: "venue",
    });
  });

  it("does not match the same venue on a different date", async () => {
    findMany.mockResolvedValue([row({ concertDate: new Date("2026-11-21T00:00:00Z") })]);

    await expect(
      findPossibleDuplicate({ url: null, venue: "Casa Capitão", concertDate })
    ).resolves.toBeNull();
  });

  it("does not match a different venue on the same date", async () => {
    findMany.mockResolvedValue([row({ venue: "Teatro Tivoli" })]);

    await expect(
      findPossibleDuplicate({ url: null, venue: "Casa Capitão", concertDate })
    ).resolves.toBeNull();
  });

  it("matches the same url even when venue and date differ", async () => {
    findMany.mockResolvedValue([
      row({
        venue: "Somewhere else",
        concertDate: new Date("2026-12-01T00:00:00Z"),
        url: "https://example.com/event/1/",
      }),
    ]);

    const result = await findPossibleDuplicate({
      url: "https://EXAMPLE.com/event/1",
      venue: "Casa Capitão",
      concertDate,
    });

    expect(result).toEqual(expect.objectContaining({ id: 56, matchedBy: "url" }));
  });

  it("only looks at upcoming concerts and queries by url or date", async () => {
    await findPossibleDuplicate({ url: "https://example.com/e", venue: "Casa", concertDate });

    const { where } = findMany.mock.calls[0][0];
    expect(where.concertDate.gte).toBeInstanceOf(Date);
    expect(where.concertDate.gte.getUTCHours()).toBe(0);
    expect(where.OR).toEqual([{ url: { not: null } }, { concertDate }]);
  });

  it("skips the url lookup when there is no url", async () => {
    await findPossibleDuplicate({ url: null, venue: "Casa", concertDate });

    expect(findMany.mock.calls[0][0].where.OR).toEqual([{ concertDate }]);
  });
});
