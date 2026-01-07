import { prisma } from "@/config/db";
import { Bot } from "grammy";
import {
  formatConcertList,
  sendTodayConcerts,
  sendWeekConcerts,
  sendMonthConcerts,
  notifyNewConcert,
} from "@/notifications/helpers";
import { Context } from "grammy";
import { Concert } from "@prisma/client";

process.env.GROUP_ID = "123456789";

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
    expect(msg).toContain("Muse – Lisbon (2025-10-10 at 20:00)");
  });

  it("formatConcertList escapes special Markdown characters", () => {
    const concerts = [
      {
        artistName: "AC/DC",
        venue: "Rock_Arena (Main)",
        concertDate: new Date("2025-10-10"),
        concertTime: null,
      },
    ] as any;

    const msg = formatConcertList("Special * Characters_", concerts);

    // Should escape special characters
    expect(msg).toContain("AC/DC");
    expect(msg).toContain("Rock\\_Arena \\(Main\\)");
    expect(msg).toContain("Special \\* Characters\\_");
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

  it("handles errors gracefully when sending daily notification fails", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artistName: "Muse", venue: "Lisbon", concertDate: new Date(), concertTime: null },
    ]);
    (bot.api.sendMessage as jest.Mock).mockRejectedValue(new Error("Telegram API error"));

    // Should not throw - error is caught and logged
    await expect(sendTodayConcerts(bot)).resolves.not.toThrow();
  });

  it("skips sending when GROUP_ID is not configured", async () => {
    const originalGroupId = process.env.GROUP_ID;
    delete process.env.GROUP_ID;

    (prisma.concert.findMany as jest.Mock).mockResolvedValue([
      { id: 1, artistName: "Muse", venue: "Lisbon", concertDate: new Date(), concertTime: null },
    ]);

    await sendWeekConcerts(bot);

    expect(bot.api.sendMessage).not.toHaveBeenCalled();

    // Restore GROUP_ID
    process.env.GROUP_ID = originalGroupId;
  });
});

describe("notifyNewConcert", () => {
  let mockCtx: Partial<Context>;
  let mockSendMessage: jest.Mock;

  beforeEach(() => {
    mockSendMessage = jest.fn().mockResolvedValue({});
    mockCtx = {
      api: {
        sendMessage: mockSendMessage,
      },
    } as any;

    process.env.GROUP_ID = "-1001234567890";
    jest.clearAllMocks();
  });

  it("sends notification with all concert details", async () => {
    const concert: Partial<Concert> = {
      artistName: "Arctic Monkeys",
      venue: "MEO Arena",
      concertDate: new Date("2025-07-10T00:00:00Z"),
      concertTime: new Date("1970-01-01T21:30:00Z"),
      url: "https://tickets.com",
      notes: "VIP section available",
    };

    await notifyNewConcert(mockCtx as Context, concert as Concert);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "-1001234567890",
      expect.stringContaining("🎶 New concert added!"),
      { parse_mode: "Markdown" }
    );

    const sentMessage = mockSendMessage.mock.calls[0][1];
    expect(sentMessage).toContain("🎤 **Arctic Monkeys**");
    expect(sentMessage).toContain("*MEO Arena*");
    expect(sentMessage).toContain("📅 2025-07-10");
    // expect(sentMessage).toContain("at 22:30");
    expect(sentMessage).toContain("🔗 [More info](https://tickets.com)");
    expect(sentMessage).toContain("📝 VIP section available");
  });

  it("sends notification without optional fields (time, url, notes)", async () => {
    const concert: Partial<Concert> = {
      artistName: "Radiohead",
      venue: "Coliseu Porto",
      concertDate: new Date("2025-08-15T00:00:00Z"),
      concertTime: null,
      url: null,
      notes: null,
    };

    await notifyNewConcert(mockCtx as Context, concert as Concert);

    expect(mockSendMessage).toHaveBeenCalledWith(
      "-1001234567890",
      expect.stringContaining("🎶 New concert added!"),
      { parse_mode: "Markdown" }
    );

    const sentMessage = mockSendMessage.mock.calls[0][1];
    expect(sentMessage).toContain("🎤 **Radiohead**");
    expect(sentMessage).toContain("*Coliseu Porto*");
    expect(sentMessage).toContain("📅 2025-08-15");
    expect(sentMessage).not.toContain("🔗");
    expect(sentMessage).not.toContain("📝");
  });

  it("handles concert with URL but no notes", async () => {
    const concert: Partial<Concert> = {
      artistName: "Muse",
      venue: "Super Bock Arena",
      concertDate: new Date("2025-09-20T00:00:00Z"),
      concertTime: null,
      url: "https://muse.mu/tour",
      notes: null,
    };

    await notifyNewConcert(mockCtx as Context, concert as Concert);

    const sentMessage = mockSendMessage.mock.calls[0][1];
    expect(sentMessage).toContain("🔗 [More info](https://muse.mu/tour)");
    expect(sentMessage).not.toContain("📝");
  });

  it("handles concert with notes but no URL", async () => {
    const concert: Partial<Concert> = {
      artistName: "The Strokes",
      venue: "Altice Arena",
      concertDate: new Date("2025-10-05T00:00:00Z"),
      concertTime: new Date("1970-01-01T20:00:00Z"),
      url: null,
      notes: "Doors open at 19:00",
    };

    await notifyNewConcert(mockCtx as Context, concert as Concert);

    const sentMessage = mockSendMessage.mock.calls[0][1];
    expect(sentMessage).not.toContain("🔗");
    expect(sentMessage).toContain("📝 Doors open at 19:00");
  });

  it("formats message correctly with markdown", async () => {
    const concert: Partial<Concert> = {
      artistName: "Coldplay",
      venue: "Estádio da Luz",
      concertDate: new Date("2025-11-01T00:00:00Z"),
      concertTime: null,
      url: null,
      notes: null,
    };

    await notifyNewConcert(mockCtx as Context, concert as Concert);

    expect(mockSendMessage).toHaveBeenCalledWith(expect.any(String), expect.any(String), {
      parse_mode: "Markdown",
    });
  });

  it("uses correct GROUP_ID from environment", async () => {
    process.env.GROUP_ID = "-9998887776666";

    const concert: Partial<Concert> = {
      artistName: "Pink Floyd",
      venue: "Test Venue",
      concertDate: new Date("2025-12-25T00:00:00Z"),
      concertTime: null,
      url: null,
      notes: null,
    };

    await notifyNewConcert(mockCtx as Context, concert as Concert);

    expect(mockSendMessage).toHaveBeenCalledWith("-9998887776666", expect.any(String), {
      parse_mode: "Markdown",
    });
  });

  it("handles errors gracefully when sending notification fails", async () => {
    mockSendMessage.mockRejectedValue(new Error("Network error"));

    const concert: Partial<Concert> = {
      id: 99,
      artistName: "Test Artist",
      venue: "Test Venue",
      concertDate: new Date("2025-12-25T00:00:00Z"),
      concertTime: null,
      url: null,
      notes: null,
    };

    // Should not throw - error is caught and logged
    await expect(notifyNewConcert(mockCtx as Context, concert as Concert)).resolves.not.toThrow();
  });
});
