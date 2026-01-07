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

  it("handles cancellation at artist stage", async () => {
    (ask as jest.Mock).mockResolvedValueOnce("CANCEL");

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(1);
    expect(prisma.concert.create).not.toHaveBeenCalled();
  });

  it("handles cancellation at venue stage", async () => {
    (ask as jest.Mock).mockResolvedValueOnce("Artist Name").mockResolvedValueOnce("CANCEL");

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(2);
    expect(prisma.concert.create).not.toHaveBeenCalled();
  });

  it("handles cancellation at date stage", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce("CANCEL");

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(3);
    expect(prisma.concert.create).not.toHaveBeenCalled();
  });

  it("handles cancellation at time stage", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce("CANCEL");

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(4);
    expect(prisma.concert.create).not.toHaveBeenCalled();
  });

  it("handles finishing at time stage (after mandatory fields)", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce("FINISH");

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(4);
    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Artist Name",
          venue: "Venue Name",
          concertTime: null,
          url: null,
          notes: null,
        }),
      })
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("✅ Concert added"));
  });

  it("handles finishing at url stage", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce("20:30")
      .mockResolvedValueOnce("FINISH");

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(5);
    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Artist Name",
          venue: "Venue Name",
          concertTime: expect.any(Date),
          url: null,
          notes: null,
        }),
      })
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("✅ Concert added"));
  });

  it("handles finishing at notes stage", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce("20:30")
      .mockResolvedValueOnce("https://example.com")
      .mockResolvedValueOnce("FINISH");

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 });

    expect(ask).toHaveBeenCalledTimes(6);
    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Artist Name",
          venue: "Venue Name",
          url: "https://example.com",
          notes: null,
        }),
      })
    );
    expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("✅ Concert added"));
  });
});
