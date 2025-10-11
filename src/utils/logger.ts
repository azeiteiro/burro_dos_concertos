import fs from "fs";
import path from "path";

const logsDir = path.join(process.cwd(), "logs");

export const logAction = (userId: number, message: string) => {
  try {
    // Ensure the logs directory exists
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Get today's date (e.g., 2025-10-10)
    const today = new Date().toISOString().split("T")[0];
    const logFile = path.join(logsDir, `actions-${today}.log`);

    // Build log message
    const logMsg = `[${new Date().toISOString()}] User ${userId}: ${message}\n`;

    // Append to the current day's log
    fs.appendFileSync(logFile, logMsg);
  } catch (err) {
    console.error("Failed to write to log file:", err);
  }
};
