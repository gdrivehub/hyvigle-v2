/**
 * Hyvigle - Anonymous Video/Audio Chat Server
 * WebRTC Signaling + Socket.IO + Express
 */

// dotenv only needed locally — on Koyeb, set env vars in the dashboard
if (process.env.NODE_ENV !== "production") {
  try { require("dotenv").config(); } catch (_) {}
}
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);

// ─── CORS ────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use("/api/", limiter);

app.use(express.json());

// ─── SERVE STATIC CLIENT ─────────────────────────────────────────────────────
// In Docker: client/dist is copied next to index.js → ./client/dist
// In local dev: it's ../client/dist (monorepo layout)
const clientBuildPath = path.join(
  __dirname,
  fs.existsSync(path.join(__dirname, "client/dist")) ? "client/dist" : "../client/dist"
);
app.use(express.static(clientBuildPath));

// ─── SOCKET.IO ───────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
  pingTimeout: 30000,
  pingInterval: 10000,
});

// ─── STATE ───────────────────────────────────────────────────────────────────
/** @type {string[]} - Queue of socket IDs waiting for a match */
const waitingQueue = [];

/** @type {Map<string, string>} - socketId -> partnerId */
const activePairs = new Map();

/** @type {Map<string, { joinedAt: number; reports: number; mode: string }>} */
const userMeta = new Map();

/** @type {Set<string>} - Blocked IPs */
const blockedIPs = new Set();

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function removeFromQueue(socketId) {
  const idx = waitingQueue.indexOf(socketId);
  if (idx !== -1) waitingQueue.splice(idx, 1);
}

function disconnectPair(socketId) {
  const partnerId = activePairs.get(socketId);
  if (partnerId) {
    activePairs.delete(socketId);
    activePairs.delete(partnerId);
    return partnerId;
  }
  return null;
}

function tryMatch(socketId) {
  // Remove self from queue if present
  removeFromQueue(socketId);

  if (waitingQueue.length === 0) {
    // No one waiting — add self to queue
    waitingQueue.push(socketId);
    io.to(socketId).emit("waiting");
    broadcastOnlineCount();
    return;
  }

  // Pop the first waiting user
  const partnerId = waitingQueue.shift();

  // Double-check partner is still connected
  const partnerSocket = io.sockets.sockets.get(partnerId);
  if (!partnerSocket) {
    // Partner disconnected, try again
    tryMatch(socketId);
    return;
  }

  // Create pair
  activePairs.set(socketId, partnerId);
  activePairs.set(partnerId, socketId);

  // Decide who initiates the WebRTC offer (the new arrival)
  // socketId = initiator (sends offer), partnerId = receiver (sends answer)
  io.to(socketId).emit("matched", { initiator: true, partnerId });
  io.to(partnerId).emit("matched", { initiator: false, partnerId: socketId });

  broadcastOnlineCount();
}

function broadcastOnlineCount() {
  const count = io.engine.clientsCount;
  io.emit("onlineCount", count);
}

// ─── SOCKET EVENTS ───────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  const ip =
    socket.handshake.headers["x-forwarded-for"] ||
    socket.handshake.address ||
    "unknown";

  // Block check
  if (blockedIPs.has(ip)) {
    socket.emit("error", { message: "You have been blocked." });
    socket.disconnect(true);
    return;
  }

  userMeta.set(socket.id, {
    joinedAt: Date.now(),
    reports: 0,
    mode: "video",
    ip,
  });

  console.log(`[connect] ${socket.id} (${ip})`);
  broadcastOnlineCount();

  // ── Join queue ─────────────────────────────────────────────────────────────
  socket.on("joinQueue", ({ mode = "video" } = {}) => {
    const meta = userMeta.get(socket.id);
    if (meta) meta.mode = mode;

    // Disconnect from current peer if any
    const oldPartner = disconnectPair(socket.id);
    if (oldPartner) {
      io.to(oldPartner).emit("partnerDisconnected");
      // Re-queue old partner
      tryMatch(oldPartner);
    }

    tryMatch(socket.id);
  });

  // ── WebRTC Signaling ───────────────────────────────────────────────────────
  socket.on("offer", ({ offer }) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("offer", { offer, from: socket.id });
    }
  });

  socket.on("answer", ({ answer }) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("answer", { answer });
    }
  });

  socket.on("iceCandidate", ({ candidate }) => {
    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("iceCandidate", { candidate });
    }
  });

  // ── Chat ───────────────────────────────────────────────────────────────────
  socket.on("chatMessage", ({ text }) => {
    if (!text || typeof text !== "string") return;
    const sanitized = text.slice(0, 500).trim();
    if (!sanitized) return;

    const partnerId = activePairs.get(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("chatMessage", {
        text: sanitized,
        from: "stranger",
        ts: Date.now(),
      });
    }
  });

  // ── Skip / Next ────────────────────────────────────────────────────────────
  socket.on("skip", () => {
    const partnerId = disconnectPair(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partnerDisconnected");
      // Re-queue partner
      tryMatch(partnerId);
    }
    // Re-queue self
    tryMatch(socket.id);
  });

  // ── Report ─────────────────────────────────────────────────────────────────
  socket.on("report", ({ reason = "unspecified" } = {}) => {
    const partnerId = activePairs.get(socket.id);
    if (!partnerId) return;

    const partnerMeta = userMeta.get(partnerId);
    if (partnerMeta) {
      partnerMeta.reports += 1;
      console.log(
        `[report] ${partnerId} reported by ${socket.id} for: ${reason} (total: ${partnerMeta.reports})`
      );

      // Auto-block after 5 reports
      if (partnerMeta.reports >= 5) {
        blockedIPs.add(partnerMeta.ip);
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit("blocked");
          partnerSocket.disconnect(true);
        }
      }
    }

    socket.emit("reportConfirmed");
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[disconnect] ${socket.id} — ${reason}`);

    removeFromQueue(socket.id);
    const partnerId = disconnectPair(socket.id);
    if (partnerId) {
      io.to(partnerId).emit("partnerDisconnected");
      // Re-queue partner
      tryMatch(partnerId);
    }

    userMeta.delete(socket.id);
    broadcastOnlineCount();
  });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    online: io.engine.clientsCount,
    waiting: waitingQueue.length,
    pairs: activePairs.size / 2,
  });
});

app.get("/api/stats", (req, res) => {
  res.json({
    online: io.engine.clientsCount,
    waiting: waitingQueue.length,
    activePairs: activePairs.size / 2,
  });
});

// ─── CATCH-ALL (SPA) ──────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"));
});

// ─── START ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Hyvigle server running on port ${PORT}`);
});

module.exports = { app, server, io };
