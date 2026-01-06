import { Concert, User } from "@prisma/client";

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  firstName: "Daniel",
  lastName: "A.",
  username: "danielazeiteiro",
  telegramId: 0n,
  languageCode: null,
  createdAt: new Date(),
  role: "User",
  ...overrides,
});

export const createMockConcert = (overrides?: Partial<Concert>): Concert => ({
  id: 1,
  artistName: "Arctic Monkeys",
  venue: "Altice Arena, Lisbon",
  concertDate: new Date("2025-12-01T00:00:00Z"),
  concertTime: null,
  url: "https://example.com",
  notes: "Tour 2025 kickoff show!",
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 1,
  notified: false,
  ...overrides,
});
