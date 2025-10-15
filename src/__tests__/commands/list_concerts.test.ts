// __tests__/list_concerts.test.ts
import { createMockUser, createMockConcert } from "@/__tests__/mocks/prismaMocks";
import { listConcertsCommand } from "@/commands/list_concerts";
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
});
