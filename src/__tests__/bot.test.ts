describe("bot.ts", () => {
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.NODE_ENV = "test";
    process.env.BOT_TOKEN = "dummy";
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
  });

  it("initializes bot and registers commands correctly", () => {
    const useMock = jest.fn();
    const commandMock = jest.fn();
    const startMock = jest.fn();

    // Mock grammy Bot
    jest.mock("grammy", () => {
      return {
        Bot: jest.fn().mockImplementation(() => ({
          use: useMock,
          command: commandMock,
          start: startMock,
        })),
      };
    });

    // Mock functions imported by bot.ts
    jest.mock("@/bot/commands", () => ({
      registerCommands: jest.fn(),
    }));

    jest.mock("@/setupCommands", () => ({
      setupCommands: jest.fn(),
    }));

    jest.mock("@/notifications/notifications", () => ({
      startNotifications: jest.fn(),
    }));

    jest.mock("@/commands/start", () => jest.fn());
    jest.mock("@/commands/help", () => ({ helpCommand: jest.fn() }));
    jest.mock("@/commands/about", () => ({ aboutCommand: jest.fn() }));

    jest.mock("@grammyjs/conversations", () => ({
      conversations: jest.fn(() => "conversations-middleware"),
      createConversation: jest.fn(() => "conversation-middleware"),
    }));

    // Now load bot.ts inside isolateModules
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { bot } = require("@/bot"); // this triggers initialization

      expect(bot).toBeDefined();

      // 🚀 Should register commands
      expect(commandMock).toHaveBeenCalledWith("start", expect.any(Function));
      expect(commandMock).toHaveBeenCalledWith("help", expect.any(Function));
      expect(commandMock).toHaveBeenCalledWith("about", expect.any(Function));

      // 🧩 Conversations + setupCommands + registerCommands = multiple uses
      expect(useMock).toHaveBeenCalled();

      // 🛑 Should NOT start the bot in test mode
      expect(startMock).not.toHaveBeenCalled();
    });
  });
});
