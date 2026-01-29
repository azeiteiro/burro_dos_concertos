// Mock dependencies before importing
jest.mock("got", () => jest.fn());
jest.mock("@/utils/user");
jest.mock("@/services/linkAnalyzer");

import {
  handleUrlMessage,
  handleQuickAddCallback,
  handleManualAddCallback,
} from "@/handlers/urlHandler";
import { BotContext } from "@/types/global";
import * as userUtils from "@/utils/user";
import * as linkAnalyzer from "@/services/linkAnalyzer";

const mockedIsAdmin = userUtils.isAdmin as jest.MockedFunction<typeof userUtils.isAdmin>;
const mockedGetAllAdmins = userUtils.getAllAdmins as jest.MockedFunction<
  typeof userUtils.getAllAdmins
>;
const mockedFindOrCreateUser = userUtils.findOrCreateUser as jest.MockedFunction<
  typeof userUtils.findOrCreateUser
>;
const mockedExtractMetadata = linkAnalyzer.extractMetadata as jest.MockedFunction<
  typeof linkAnalyzer.extractMetadata
>;
const mockedParseConcertInfo = linkAnalyzer.parseConcertInfo as jest.MockedFunction<
  typeof linkAnalyzer.parseConcertInfo
>;
const mockedFormatConcertPreview = linkAnalyzer.formatConcertPreview as jest.MockedFunction<
  typeof linkAnalyzer.formatConcertPreview
>;

describe("urlHandler", () => {
  // Silence logs for clean output
  const originalLog = console.log;
  const originalError = console.error;

  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalLog;
    console.error = originalError;
  });

  let mockCtx: Partial<BotContext>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCtx = {
      message: {
        text: "Check this out: https://example.com/concert",
        message_id: 123,
      } as any,
      chat: {
        type: "group",
        id: 456,
      } as any,
      from: {
        id: 789,
        first_name: "João",
      } as any,
      reply: jest.fn().mockResolvedValue({}),
      api: {
        sendMessage: jest.fn().mockResolvedValue({}),
      } as any,
    };
  });

  describe("handleUrlMessage", () => {
    it("should ignore messages without URLs", async () => {
      mockCtx.message!.text = "Hello, no links here";

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockedExtractMetadata).not.toHaveBeenCalled();
    });

    it("should process URL in group and notify admins", async () => {
      mockedIsAdmin.mockResolvedValue(false);
      mockedGetAllAdmins.mockResolvedValue([
        { id: 1, telegramId: BigInt(111), role: "Admin" } as any,
        { id: 2, telegramId: BigInt(222), role: "Admin" } as any,
      ]);
      mockedExtractMetadata.mockResolvedValue({
        title: "Concert Title",
        description: "Description",
        image: null,
        url: "https://example.com/concert",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({
        artist: "Artist",
        venue: "Venue",
      });
      mockedFormatConcertPreview.mockReturnValue("Formatted Preview");

      await handleUrlMessage(mockCtx as BotContext);

      // Should notify both admins
      expect(mockCtx.api!.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockCtx.api!.sendMessage).toHaveBeenCalledWith(
        111,
        expect.stringContaining("João"),
        expect.any(Object)
      );

      // Should send acknowledgment in group
      expect(mockCtx.reply).toHaveBeenCalledWith(
        "✅ Concert link detected! Admins have been notified.",
        expect.any(Object)
      );
    });

    it("should not send group acknowledgment when admin posts link", async () => {
      mockedIsAdmin.mockResolvedValue(true);
      mockedGetAllAdmins.mockResolvedValue([
        { id: 1, telegramId: BigInt(111), role: "Admin" } as any,
      ]);
      mockedExtractMetadata.mockResolvedValue({
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({});
      mockedFormatConcertPreview.mockReturnValue("Preview");

      await handleUrlMessage(mockCtx as BotContext);

      // Should send feedback message but NOT the acknowledgment
      expect(mockCtx.reply).toHaveBeenCalledWith("⏳ Analyzing concert link...");
      expect(mockCtx.reply).not.toHaveBeenCalledWith(
        "✅ Concert link detected! Admins have been notified.",
        expect.any(Object)
      );
    });

    it("should show preview directly in private chat", async () => {
      mockCtx.chat!.type = "private";
      mockedExtractMetadata.mockResolvedValue({
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({});
      mockedFormatConcertPreview.mockReturnValue("Preview");

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        "Preview",
        expect.objectContaining({
          parse_mode: "HTML",
        })
      );
      expect(mockedGetAllAdmins).not.toHaveBeenCalled();
    });

    it("should handle metadata extraction failure in group", async () => {
      mockedIsAdmin.mockResolvedValue(false);
      mockedGetAllAdmins.mockResolvedValue([
        { id: 1, telegramId: BigInt(111), role: "Admin" } as any,
      ]);
      mockedExtractMetadata.mockResolvedValue(null);

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.api!.sendMessage).toHaveBeenCalledWith(
        111,
        expect.stringContaining("Couldn't analyze"),
        expect.any(Object)
      );
    });

    it("should handle metadata extraction failure in private chat for admin", async () => {
      mockCtx.chat!.type = "private";
      mockedIsAdmin.mockResolvedValue(true);
      mockedExtractMetadata.mockResolvedValue(null);

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Couldn't analyze"),
        expect.any(Object)
      );
    });

    it("should handle metadata extraction failure in private chat for non-admin", async () => {
      mockCtx.chat!.type = "private";
      mockedIsAdmin.mockResolvedValue(false);
      mockedExtractMetadata.mockResolvedValue(null);

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Couldn't analyze"),
        expect.any(Object)
      );
    });

    it("should handle extraction error in group", async () => {
      mockedIsAdmin.mockResolvedValue(false);
      mockedGetAllAdmins.mockResolvedValue([
        { id: 1, telegramId: BigInt(111), role: "Admin" } as any,
      ]);
      mockedExtractMetadata.mockRejectedValue(new Error("Network error"));

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.api!.sendMessage).toHaveBeenCalledWith(
        111,
        expect.stringContaining("Error analyzing link"),
        expect.any(Object)
      );
    });

    it("should handle extraction error in private chat", async () => {
      mockCtx.chat!.type = "private";
      mockedExtractMetadata.mockRejectedValue(new Error("Network error"));

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Error analyzing link"));
    });

    it("should handle admin notification failure gracefully", async () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      mockedIsAdmin.mockResolvedValue(false);
      mockedGetAllAdmins.mockResolvedValue([
        { id: 1, telegramId: BigInt(111), role: "Admin" } as any,
      ]);
      mockedExtractMetadata.mockResolvedValue({
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({});
      mockedFormatConcertPreview.mockReturnValue("Preview");
      mockCtx.api!.sendMessage = jest.fn().mockRejectedValue(new Error("Send failed"));

      await handleUrlMessage(mockCtx as BotContext);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to notify admin"),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should warn when no admins found in group", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      mockedIsAdmin.mockResolvedValue(false);
      mockedGetAllAdmins.mockResolvedValue([]);
      mockedExtractMetadata.mockResolvedValue({
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({});

      await handleUrlMessage(mockCtx as BotContext);

      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining("No admins found"));

      consoleWarnSpy.mockRestore();
    });

    it("should handle multiple URLs in one message", async () => {
      mockCtx.message!.text = "Check these: https://example.com/1 and https://example.com/2";
      mockCtx.chat!.type = "private";

      mockedExtractMetadata.mockResolvedValue({
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({});
      mockedFormatConcertPreview.mockReturnValue("Preview");

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockedExtractMetadata).toHaveBeenCalledTimes(2);
    });

    it("should handle supergroup chat type", async () => {
      mockCtx.chat!.type = "supergroup";
      mockedIsAdmin.mockResolvedValue(false);
      mockedGetAllAdmins.mockResolvedValue([
        { id: 1, telegramId: BigInt(111), role: "Admin" } as any,
      ]);
      mockedExtractMetadata.mockResolvedValue({
        title: "Concert",
        description: null,
        image: null,
        url: "https://example.com",
        date: null,
      });
      mockedParseConcertInfo.mockReturnValue({});
      mockedFormatConcertPreview.mockReturnValue("Preview");

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.api!.sendMessage).toHaveBeenCalledWith(
        111,
        expect.stringContaining("Concert Link Shared"),
        expect.any(Object)
      );
    });
  });

  describe("handleQuickAddCallback", () => {
    beforeEach(() => {
      mockCtx.callbackQuery = {
        data: "quick_add:concert_123_456",
        message: {
          chat: { type: "private" } as any,
        } as any,
      } as any;
      mockCtx.answerCallbackQuery = jest.fn().mockResolvedValue({});
      mockCtx.conversation = {
        enter: jest.fn().mockResolvedValue({}),
      } as any;
    });

    it("should allow anyone to add concert in private chat", async () => {
      mockedIsAdmin.mockResolvedValue(false);
      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);

      // Mock the cache - this would normally be set by handleUrlMessage
      // For testing, we'll just verify it tries to enter conversation
      await handleQuickAddCallback(mockCtx as BotContext);

      // Should answer callback without error
      expect(mockCtx.answerCallbackQuery).toHaveBeenCalled();
    });

    it("should block non-admins in group chat", async () => {
      mockCtx.callbackQuery!.message!.chat.type = "group";
      mockedIsAdmin.mockResolvedValue(false);

      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "❌ Only admins can add concerts in groups.",
        show_alert: true,
      });
      expect(mockCtx.conversation?.enter).not.toHaveBeenCalled();
    });

    it("should allow admins in group chat but require valid cache", async () => {
      mockCtx.callbackQuery!.message!.chat.type = "group";
      mockedIsAdmin.mockResolvedValue(true);

      await handleQuickAddCallback(mockCtx as BotContext);

      // Cache won't exist, so should show expiry message
      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "⏰ This link preview has expired. Please share the link again.",
        show_alert: true,
      });
    });

    it("should ignore non-quick_add callbacks", async () => {
      mockCtx.callbackQuery!.data = "other_callback";

      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockedIsAdmin).not.toHaveBeenCalled();
    });

    it("should handle missing user", async () => {
      mockCtx.from = undefined;

      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "❌ Could not identify user.",
        show_alert: true,
      });
    });

    it("should handle expired cache in private chat", async () => {
      mockCtx.callbackQuery!.message!.chat.type = "private";
      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);

      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "⏰ This link preview has expired. Please share the link again.",
        show_alert: true,
      });
    });
  });

  describe("handleManualAddCallback", () => {
    beforeEach(() => {
      mockCtx.callbackQuery = {
        data: "add_manual",
        message: {
          chat: { type: "private" } as any,
        } as any,
      } as any;
      mockCtx.answerCallbackQuery = jest.fn().mockResolvedValue({});
      mockCtx.conversation = {
        enter: jest.fn().mockResolvedValue({}),
      } as any;
    });

    it("should allow anyone to add manually in private chat", async () => {
      mockedIsAdmin.mockResolvedValue(false);
      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);

      await handleManualAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "✅ Starting manual concert entry...",
      });
    });

    it("should block non-admins in group chat", async () => {
      mockCtx.callbackQuery!.message!.chat.type = "group";
      mockedIsAdmin.mockResolvedValue(false);

      await handleManualAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "❌ Only admins can add concerts in groups.",
        show_alert: true,
      });
    });

    it("should handle missing user in manual add", async () => {
      mockCtx.from = undefined;

      await handleManualAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "❌ Could not identify user.",
        show_alert: true,
      });
    });

    it("should allow admins in group chat for manual add", async () => {
      mockCtx.callbackQuery!.message!.chat.type = "group";
      mockedIsAdmin.mockResolvedValue(true);
      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);

      await handleManualAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "✅ Starting manual concert entry...",
      });
      expect(mockCtx.conversation?.enter).toHaveBeenCalledWith("addConcertConversation", {
        dbUserId: 1,
        prefillData: undefined,
      });
    });

    it("should allow manual add in supergroup", async () => {
      mockCtx.callbackQuery!.message!.chat.type = "supergroup";
      mockedIsAdmin.mockResolvedValue(true);
      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);

      await handleManualAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "✅ Starting manual concert entry...",
      });
    });
  });
});
