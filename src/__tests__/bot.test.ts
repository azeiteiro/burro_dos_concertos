describe("bot.ts", () => {
  beforeAll(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterAll(() => {
    (console.log as jest.Mock).mockRestore();
  });

  it("initializes bot and registers commands", () => {
    const useMock = jest.fn();
    const commandMock = jest.fn();
    const startMock = jest.fn();

    jest.isolateModules(() => {
      jest.mock("grammy", () => {
        const original = jest.requireActual("grammy");
        return {
          ...original,
          Bot: jest.fn().mockImplementation(() => ({
            use: useMock,
            command: commandMock,
            start: startMock,
          })),
        };
      });

      // ts-ignore just for dynamic require
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { bot } = require("@/bot");

      expect(bot).toBeDefined();
      expect(commandMock).toHaveBeenCalledWith("add_concert", expect.any(Function));
      expect(commandMock).toHaveBeenCalledWith("see_concerts", expect.any(Function));
      expect(commandMock).toHaveBeenCalledWith("delete_concert", expect.any(Function));
      expect(commandMock).toHaveBeenCalledWith("start", expect.any(Function));
      expect(useMock).toHaveBeenCalled();
      expect(startMock).not.toHaveBeenCalled();
    });
  });
});
