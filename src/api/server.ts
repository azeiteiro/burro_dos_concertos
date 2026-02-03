import express from "express";
import cors from "cors";
import path from "path";
import apiRoutes from "./routes";

const PORT = process.env.API_PORT || 3001;

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API routes
  app.use("/api", apiRoutes);

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Serve Mini App static files only in production (Fly.io)
  // In staging, Apache handles static files
  if (process.env.SERVE_STATIC === "true") {
    const miniAppPath = path.join(__dirname, "../web/dist");
    app.use(express.static(miniAppPath));

    // SPA fallback - serve index.html for all non-API routes
    app.use((req, res) => {
      res.sendFile(path.join(miniAppPath, "index.html"));
    });
  }

  return app;
}

export function startServer() {
  const app = createServer();

  const server = app.listen(PORT, () => {
    console.log(`🌐 API server running on http://localhost:${PORT}`);
  });

  return server;
}
