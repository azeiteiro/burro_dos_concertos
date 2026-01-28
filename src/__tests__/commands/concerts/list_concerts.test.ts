// __tests__/list_concerts.test.ts
import { createMockUser, createMockConcert } from "@/__tests__/mocks/prismaMocks";
import { listConcertsCommand } from "@/commands/concerts/list_concerts";
import { prisma } from "@/config/db";

jest.mock("@/config/db", () => {
  return {
    prisma: {
      concert: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    },
  };
});

describe("listConcertsCommand", () => {
  let ctx: any;

  beforeEach(() => {
    ctx = {
      reply: jest.fn(),
      from: { id: 123 },
      msg: {
        from: {
          id: 123, // mock Telegram user ID
        },
      },
    };
  });

  it("replies with a message when there are no upcoming concerts", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);

    await listConcertsCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith(
      "🎶 No upcoming concerts found. Add one with /add_concert!"
    );
  });

  it("lists upcoming concerts", async () => {
    const user = createMockUser();
    const concert = createMockConcert({ userId: user.id });

    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    await listConcertsCommand(ctx);

    expect(ctx.reply.mock.calls[0][0]).toContain("Arctic Monkeys");
    expect(ctx.reply.mock.calls[0][0]).toContain("Altice Arena, Lisbon");
  });

  it("includes user name with last name initial", async () => {
    const user = createMockUser({ firstName: "John", lastName: "Doe" });
    const concert = createMockConcert({ userId: user.id, user });

    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    await listConcertsCommand(ctx);

    // MarkdownV2 escapes periods with backslash
    expect(ctx.reply.mock.calls[0][0]).toContain("John D\\.");
  });

  it("includes optional fields when present", async () => {
    const user = createMockUser();
    const concert = createMockConcert({
      userId: user.id,
      url: "https://example.com",
      notes: "VIP section",
      concertTime: new Date("2025-10-15T20:00:00Z"),
    });

    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    await listConcertsCommand(ctx);

    const reply = ctx.reply.mock.calls[0][0];
    // MarkdownV2 escapes dots and other special characters
    expect(reply).toContain("example");
    expect(reply).toContain("VIP section");
  });

  it("handles error gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    (prisma.concert.findMany as jest.Mock).mockRejectedValue(new Error("DB error"));

    await listConcertsCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith("❌ Something went wrong while listing concerts.");
    consoleErrorSpy.mockRestore();
  });
});
