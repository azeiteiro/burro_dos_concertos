import { prisma } from "#/config/db";

// Containment matching ("Casa Capitão" vs "Casa Capitão, Lisboa") is only trusted
// when the shorter name is long enough not to match unrelated venues by accident.
const MIN_CONTAINMENT_LENGTH = 4;

export interface PossibleDuplicate {
  id: number;
  artistName: string;
  venue: string;
  concertDate: string; // yyyy-MM-dd
  matchedBy: "url" | "venue";
}

export const normalizeVenue = (venue: string) =>
  venue
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export const venuesMatch = (a: string, b: string) => {
  const na = normalizeVenue(a);
  const nb = normalizeVenue(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  return shorter.length >= MIN_CONTAINMENT_LENGTH && longer.includes(shorter);
};

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, "").toLowerCase();

/**
 * Looks for an upcoming concert that is probably the one being added. The artist name is
 * deliberately ignored (it's the field people correct by adding the concert a second time).
 * A match means: same URL, or same date at the same venue (from any user).
 *
 * @param concertDate the date as stored in the DB (UTC midnight)
 */
export const findPossibleDuplicate = async ({
  url,
  venue,
  concertDate,
}: {
  url: string | null;
  venue: string;
  concertDate: Date;
}): Promise<PossibleDuplicate | null> => {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const candidates = await prisma.concert.findMany({
    where: {
      concertDate: { gte: startOfToday },
      OR: [...(url ? [{ url: { not: null } }] : []), { concertDate }],
    },
    select: { id: true, artistName: true, venue: true, concertDate: true, url: true },
    orderBy: { createdAt: "asc" },
  });

  const toResult = (
    c: (typeof candidates)[number],
    matchedBy: PossibleDuplicate["matchedBy"]
  ): PossibleDuplicate => ({
    id: c.id,
    artistName: c.artistName,
    venue: c.venue,
    concertDate: c.concertDate.toISOString().slice(0, 10),
    matchedBy,
  });

  if (url) {
    const wanted = normalizeUrl(url);
    const byUrl = candidates.find((c) => c.url && normalizeUrl(c.url) === wanted);
    if (byUrl) return toResult(byUrl, "url");
  }

  const sameDay = concertDate.getTime();
  const byVenue = candidates.find(
    (c) => c.concertDate.getTime() === sameDay && venuesMatch(c.venue, venue)
  );
  return byVenue ? toResult(byVenue, "venue") : null;
};
