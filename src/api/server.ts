import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
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
    console.log(`📱 Serving Mini App from: ${miniAppPath}`);
    console.log(`📁 __dirname: ${__dirname}`);

    // Check if directory exists
    if (fs.existsSync(miniAppPath)) {
      console.log(`✅ Mini App directory exists`);
      const files = fs.readdirSync(miniAppPath);
      console.log(`📄 Files in Mini App directory:`, files);
    } else {
      console.log(`❌ Mini App directory NOT found at ${miniAppPath}`);
    }

    app.use(express.static(miniAppPath));

    // SPA fallback - serve index.html for all non-API routes
    app.use((req, res) => {
      res.sendFile(path.join(miniAppPath, "index.html"));
    });
  } else {
    console.log(`⚠️ SERVE_STATIC is not "true", it is: "${process.env.SERVE_STATIC}"`);
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
