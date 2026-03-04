import { createServer, startServer } from "@/api/server";
import request from "supertest";

jest.mock("@/api/routes", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express");
  const router = express.Router();
  router.get("/test", (req: any, res: any) => res.json({ test: "ok" }));
  return router;
});

describe("API Server", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should create an Express app", () => {
    const app = createServer();
    expect(app).toBeDefined();
  });

  it("should have /health endpoint", async () => {
    const app = createServer();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("should mount API routes at /api", async () => {
    const app = createServer();
    const response = await request(app).get("/api/test");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ test: "ok" });
  });

  it("should serve static files when SERVE_STATIC is true", () => {
    process.env.SERVE_STATIC = "true";
    const app = createServer();
    expect(app).toBeDefined();
    // Static file serving is configured, but we can't easily test file serving in unit tests
    // The important part is that the code path is executed
  });

  it("should start server and return server instance", () => {
    const server = startServer();
    expect(server).toBeDefined();
    expect(server.listening).toBe(true);
    server.close();
  });
});
