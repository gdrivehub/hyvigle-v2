# 🟢 Hyvigle

> Anonymous real-time video & audio chat. Talk to strangers, instantly.

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18-blue)
![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black)

---

## ✨ Features

- 🎥 **Video + Audio Chat** — WebRTC P2P, no plugins needed
- 🎙️ **Audio-only mode** — for privacy or low bandwidth
- ⚡ **Instant random matching** — FIFO queue, one-to-one pairing
- ⏭️ **Skip / Next** — instantly move to next stranger
- 💬 **Text chat** — real-time alongside video/audio
- 🚩 **Report system** — with auto-block after repeated reports
- 🔒 **Anonymous** — no signup, no tracking, no stored video
- 📱 **Responsive** — works on mobile and desktop
- 🌍 **Online counter** — see how many people are connected

---

## 🗂️ Project Structure

```
hyvigle/
├── server/               # Node.js + Express + Socket.IO signaling server
│   ├── index.js          # Main server (WebRTC signaling, queue, sessions)
│   ├── package.json
│   └── .env.example
├── client/               # React (Vite) frontend
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   ├── hooks/
│   │   │   ├── useSocket.js   # Socket.IO connection management
│   │   │   └── useWebRTC.js   # RTCPeerConnection management
│   │   ├── pages/
│   │   │   ├── HomePage.jsx   # Landing page with mode selector
│   │   │   └── ChatPage.jsx   # Main chat interface
│   │   ├── components/
│   │   │   ├── Controls.jsx       # Control bar (skip, mute, camera, report)
│   │   │   ├── TextChat.jsx       # Text chat panel
│   │   │   └── StatusOverlay.jsx  # Searching/disconnected states
│   │   └── styles/
│   │       └── global.css
│   ├── index.html
│   ├── vite.config.js
│   └── .env.example
├── package.json          # Root monorepo scripts
├── Procfile              # Koyeb/Heroku start command
└── README.md
```

---

## 🚀 Quick Start (Local)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone and install

```bash
git clone https://github.com/yourname/hyvigle.git
cd hyvigle

# Install all dependencies
npm run install:all
```

### 2. Configure environment

```bash
# Server
cp server/.env.example server/.env
# Edit PORT and ALLOWED_ORIGINS as needed

# Client
cp client/.env.example client/.env
# Set VITE_SERVER_URL=http://localhost:4000
```

### 3. Run development servers

```bash
# Terminal 1 — backend
npm run dev:server

# Terminal 2 — frontend
npm run dev:client
```

Open http://localhost:3000 in **two browser windows** to test matching.

---

## 🌐 Deploy to Koyeb

Koyeb lets you run the full-stack app as a single service (server serves the built React client).

### Step 1: Build the client first locally (or in CI)

```bash
npm run build:client
# Outputs to client/dist/ which server/index.js serves statically
```

### Step 2: Push to GitHub

```bash
git add .
git commit -m "Initial deployment"
git push origin main
```

### Step 3: Create Koyeb service

1. Go to [app.koyeb.com](https://app.koyeb.com)
2. Click **Create Service** → **GitHub**
3. Select your repository
4. Configure:
   - **Runtime**: Node.js
   - **Build command**: `npm run install:all && npm run build:client`
   - **Run command**: `node server/index.js`
   - **Port**: `4000`
   - **Health check path**: `/api/health`

### Step 4: Set environment variables

In Koyeb dashboard → Environment Variables:

```
ALLOWED_ORIGINS=https://your-app-name.koyeb.app
```

> **Note**: `PORT` is automatically set by Koyeb.

### Step 5: Deploy!

Koyeb will build and deploy. Your app will be live at `https://your-app-name.koyeb.app`.

---

## 🔧 Environment Variables

### Server (`server/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4000` | Server port |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |

### Client (`client/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_SERVER_URL` | (same origin) | Backend URL for Socket.IO |

---

## 🏗️ Architecture

```
Browser A                    Server                    Browser B
   │                           │                           │
   │── joinQueue ─────────────►│                           │
   │                           │◄─── joinQueue ────────────│
   │◄── matched(initiator) ────│                           │
   │                           │──── matched(receiver) ───►│
   │── offer ─────────────────►│──── offer ───────────────►│
   │                           │◄─── answer ───────────────│
   │◄── answer ────────────────│                           │
   │── iceCandidate ──────────►│── iceCandidate ──────────►│
   │◄─── iceCandidate ─────────│◄── iceCandidate ──────────│
   │                           │                           │
   │◄═══════════ P2P WebRTC stream (direct) ══════════════►│
```

**Key design decisions:**
- Server handles signaling only — no media passes through it
- FIFO queue ensures fair matching
- When a user skips, their partner is immediately re-queued
- Disconnections are handled gracefully at all stages

---

## 🔒 Security & Privacy

- No video/audio stored on server
- No user accounts or PII collected  
- Rate limiting: 60 req/min per IP
- Report system with auto-block at 5 reports
- HTTPS required in production (enforced by Koyeb/browser WebRTC policy)
- Socket IDs are ephemeral, regenerated each session

---

## 🎛️ WebRTC ICE Servers

By default, Hyvigle uses Google and Cloudflare STUN servers (free):

```js
{ urls: "stun:stun.l.google.com:19302" }
{ urls: "stun:stun1.l.google.com:19302" }
{ urls: "stun:stun.cloudflare.com:3478" }
```

For production at scale, add TURN servers (e.g. Twilio or Coturn) to handle NAT traversal. Update `ICE_SERVERS` in `client/src/hooks/useWebRTC.js`:

```js
{
  urls: "turn:your-turn-server.com:3478",
  username: "user",
  credential: "password"
}
```

---

## 🧪 Testing

Open two browser tabs to test locally:
1. Tab 1: `http://localhost:3000` → Click Start
2. Tab 2: `http://localhost:3000` → Click Start
3. Both should match and connect!

---

## 📄 License

MIT — Use freely, modify, and deploy!
