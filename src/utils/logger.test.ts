import fs from "fs";
import path from "path";
import { logAction } from "./logger";

jest.mock("fs");

describe("logAction", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("creates logs directory if it doesn't exist and appends message", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const appendFileSyncMock = fs.appendFileSync as jest.Mock;
    const mkdirSyncMock = fs.mkdirSync as jest.Mock;

    const userId = 123;
    const message = "Test action";

    logAction(userId, message);

    const logsDir = path.join(process.cwd(), "logs");
    const today = new Date().toISOString().split("T")[0];
    const logFile = path.join(logsDir, `actions-${today}.log`);

    expect(mkdirSyncMock).toHaveBeenCalledWith(logsDir, { recursive: true });
    expect(appendFileSyncMock).toHaveBeenCalledWith(
      logFile,
      expect.stringMatching(new RegExp(`User ${userId}: ${message}`))
    );
  });

  it("handles fs errors gracefully", () => {
    (fs.existsSync as jest.Mock).mockImplementation(() => {
      throw new Error("fail");
    });
    console.error = jest.fn();

    logAction(1, "message");

    expect(console.error).toHaveBeenCalledWith("Failed to write to log file:", expect.any(Error));
  });
});
