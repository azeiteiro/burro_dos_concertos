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
  canEditConcert: jest.requireActual("@/utils/helpers").canEditConcert,
}));

jest.mock("@/utils/logger", () => ({
  logAction: jest.fn(),
}));

describe("editConcertConversation", () => {
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
    userId: 123,
  });

  it("shows message when user has no concerts", async () => {
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([]);

    await editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "User" });

    expect(ctx.reply).toHaveBeenCalledWith("🎵 No concerts you are allowed to edit.");
  });

  it("edits venue correctly as Admin", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "venue" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce("New Venue");

    await editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "Admin" });

    expect(prisma.concert.update).toHaveBeenCalledWith({
      where: { id: concert.id },
      data: { venue: "New Venue" },
    });
    expect(ctx.reply).toHaveBeenCalledWith("✅ Venue updated successfully!");
    expect(logAction).toHaveBeenCalledWith(
      123,
      expect.stringContaining("Edited concert: Muse at Lisbon")
    );
  });

  it("edits date correctly", async () => {
    const concert = mockConcert();
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });
    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "date" } },
    });
    const newDate = new Date("2025-12-25");
    (ask as jest.Mock).mockResolvedValueOnce(newDate);

    await editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "User" });

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

    await editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "User" });

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

    await editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "User" });

    expect(prisma.concert.update).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("⏭️ Skipped editing this field.");
  });

  it("prevents User from editing someone else's concert", async () => {
    const concert = { ...mockConcert(), userId: 999 }; // different owner
    (prisma.concert.findMany as jest.Mock).mockResolvedValue([concert]);

    conversation.wait.mockResolvedValueOnce({ message: { text: "1" } });

    conversation.waitForCallbackQuery.mockResolvedValueOnce({
      update: { callback_query: { data: "venue" } },
    });
    (ask as jest.Mock).mockResolvedValueOnce("New Venue");

    await editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "User" });

    expect(prisma.concert.update).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("🎵 No concerts you are allowed to edit.");
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

    await expect(
      editConcertConversation(conversation, ctx, { dbUserId: 123, userRole: "Admin" })
    ).rejects.toThrow("DB fail");
  });
});
