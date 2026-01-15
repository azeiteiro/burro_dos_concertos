import { getUserByTelegramId } from "@/utils/helpers";

// 🛠 Mock before importing the module under test
jest.mock("@/utils/helpers", () => ({
  getUserByTelegramId: jest.fn(),
}));

// Silence logs during tests
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

// Create fake bot with mock methods
const createMockBot = () => ({
  api: {
    setMyCommands: jest.fn().mockResolvedValue(undefined),
  },
  use: jest.fn(),
});

// ⬇️ Import AFTER mocks are applied — ESM-safe, ESLint-safe
import { setupCommands } from "@/setupCommands";

describe("setupCommands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(100000); // stable time
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("registers base commands on startup", () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    expect(bot.api.setMyCommands).toHaveBeenCalledWith(
      [
        { command: "help", description: "Show help information" },
        { command: "about", description: "About this bot" },
      ],
      { scope: { type: "all_private_chats" } }
    );
  });

  it("clears commands from all group chats", () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    expect(bot.api.setMyCommands).toHaveBeenCalledWith([], { scope: { type: "all_group_chats" } });
  });

  it("skips middleware if chat is not private", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    const middleware = bot.use.mock.calls[0][0];
    const next = jest.fn();

    await middleware({ chat: { type: "group" } } as any, next);

    expect(next).toHaveBeenCalled();
    expect(bot.api.setMyCommands).toHaveBeenCalledTimes(2);
  });

  it("sets normal user commands in private chat", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "User" });

    const middleware = bot.use.mock.calls[0][0];

    const ctx = {
      chat: { type: "private" },
      from: { id: 123 },
      api: bot.api,
    };

    const next = jest.fn();

    await middleware(ctx as any, next);

    expect(bot.api.setMyCommands).toHaveBeenCalledWith(
      [
        { command: "help", description: "Show help information" },
        { command: "about", description: "About this bot" },
        { command: "add_concert", description: "Add a new concert" },
        { command: "see_concerts", description: "View upcoming concerts" },
        { command: "edit_concert", description: "Edit your concerts" },
        { command: "delete_concert", description: "Delete your concerts" },
      ],
      { scope: { type: "chat", chat_id: 123 } }
    );

    expect(next).toHaveBeenCalled();
  });

  it("sets admin commands in private chat", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "Admin" });

    const middleware = bot.use.mock.calls[0][0];

    const ctx = {
      chat: { type: "private" },
      from: { id: 999 },
      api: bot.api,
    };

    const next = jest.fn();

    await middleware(ctx as any, next);

    expect(bot.api.setMyCommands).toHaveBeenCalledWith(
      expect.arrayContaining([
        { command: "add_concert", description: "Add a new concert" },
        { command: "list_users", description: "📋 List all users" },
      ]),
      { scope: { type: "chat", chat_id: 999 } }
    );

    expect(next).toHaveBeenCalled();
  });

  it("sets SuperAdmin commands in private chat", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "SuperAdmin" });

    const middleware = bot.use.mock.calls[0][0];

    const ctx = {
      chat: { type: "private" },
      from: { id: 888 },
      api: bot.api,
    };

    const next = jest.fn();

    await middleware(ctx as any, next);

    expect(bot.api.setMyCommands).toHaveBeenCalledWith(
      expect.arrayContaining([
        { command: "add_concert", description: "Add a new concert" },
        { command: "list_users", description: "📋 List all users" },
      ]),
      { scope: { type: "chat", chat_id: 888 } }
    );

    expect(next).toHaveBeenCalled();
  });

  it("sets Moderator commands in private chat", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "Moderator" });

    const middleware = bot.use.mock.calls[0][0];

    const ctx = {
      chat: { type: "private" },
      from: { id: 777 },
      api: bot.api,
    };

    const next = jest.fn();

    await middleware(ctx as any, next);

    expect(bot.api.setMyCommands).toHaveBeenCalledWith(
      expect.arrayContaining([
        { command: "add_concert", description: "Add a new concert" },
        { command: "edit_concert", description: "Edit an existing concert" },
        { command: "delete_concert", description: "Delete a concert" },
      ]),
      { scope: { type: "chat", chat_id: 777 } }
    );

    // Should NOT have user management commands
    const commandsCall = bot.api.setMyCommands.mock.calls.find(
      (call: any) => call[1]?.scope?.chat_id === 777
    );
    const commands = commandsCall[0];
    expect(commands).not.toContainEqual({ command: "list_users", description: expect.any(String) });

    expect(next).toHaveBeenCalled();
  });

  it("skips command setting when cache is still valid", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    (getUserByTelegramId as jest.Mock).mockResolvedValue({ role: "User" });

    const middleware = bot.use.mock.calls[0][0];
    const ctx = {
      chat: { type: "private" },
      from: { id: 111 },
      api: bot.api,
    };
    const next = jest.fn();

    await middleware(ctx as any, next);
    await middleware(ctx as any, next);

    expect(bot.api.setMyCommands).toHaveBeenCalledTimes(3); // base + clear + first user set
  });

  it("handles DB errors and still calls next()", async () => {
    const bot = createMockBot();
    setupCommands(bot as any);

    (getUserByTelegramId as jest.Mock).mockRejectedValue(new Error("DB fail"));

    const middleware = bot.use.mock.calls[0][0];

    const ctx = {
      chat: { type: "private" },
      from: { id: 555 },
      api: bot.api,
    };

    const next = jest.fn();

    await middleware(ctx as any, next);

    expect(next).toHaveBeenCalled();
  });
});
