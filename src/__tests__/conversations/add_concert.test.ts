import { addConcertConversation } from "../../conversations/add_concert";
import { prisma } from "@/config/db";
import { logAction } from "@/utils/logger";
import { ask } from "@/utils/helpers";

jest.mock("@/utils/helpers");
jest.mock("@/utils/logger");

jest.mock("@/config/db", () => ({
  prisma: {
    concert: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/notifications/helpers", () => ({
  ...jest.requireActual("@/notifications/helpers"),
  notifyNewConcert: jest.fn().mockResolvedValue(undefined),
}));

describe("addConcertConversation", () => {
  let mockConversation: any;
  let mockCtx: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConversation = {
      external: jest.fn((fn: any) => fn()),
    };

    mockCtx = {
      reply: jest.fn(),
    };
  });

  it("saves a concert with all fields", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name") // artist
      .mockResolvedValueOnce("Venue Name") // venue
      .mockResolvedValueOnce(new Date("2025-10-15")) // date
      .mockResolvedValueOnce("20:30") // time
      .mockResolvedValueOnce("https://example.com") // url
      .mockResolvedValueOnce("Some notes"); // notes

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(6);
    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Artist Name",
          venue: "Venue Name",
          url: "https://example.com",
          notes: "Some notes",
        }),
      })
    );

    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("✅ Concert added"));
    expect(logAction).toHaveBeenCalledWith(42, expect.stringContaining("Added concert"));
  });

  it("handles optional fields being skipped", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce(null) // time skipped
      .mockResolvedValueOnce(null) // url skipped
      .mockResolvedValueOnce("Some notes");

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          concertTime: null,
          url: null,
        }),
      })
    );
  });
});
