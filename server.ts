import express from "express";
import dotenv from "dotenv";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
const cors = require("cors");

import connectDB from "#configs/mongodb";
import router from "#routes/index";
import { startNamazTimingsDailyCron, refreshNamazTimingsFromMasjidConfig } from "#cron/namaz-timings-refresh";
import { startPageCleanupCron } from "#cron/page-cleanup";
import { cleanupExpiredPages } from "#services/page";
import { createAnnouncement } from "#services/announcement";

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

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

// Socket.IO - Reload signal with confirmation
io.on("connection", (socket) => {
  console.log(`[socket] 🟢 Client connected: ${socket.id}`);
  
  // Admin sends reload signal
  socket.on("admin:reload", async (data, callback) => {
    console.log(`\n[socket] 🔄 ============= ADMIN RELOAD TRIGGERED =============`);
    console.log(`[socket] Data received:`, data);
    
    try {
      // Execute all cron jobs immediately
      console.log(`[socket] 📋 Executing all cron jobs...`);
      
      // Refresh namaz timings
      console.log(`[socket] ⏰ Refreshing namaz timings...`);
      await refreshNamazTimingsFromMasjidConfig();
      console.log(`[socket] ✅ Namaz timings refreshed successfully`);
      
      // Cleanup expired pages
      console.log(`[socket] 🧹 Running page cleanup...`);
      await cleanupExpiredPages();
      console.log(`[socket] ✅ Page cleanup completed successfully`);
      
      console.log(`[socket] ✅ All cron jobs executed successfully`);
      
      // Broadcast to all clients (mobile apps)
      console.log(`[socket] 📡 Broadcasting reload signal to all clients...`);
      io.emit("client:reload", {
        message: "Reload requested by admin",
        timestamp: new Date().toISOString(),
        ...data
      });
      console.log(`[socket] ✅ Reload signal broadcast completed`);
      console.log(`[socket] ============================================\n`);
      
      // Send acknowledgment to admin
      if (callback) {
        callback({
          success: true,
          message: "Reload signal sent successfully",
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error(`[socket] ❌ Error executing cron jobs:`, error?.message || error);
      console.error(`[socket] Stack:`, error?.stack);
      // Still send reload signal even if cron fails
      console.log(`[socket] ⚠️  Sending reload signal despite errors...`);
      io.emit("client:reload", {
        message: "Reload requested by admin (with errors)",
        timestamp: new Date().toISOString(),
        error: error?.message,
        ...data
      });
      console.log(`[socket] ============================================\n`);
      
      // Send error acknowledgment to admin
      if (callback) {
        callback({
          success: false,
          message: "Reload signal sent with errors",
          error: error?.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Admin sends announce signal
  socket.on("admin:announce", async (data, callback) => {
    console.log(`\n[socket] 📢 ============= ADMIN ANNOUNCE EVENT RECEIVED =============`);
    console.log(`[socket] Received from client: ${socket.id}`);
    console.log(`[socket] Data received:`, data);
    
    try {
      console.log(`[socket] 📝 Fetching announcements from masjid config...`);
      
      // Create announcement and generate voice with ElevenLabs
      // Text is fetched from masjid config inside createAnnouncement
      const announcement = await createAnnouncement({ text: "" });
      
      console.log(`[socket] ✅ Announcement created:`, {
        id: announcement._id,
        hasAudio: !!announcement.audioUrl,
        useMobileTTS: announcement.useMobileTTS,
        error: announcement.elevenLabsError
      });
      
      // Broadcast to all clients (mobile apps)
      console.log(`[socket] 📡 Broadcasting announce signal to all clients...`);
      io.emit("client:announce", {
        _id: announcement._id,
        text: announcement.text,
        audioUrl: announcement.audioUrl,
        useMobileTTS: announcement.useMobileTTS,
        message: "Announcement from admin",
        timestamp: new Date().toISOString(),
        ...data
      });
      console.log(`[socket] ✅ Announce signal broadcast completed`);
      console.log(`[socket] ============================================\n`);
      
      // Send acknowledgment to admin
      if (callback) {
        callback({
          success: true,
          message: "Announcement sent successfully",
          announcement: announcement,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error(`[socket] ❌ Error creating announcement:`, error.message);
      
      // On error, send to mobile anyway with useMobileTTS flag
      console.log(`[socket] ⚠️ Broadcasting announcement without ElevenLabs due to error`);
      io.emit("client:announce", {
        text: error.message || "Announcement error",
        useMobileTTS: true,
        message: error.message || "Error fetching announcements",
        timestamp: new Date().toISOString(),
        ...data
      });
      
      if (callback) {
        callback({
          success: false,
          message: "Announcement sent with mobile TTS fallback",
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  
  // Mobile client confirms refresh is done
  socket.on("client:refreshed", (data) => {
    console.log(`[socket] ✅ Client ${socket.id} confirmed refresh completed`);
    console.log(`[socket] Client data:`, data);
    // Notify admin about client refresh status
    io.emit("admin:client-status", {
      clientId: socket.id,
      status: "refreshed",
      timestamp: new Date().toISOString(),
      ...data
    });
    console.log(`[socket] 📤 Status sent to admin dashboard\n`);
  });
  
  // Mobile client confirms announcement received
  socket.on("client:announced", (data) => {
    console.log(`[socket] ✅ Client ${socket.id} confirmed announcement received`);
    console.log(`[socket] Client data:`, data);
    // Notify admin about client announcement status
    io.emit("admin:client-status", {
      clientId: socket.id,
      status: "announced",
      timestamp: new Date().toISOString(),
      ...data
    });
    console.log(`[socket] 📤 Status sent to admin dashboard\n`);
  });
  
  socket.on("disconnect", () => {
    console.log(`[socket] 🔴 Client disconnected: ${socket.id}\n`);
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  startNamazTimingsDailyCron();
  startPageCleanupCron();
  
  // Fetch namaz timings immediately on server startup
  refreshNamazTimingsFromMasjidConfig().catch((err) => {
    console.error("[startup] Failed to refresh namaz timings on startup:", err?.message || err);
  });
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔌 Socket.IO ready for connections`);
  });
});
