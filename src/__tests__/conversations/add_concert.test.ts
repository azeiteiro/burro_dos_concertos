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
      waitForCallbackQuery: jest.fn(),
      wait: jest.fn(),
    };

    mockCtx = {
      reply: jest.fn(),
      answerCallbackQuery: jest.fn(),
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

  it("handles prefilled data with edit action", async () => {
    const prefillData = {
      artist: "Prefilled Artist",
      venue: "Prefilled Venue",
      date: "2025-12-25",
      url: "https://prefilled.com",
    };

    const confirmCtx = {
      answerCallbackQuery: jest.fn(),
      callbackQuery: { data: "edit_prefill" },
    };

    mockConversation.waitForCallbackQuery.mockResolvedValue(confirmCtx);

    // Mock the edit flow responses
    const mockResponses = [
      { message: { text: "keep" } }, // artist
      { message: { text: "keep" } }, // venue
      { message: { text: "keep" } }, // date
      { message: { text: "keep" } }, // time
      { message: { text: "keep" } }, // url
      { message: { text: "keep" } }, // notes
    ];

    let callCount = 0;
    mockConversation.wait.mockImplementation(() => {
      return Promise.resolve(mockResponses[callCount++]);
    });

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    const replyCalls = mockCtx.reply.mock.calls.map((call: any[]) => call[0]);
    const hasPreviewMessage = replyCalls.some(
      (call: string) => typeof call === "string" && call.includes("Concert Information Detected")
    );
    expect(hasPreviewMessage).toBe(true);
    expect(prisma.concert.create).toHaveBeenCalled();
  });

  it("handles prefilled data with confirm action", async () => {
    const prefillData = {
      artist: "Prefilled Artist",
      venue: "Prefilled Venue",
      date: "2025-12-25T00:00:00Z",
      url: "https://prefilled.com",
    };

    const confirmCtx = {
      answerCallbackQuery: jest.fn(),
      callbackQuery: { data: "confirm_prefill" },
    };

    mockConversation.waitForCallbackQuery.mockResolvedValue(confirmCtx);
    (ask as jest.Mock).mockResolvedValueOnce(null); // notes (only missing field)
    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    const replyCalls = mockCtx.reply.mock.calls.map((call: any[]) => call[0]);
    const hasPreviewMessage = replyCalls.some(
      (call: string) => typeof call === "string" && call.includes("Concert Information Detected")
    );
    expect(hasPreviewMessage).toBe(true);

    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Prefilled Artist",
          venue: "Prefilled Venue",
        }),
      })
    );
  });

  it("handles prefilled data missing required fields", async () => {
    const prefillData = {
      artist: "Partial Artist",
    };

    const confirmCtx = {
      answerCallbackQuery: jest.fn(),
      callbackQuery: { data: "confirm_prefill" },
    };

    mockConversation.waitForCallbackQuery.mockResolvedValue(confirmCtx);

    (ask as jest.Mock)
      .mockResolvedValueOnce("Venue Name") // missing venue
      .mockResolvedValueOnce(new Date("2025-10-15")) // missing date
      .mockResolvedValueOnce(null) // time
      .mockResolvedValueOnce(null); // notes

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Partial Artist",
          venue: "Venue Name",
        }),
      })
    );
  });

  it("handles cancellation with prefilled data", async () => {
    const prefillData = {
      artist: "Artist",
      venue: "Venue",
    };

    const confirmCtx = {
      answerCallbackQuery: jest.fn(),
      callbackQuery: { data: "cancel_prefill" },
    };

    mockConversation.waitForCallbackQuery.mockResolvedValue(confirmCtx);

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    expect(prisma.concert.create).not.toHaveBeenCalled();
    expect(mockCtx.reply).toHaveBeenCalledWith("❌ Cancelled.");
  });

  it("handles database error gracefully", async () => {
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const dbError = new Error("Database connection failed");
    (prisma.concert.create as jest.Mock).mockRejectedValue(dbError);

    await expect(
      addConcertConversation(mockConversation, mockCtx, { dbUserId: 42 })
    ).rejects.toThrow("Database connection failed");
  });

  it("handles empty prefillData object", async () => {
    const prefillData = {};

    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name")
      .mockResolvedValueOnce("Venue Name")
      .mockResolvedValueOnce(new Date("2025-10-15"))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    expect(prisma.concert.create).toHaveBeenCalled();
  });

  it("handles prefilled data with date containing time", async () => {
    const prefillData = {
      artist: "Artist",
      venue: "Venue",
      date: "2025-12-25T20:30:00Z",
    };

    const confirmCtx = {
      answerCallbackQuery: jest.fn(),
      callbackQuery: { data: "confirm_prefill" },
    };

    mockConversation.waitForCallbackQuery.mockResolvedValue(confirmCtx);
    (ask as jest.Mock).mockResolvedValueOnce(null); // notes
    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    // Should show time in the confirmation message
    const replyCalls = mockCtx.reply.mock.calls;
    const hasTimeMessage = replyCalls.some(
      (call: any) => call[0] && typeof call[0] === "string" && call[0].includes("⏰")
    );
    expect(hasTimeMessage).toBe(true);
  });

  it("handles confirm with missing artist field", async () => {
    const prefillData = {
      venue: "Venue",
      date: "2025-12-25T00:00:00Z",
    };

    const confirmCtx = {
      answerCallbackQuery: jest.fn(),
      callbackQuery: { data: "confirm_prefill" },
    };

    mockConversation.waitForCallbackQuery.mockResolvedValue(confirmCtx);
    (ask as jest.Mock)
      .mockResolvedValueOnce("Artist Name") // missing artist - first ask
      .mockResolvedValueOnce("FINISH"); // skip remaining optional fields

    (prisma.concert.create as jest.Mock).mockResolvedValue({ id: 1 });

    await addConcertConversation(mockConversation, mockCtx, { dbUserId: 42, prefillData });

    expect(prisma.concert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          artistName: "Artist Name",
          venue: "Venue",
        }),
      })
    );
  });
});
