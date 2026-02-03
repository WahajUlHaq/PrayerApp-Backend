import express from "express";
import dotenv from "dotenv";
import path from "path";
const cors = require("cors");

import connectDB from "#configs/mongodb";
import router from "#routes/index";
import { startNamazTimingsDailyCron } from "#cron/namaz-timings-refresh";
import { startPageCleanupCron } from "#cron/page-cleanup";

dotenv.config();

const app = express();
app.use(express.json());
// app.use(cors());

app.use(cors(
{  origin: "*"}
));

// Serve static files from uploads folder
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[req] ${req.method} ${req.originalUrl}`);
  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(`[res] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });
  next();
});

app.use("/api", router);

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(`[error] ${req.method} ${req.originalUrl}`, err?.message || err);
  res.status(500).json({ message: err?.message || "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  startNamazTimingsDailyCron();
  startPageCleanupCron();
  
  // Fetch namaz timings immediately on server startup
  const { refreshNamazTimingsFromMasjidConfig } = await import("#cron/namaz-timings-refresh");
  refreshNamazTimingsFromMasjidConfig().catch((err) => {
    console.error("[startup] Failed to refresh namaz timings on startup:", err?.message || err);
  });
  
  app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
});
