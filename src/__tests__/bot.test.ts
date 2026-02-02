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
    let sessionConfig: any;
    const useMock = jest.fn((middleware) => {
      // Capture session config if it's passed
      if (typeof middleware === "object" && "initial" in middleware) {
        sessionConfig = middleware;
      }
    });
    const commandMock = jest.fn();
    const startMock = jest.fn();

    // Mock grammy Bot
    jest.mock("grammy", () => {
      return {
        Bot: jest.fn().mockImplementation(() => ({
          use: useMock,
          command: commandMock,
          start: startMock,
          on: jest.fn(),
          callbackQuery: jest.fn(),
        })),
        session: jest.fn((config) => {
          sessionConfig = config;
          return "session-middleware";
        }),
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

    jest.mock("@/handlers/urlHandler", () => ({
      handleUrlMessage: jest.fn(),
      handleQuickAddCallback: jest.fn(),
      handleManualAddCallback: jest.fn(),
    }));

    jest.mock("@grammyjs/conversations", () => ({
      conversations: jest.fn(() => "conversations-middleware"),
      createConversation: jest.fn(() => "conversation-middleware"),
    }));

    jest.mock("@/api/server", () => ({
      startServer: jest.fn(() => ({ close: jest.fn() })),
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

    // Test session initial function if captured
    if (sessionConfig && sessionConfig.initial) {
      const initialSession = sessionConfig.initial();
      expect(initialSession).toEqual({});
    }
  });

  it("starts bot when not in test mode", () => {
    const originalJestWorkerId = process.env.JEST_WORKER_ID;
    delete process.env.JEST_WORKER_ID;

    const startMock = jest.fn();

    jest.mock("grammy", () => {
      return {
        Bot: jest.fn().mockImplementation(() => ({
          use: jest.fn(),
          command: jest.fn(),
          start: startMock,
          on: jest.fn(),
          callbackQuery: jest.fn(),
        })),
        session: jest.fn(() => "session-middleware"),
      };
    });

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

    jest.mock("@/handlers/urlHandler", () => ({
      handleUrlMessage: jest.fn(),
      handleQuickAddCallback: jest.fn(),
      handleManualAddCallback: jest.fn(),
    }));

    jest.mock("@grammyjs/conversations", () => ({
      conversations: jest.fn(() => "conversations-middleware"),
      createConversation: jest.fn(() => "conversation-middleware"),
    }));

    jest.mock("@/api/server", () => ({
      startServer: jest.fn(() => ({ close: jest.fn() })),
    }));

    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("@/bot");
      expect(startMock).toHaveBeenCalled();
    });

    // Restore
    if (originalJestWorkerId !== undefined) {
      process.env.JEST_WORKER_ID = originalJestWorkerId;
    }
  });
});
