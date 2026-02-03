import { createServer } from "@/api/server";
import request from "supertest";

jest.mock("@/api/routes", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const express = require("express");
  const router = express.Router();
  router.get("/test", (req: any, res: any) => res.json({ test: "ok" }));
  return router;
});

describe("API Server", () => {
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
});
