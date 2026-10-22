// src/config/logger.ts
import fs from "fs";
import path from "path";
import pino from "pino";

const logsDir = path.join(process.cwd(), "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const env = process.env.NODE_ENV;
const isProd = env === "production";
// pino-pretty is a dev dependency: only use it for local development and tests
const usePretty = !env || env === "development" || env === "test";

const logger = pino({
  level: isProd ? "info" : "debug",
  transport: usePretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : {
        targets: [
          {
            target: "pino/file",
            options: { destination: path.join(logsDir, "app.log") },
          },
          { target: "pino/file", options: { destination: 1 } },
        ],
      },
});

export default logger;
