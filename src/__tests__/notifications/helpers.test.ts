import { prisma } from "@/config/db";
import { Bot } from "grammy";
import {
  formatConcertList,
  sendTodayConcerts,
  sendWeekConcerts,
  sendMonthConcerts,
} from "@/notifications/helpers";

jest.mock("@/config/db", () => ({
  prisma: { concert: { findMany: jest.fn() } },
}));

describe("notifications helpers", () => {
  let bot: Bot;

  beforeEach(() => {
    jest.clearAllMocks();
    bot = { api: { sendMessage: jest.fn() } } as unknown as Bot;
  });

  it("formatConcertList formats a list correctly", () => {
    const concerts = [
      {
        artistName: "Muse",
        venue: "Lisbon",
        concertDate: new Date("2025-10-10"),
        concertTime: new Date("1970-01-01T20:00"),
      },
    ] as any;

    const msg = formatConcertList("Title", concerts);

    expect(msg).toContain("🎶 *Title*");
    expect(msg).toContain("Muse – Lisbon (2025-10-10 20:00)");
  });

  it("sendTodayConcerts sends message when concerts exist", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artistName: "Muse", venue: "Lisbon", concertDate: new Date(), concertTime: null },
    ]);

    await sendTodayConcerts(bot);

    expect(bot.api.sendMessage).toHaveBeenCalled();
  });

  it("sendTodayConcerts does nothing if no concerts", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);
    await sendTodayConcerts(bot);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });

  it("sendWeekConcerts sends message when concerts exist", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artistName: "Muse", venue: "Lisbon", concertDate: new Date(), concertTime: null },
    ]);
    await sendWeekConcerts(bot);
    expect(bot.api.sendMessage).toHaveBeenCalled();
  });

  it("sendWeekConcerts does nothing if no concerts", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);
    await sendWeekConcerts(bot);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });

  it("sendMonthConcerts sends message when concerts exist", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artistName: "Muse", venue: "Lisbon", concertDate: new Date(), concertTime: null },
    ]);
    await sendMonthConcerts(bot);
    expect(bot.api.sendMessage).toHaveBeenCalled();
  });

  it("sendMonthConcerts does nothing if no concerts", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);
    await sendMonthConcerts(bot);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });
});
