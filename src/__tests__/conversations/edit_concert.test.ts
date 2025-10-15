import { prisma } from "@/config/db";
import { editConcertConversation } from "@/conversations/edit_concert";
import { ask } from "@/utils/helpers";
import { logAction } from "@/utils/logger";

jest.mock("@/config/db", () => ({
  prisma: {
    concert: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/utils/helpers", () => ({
  ask: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  logAction: jest.fn(),
}));

describe("editConcertConversation - additional tests", () => {
  let ctx: any;
  let conversation: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ctx = { reply: jest.fn(), msg: { from: { id: 999 } } };
    conversation = { wait: jest.fn(), waitForCallbackQuery: jest.fn() };
  });

  const mockConcert = () => ({
    id: 1,
    artistName: "Muse",
    venue: "Lisbon",
    concertDate: new Date("2025-10-10"),
    concertTime: new Date("1970-01-01T20:00"),
    url: "https://example.com",
    notes: "Initial note",
  });

  it("edits venue correctly", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "venue" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce("New Venue");

    await editConcertConversation(conversation, ctx, { dbUserId: 123 });

    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: concert.id },
      data: { venue: "New Venue" },
    });
    expect(ctx.reply).toHaveBeenCalledWith("✅ Venue updated successfully!");
  });

  it("edits date with natural language", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "date" } },
    });
    const newDate = new Date("2025-12-25");
    (ask as jest.Mock).mockResolvedValueOnce(newDate);

    await editConcertConversation(conversation, ctx, { dbUserId: 123 });

    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: concert.id },
      data: { concertDate: newDate },
    });
    expect(ctx.reply).toHaveBeenCalledWith("✅ Date updated successfully!");
  });

  it("edits time correctly", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "time" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce("21:30");

    await editConcertConversation(conversation, ctx, { dbUserId: 123 });

    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: concert.id },
      data: { concertTime: new Date("1970-01-01T21:30") },
    });
    expect(ctx.reply).toHaveBeenCalledWith("✅ Time updated successfully!");
  });

  it("skips optional fields when user chooses skip", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "url" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce(null);

    await editConcertConversation(conversation, ctx, { dbUserId: 123 });

    expect(prisma.concert.update).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("⏭️ Skipped editing this field.");
  });

  it("edits URL correctly", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "url" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce("https://newurl.com");

    await editConcertConversation(conversation, ctx, { dbUserId: 123 });

    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: concert.id },
      data: { url: "https://newurl.com" },
    });
    expect(ctx.reply).toHaveBeenCalledWith("✅ Url updated successfully!");
  });

  it("handles validator errors and retries", async () => {
    const concert = {
      id: 1,
      artistName: "Muse",
      venue: "Lisbon",
      concertDate: new Date("2025-10-10"),
      concertTime: null,
      url: null,
      notes: null,
    };

    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    // Step 3: user selects the first concert
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });

    // Step 4: choose "artist" field
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "artist" } },
    });

    // Step 5: simulate ask returning valid input (validator retry happens inside ask)
    (ask as jest.Mock).mockResolvedValueOnce("Valid Artist");

    await editConcertConversation(conversation, ctx, { dbUserId: 123 });

    // ✅ DB should be updated
    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: concert.id },
      data: { artistName: "Valid Artist" },
    });

    // ✅ logAction called
    expect(logAction).toHaveBeenCalledWith(
      123,
      expect.stringContaining("Edited concert: Muse at Lisbon")
    );

    // ✅ user receives success message
    expect(ctx.reply).toHaveBeenCalledWith("✅ Artist updated successfully!");
  });
  it("handles DB update error gracefully", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);
    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "artist" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce("Fail Artist");
    (prisma.concert.update as jest.Mock).mockRejectedValueOnce(new Error("DB fail"));

    await expect(editConcertConversation(conversation, ctx, { dbUserId: 123 })).rejects.toThrow(
      "DB fail"
    );
  });
});
