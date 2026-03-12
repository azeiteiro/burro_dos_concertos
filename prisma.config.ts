import dotenv from "dotenv";
import path from "path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    // Use a placeholder during build (prisma generate doesn't need real URL)
    // At runtime, DATABASE_URL will be available from Fly secrets
    url:
      process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
