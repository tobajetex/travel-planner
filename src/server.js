import express from "express";
import cors from "cors";
import { driver, closeDriver } from "./config/db.js";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allows frontend to talk to backend
app.use(express.json()); // Parses JSON request bodies
app.use(express.static("src/public")); // Serves our HTML/CSS/JS files

// --- HEALTH CHECK ENDPOINT ---
// This endpoint tests if CognoDB is reachable when the browser visits /api/health
app.get("/api/health", async (req, res) => {
  const session = driver.session();
  try {
    await session.run("RETURN 1");
    res.status(200).json({ status: "OK", database: "CognoDB is connected" });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(503).json({ status: "ERROR", message: "Database unreachable" });
  } finally {
    await session.close();
  }
});

// --- START THE SERVER ---
const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// --- GRACEFUL SHUTDOWN (for when you hit Ctrl+C) ---
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down server...");
  await closeDriver(); // Close the CognoDB connection
  server.close(() => {
    console.log("👋 Server closed.");
    process.exit(0);
  });
});
