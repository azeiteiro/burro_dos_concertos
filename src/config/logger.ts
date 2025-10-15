// src/config/logger.ts
import fs from "fs";
import path from "path";
import pino from "pino";

const logsDir = path.join(process.cwd(), "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: isProd ? "info" : "debug",
  transport: isProd
    ? {
        targets: [
          {
            target: "pino/file",
            options: { destination: path.join(logsDir, "app.log") },
          },
        ],
      }
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
});

export default logger;
