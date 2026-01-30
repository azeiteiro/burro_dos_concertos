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
        type: "private",
        id: 456,
      } as any,
      from: {
        id: 789,
        first_name: "João",
      } as any,
      reply: jest.fn().mockResolvedValue({ message_id: 999 }),
      api: {
        sendMessage: jest.fn().mockResolvedValue({}),
        editMessageText: jest.fn().mockResolvedValue({}),
        deleteMessage: jest.fn().mockResolvedValue({}),
      } as any,
    };
  });

  describe("handleUrlMessage", () => {
    it("should ignore messages without URLs", async () => {
      mockCtx.message!.text = "Hello, no links here";

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockedExtractMetadata).not.toHaveBeenCalled();
    });

    it("should ignore URLs in group chats", async () => {
      mockCtx.chat!.type = "group";

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockedExtractMetadata).not.toHaveBeenCalled();
    });

    it("should ignore URLs in supergroup chats", async () => {
      mockCtx.chat!.type = "supergroup";

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockedExtractMetadata).not.toHaveBeenCalled();
    });

    it("should show preview directly in private chat", async () => {
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

      expect(mockCtx.reply).toHaveBeenCalledWith("⏳ Analyzing concert link...");
      expect(mockCtx.reply).toHaveBeenCalledWith(
        "Formatted Preview",
        expect.objectContaining({
          parse_mode: "HTML",
        })
      );
    });

    it("should handle metadata extraction failure in private chat", async () => {
      mockedExtractMetadata.mockResolvedValue(null);

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Couldn't analyze this link automatically"),
        expect.any(Object)
      );
    });

    it("should handle extraction error in private chat", async () => {
      mockedExtractMetadata.mockRejectedValue(new Error("Extraction failed"));

      await handleUrlMessage(mockCtx as BotContext);

      expect(mockCtx.reply).toHaveBeenCalledWith(expect.stringContaining("Error analyzing link"));
    });

    it("should handle multiple URLs in one message", async () => {
      mockCtx.message!.text = "Check https://example.com/1 and https://example.com/2";

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
  });

  describe("handleQuickAddCallback", () => {
    let mockConversation: any;

    beforeEach(() => {
      mockConversation = {
        enter: jest.fn(),
      };

      mockCtx.callbackQuery = {
        data: "quick_add:test_cache_key",
        message: {
          chat: { type: "private", id: 456 } as any,
        } as any,
      } as any;
      mockCtx.answerCallbackQuery = jest.fn();
      mockCtx.conversation = mockConversation;

      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);
    });

    it("should allow anyone to add concert in private chat", async () => {
      // The cache is tested separately; this test just verifies the handler doesn't block private chats
      // Since cache is empty, it will return early with expired message
      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "⏰ This link preview has expired. Please share the link again.",
        show_alert: true,
      });
    });

    it("should ignore non-quick_add callbacks", async () => {
      mockCtx.callbackQuery!.data = "other_callback";

      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockedFindOrCreateUser).not.toHaveBeenCalled();
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
      await handleQuickAddCallback(mockCtx as BotContext);

      expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith({
        text: "⏰ This link preview has expired. Please share the link again.",
        show_alert: true,
      });
    });
  });

  describe("handleManualAddCallback", () => {
    let mockConversation: any;

    beforeEach(() => {
      mockConversation = {
        enter: jest.fn(),
      };

      mockCtx.callbackQuery = {
        data: "add_manual",
        message: {
          chat: { type: "private", id: 456 } as any,
        } as any,
      } as any;
      mockCtx.answerCallbackQuery = jest.fn();
      mockCtx.conversation = mockConversation;

      mockedFindOrCreateUser.mockResolvedValue({ id: 1 } as any);
    });

    it("should allow anyone to add manually in private chat", async () => {
      await handleManualAddCallback(mockCtx as BotContext);

      expect(mockedFindOrCreateUser).toHaveBeenCalled();
      expect(mockConversation.enter).toHaveBeenCalledWith("addConcertConversation", {
        dbUserId: 1,
        prefillData: undefined,
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
  });
});
