import {
  helpCommand,
  showConcertsHelp,
  showCalendarHelp,
  showResponsesHelp,
  showAdminHelp,
  showFAQHelp,
  handleHelpCallbacks,
} from "#/commands/help";
import { getUserByTelegramId } from "#/utils/helpers";
import { BotContext } from "#/types/global";

// Mock DB helper
jest.mock("#/utils/helpers", () => ({
  getUserByTelegramId: jest.fn(),
}));

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

describe("helpCommand", () => {
  let replyMock: jest.Mock;
  let editMessageTextMock: jest.Mock;
  let answerCallbackQueryMock: jest.Mock;
  let ctx: Partial<BotContext>;

  beforeEach(() => {
    replyMock = jest.fn();
    editMessageTextMock = jest.fn();
    answerCallbackQueryMock = jest.fn();
    ctx = {
      chat: { type: "private" },
      from: { id: 123 },
      reply: replyMock,
      editMessageText: editMessageTextMock,
      answerCallbackQuery: answerCallbackQueryMock,
    };
    (getUserByTelegramId as jest.Mock).mockReset();
  });

  describe("helpCommand", () => {
    it("shows main help menu in private chat", async () => {
      (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "User" });

      await helpCommand(ctx as BotContext);

      expect(replyMock).toHaveBeenCalled();
      const text = replyMock.mock.calls[0][0];
      const options = replyMock.mock.calls[0][1];

      expect(text).toContain("Burro dos Concertos Help");
      expect(text).toContain("Select a topic below");
      expect(options.parse_mode).toBe("Markdown");
      expect(options.reply_markup).toBeDefined();
    });

    it("does not show admin button for regular users", async () => {
      (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "User" });

      await helpCommand(ctx as BotContext);

      const options = replyMock.mock.calls[0][1];
      const keyboard = JSON.stringify(options.reply_markup);

      expect(keyboard).toContain("Managing Concerts");
      expect(keyboard).toContain("Calendar Subscription");
      expect(keyboard).toContain("Concert Responses");
      expect(keyboard).toContain("FAQ");
      expect(keyboard).not.toContain("Admin Commands");
    });

    it("shows admin button for admins", async () => {
      (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "Admin" });

      await helpCommand(ctx as BotContext);

      const options = replyMock.mock.calls[0][1];
      const keyboard = JSON.stringify(options.reply_markup);

      expect(keyboard).toContain("Admin Commands");
    });

    it("shows admin button for superadmins", async () => {
      (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "SuperAdmin" });

      await helpCommand(ctx as BotContext);

      const options = replyMock.mock.calls[0][1];
      const keyboard = JSON.stringify(options.reply_markup);

      expect(keyboard).toContain("Admin Commands");
    });

    it("replies with warning if command is used in a group chat", async () => {
      ctx.chat = { type: "group" };

      await helpCommand(ctx as BotContext);

      expect(replyMock).toHaveBeenCalledWith("❌ Please use this command in a private chat.");
    });

    it("does nothing if from.id is missing", async () => {
      ctx.from = undefined;

      await helpCommand(ctx as BotContext);

      expect(replyMock).not.toHaveBeenCalled();
    });

    it("handles DB errors gracefully", async () => {
      (getUserByTelegramId as jest.Mock).mockRejectedValue(new Error("DB fail"));

      // Fallback: treat as normal user if DB fails
      await helpCommand(ctx as BotContext);

      expect(replyMock).toHaveBeenCalled();
      const text = replyMock.mock.calls[0][0];
      expect(text).toContain("Burro dos Concertos Help");
    });
  });

  describe("showConcertsHelp", () => {
    it("shows concerts help with back button", async () => {
      await showConcertsHelp(ctx as BotContext);

      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      const options = editMessageTextMock.mock.calls[0][1];

      expect(text).toContain("Managing Concerts");
      expect(text).toContain("Adding Concerts");
      expect(text).toContain("/add_concert");
      expect(text).toContain("/see_concerts");
      expect(text).toContain("/edit_concert");
      expect(text).toContain("/delete_concert");
      expect(options.parse_mode).toBe("Markdown");

      const keyboard = JSON.stringify(options.reply_markup);
      expect(keyboard).toContain("Back to Help");
    });
  });

  describe("showCalendarHelp", () => {
    it("shows calendar help with back button", async () => {
      await showCalendarHelp(ctx as BotContext);

      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      const options = editMessageTextMock.mock.calls[0][1];

      expect(text).toContain("Calendar Subscription");
      expect(text).toContain("How to Subscribe");
      expect(text).toContain("Apple Calendar");
      expect(text).toContain("Samsung Calendar");
      expect(text).toContain("Google Calendar");
      expect(options.parse_mode).toBe("Markdown");

      const keyboard = JSON.stringify(options.reply_markup);
      expect(keyboard).toContain("Back to Help");
    });
  });

  describe("showResponsesHelp", () => {
    it("shows responses help with back button", async () => {
      await showResponsesHelp(ctx as BotContext);

      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      const options = editMessageTextMock.mock.calls[0][1];

      expect(text).toContain("Concert Responses");
      expect(text).toContain("Going");
      expect(text).toContain("Interested");
      expect(text).toContain("Not Going");
      expect(options.parse_mode).toBe("Markdown");

      const keyboard = JSON.stringify(options.reply_markup);
      expect(keyboard).toContain("Back to Help");
    });
  });

  describe("showAdminHelp", () => {
    it("shows admin help with back button", async () => {
      await showAdminHelp(ctx as BotContext);

      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      const options = editMessageTextMock.mock.calls[0][1];

      expect(text).toContain("Admin Commands");
      expect(text).toContain("/list_users");
      expect(text).toContain("/promote_user");
      expect(text).toContain("/demote_user");
      expect(text).toContain("/user_info");
      expect(options.parse_mode).toBe("Markdown");

      const keyboard = JSON.stringify(options.reply_markup);
      expect(keyboard).toContain("Back to Help");
    });
  });

  describe("showFAQHelp", () => {
    it("shows FAQ help with back button", async () => {
      await showFAQHelp(ctx as BotContext);

      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      const options = editMessageTextMock.mock.calls[0][1];

      expect(text).toContain("Frequently Asked Questions");
      expect(text).toContain("Q:");
      expect(text).toContain("A:");
      expect(options.parse_mode).toBe("Markdown");

      const keyboard = JSON.stringify(options.reply_markup);
      expect(keyboard).toContain("Back to Help");
    });
  });

  describe("handleHelpCallbacks", () => {
    beforeEach(() => {
      (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "User" });
    });

    it("returns early if callback data does not start with help_", async () => {
      ctx.callbackQuery = { data: "other_callback" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).not.toHaveBeenCalled();
    });

    it("handles help_main callback", async () => {
      ctx.callbackQuery = { data: "help_main" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).toHaveBeenCalled();
      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      expect(text).toContain("Burro dos Concertos Help");
    });

    it("handles help_concerts callback", async () => {
      ctx.callbackQuery = { data: "help_concerts" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).toHaveBeenCalled();
      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      expect(text).toContain("Managing Concerts");
    });

    it("handles help_calendar callback", async () => {
      ctx.callbackQuery = { data: "help_calendar" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).toHaveBeenCalled();
      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      expect(text).toContain("Calendar Subscription");
    });

    it("handles help_responses callback", async () => {
      ctx.callbackQuery = { data: "help_responses" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).toHaveBeenCalled();
      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      expect(text).toContain("Concert Responses");
    });

    it("handles help_admin callback", async () => {
      ctx.callbackQuery = { data: "help_admin" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).toHaveBeenCalled();
      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      expect(text).toContain("Admin Commands");
    });

    it("handles help_faq callback", async () => {
      ctx.callbackQuery = { data: "help_faq" };

      await handleHelpCallbacks(ctx as BotContext);

      expect(answerCallbackQueryMock).toHaveBeenCalled();
      expect(editMessageTextMock).toHaveBeenCalled();
      const text = editMessageTextMock.mock.calls[0][0];
      expect(text).toContain("Frequently Asked Questions");
    });
  });
});
