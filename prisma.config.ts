import dotenv from "dotenv";
import path from "path";
import { defineConfig, env } from "prisma/config";

// Load environment-specific .env file
const envFile =
  process.env.NODE_ENV === "test"
    ? ".env.test"
    : process.env.NODE_ENV === "production"
      ? ".env.production"
      : ".env.local";

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// Fallback to .env if specific file doesn't exist
if (!process.env.DATABASE_URL) {
  dotenv.config();
}

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
});
