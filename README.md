# 🟢 Hyvigle

> Anonymous real-time video & text chat. Talk to strangers, instantly.

[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-orange)](https://webrtc.org)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4-black)](https://socket.io)
[![Deployed on Koyeb](https://img.shields.io/badge/Deployed-Koyeb-purple)](https://koyeb.com)

**Live Demo:** https://specified-olivia-manrisky73-fafba554.koyeb.app/

---
Here is Deployed version of Hyvigle: 
Link - https://specified-olivia-manrisky73-fafba554.koyeb.app/


## ✨ Features

- 🎥 **Video Chat** — WebRTC P2P face-to-face with strangers
- 💬 **Text Only mode** — anonymous text chat, no camera needed
- ⚡ **Instant random matching** — FIFO queue, one-to-one pairing
- 🔄 **Auto-reconnect** — when a stranger disconnects, automatically finds next match
- ▶️ **Start / Next (Esc) / Stop** — full control over your session
- 🚩 **Report system** — auto-block after repeated reports
- 🌗 **Dark & Light mode** — toggle from any screen, preference saved
- 🔒 **Anonymous** — no sign-up, no tracking, no stored video/audio
- 📱 **Responsive** — works on mobile and desktop
- 🌍 **Online counter** — see live user count

---

## 🗂️ Project Structure

```
hyvigle/
├── Dockerfile                        # Docker build for Koyeb
├── Procfile                          # Fallback start command
├── package.json                      # Root — server deps + build scripts
├── server/
│   ├── index.js                      # Express + Socket.IO signaling server
│   └── package.json
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx                   # Theme state + routing
        ├── main.jsx
        ├── styles/
        │   └── global.css            # CSS variables (dark + light themes)
        ├── hooks/
        │   ├── useSocket.js          # Socket.IO connection
        │   └── useWebRTC.js          # RTCPeerConnection + media
        ├── pages/
        │   ├── HomePage.jsx          # Landing — mode selector + theme toggle
        │   ├── HomePage.module.css
        │   ├── ChatPage.jsx          # Main chat (video left / chat right)
        │   └── ChatPage.module.css
        └── components/
            ├── ThemeToggle.jsx       # Dark/light mode button
            ├── ThemeToggle.module.css
            ├── StatusOverlay.jsx     # Searching/idle/error overlay on video
            └── StatusOverlay.module.css
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites
- Node.js 20+
- npm 9+

### 1. Clone

```bash
git clone https://github.com/gdrivehub/hyvigle-v2.git
cd hyvigle-v2
```

### 2. Install dependencies

```bash
# Root (server deps)
npm install

# Client
cd client && npm install && cd ..
```

### 3. Run

```bash
# Terminal 1 — backend (port 4000)
npm run dev:server

# Terminal 2 — frontend (port 3000)
npm run dev:client
```

Open **two browser windows** at `http://localhost:3000` to test matching.

---

## 🌐 Deploy to Koyeb

### Step 1 — Push to GitHub
```bash
git add .
git commit -m "update"
git push
```

### Step 2 — Create Koyeb Service
1. Go to [app.koyeb.com](https://app.koyeb.com)
2. **Create Service → GitHub → select repo**
3. Set **Builder** to **Dockerfile**
4. Leave run command blank (Dockerfile CMD handles it)
5. Set port to **4000**
6. Health check path: `/api/health`

### Step 3 — Environment Variables
```
ALLOWED_ORIGINS=https://your-app.koyeb.app
```
> `PORT` is auto-set by Koyeb — do not set it manually.

### Step 4 — Deploy 🚀

---

## 🔧 Environment Variables

| Variable | Where | Default | Description |
|---|---|---|---|
| `PORT` | Server | `4000` | Auto-set by Koyeb |
| `ALLOWED_ORIGINS` | Server | `http://localhost:3000` | Comma-separated CORS origins |
| `VITE_SERVER_URL` | Client `.env` | (same origin) | Backend URL for local dev |

---

## 🏗️ Architecture

```
Browser A                    Server (Koyeb)               Browser B
   │                               │                           │
   │── joinQueue ─────────────────►│                           │
   │                               │◄─── joinQueue ────────────│
   │◄── matched (initiator=true) ──│                           │
   │                               │──── matched (false) ─────►│
   │── offer ─────────────────────►│──── offer ───────────────►│
   │                               │◄─── answer ───────────────│
   │◄── answer ────────────────────│                           │
   │◄──────── ICE candidates ──────┼──────────────────────────►│
   │                               │                           │
   │◄═══════════════ P2P WebRTC (direct, no server relay) ════►│
```

**Key design decisions:**
- Server is signaling-only — no media passes through it
- FIFO queue for fair matching
- On disconnect → auto-reconnect after 1.5s delay
- On skip → partner is immediately re-queued
- Theme stored in `localStorage`, applied to `<html data-theme>`

---

## 🔄 Connection Flow

```
User opens site
    │
    ▼
Home page — picks Video or Text mode
    │
    ▼
Clicks "Start"
    │
    ├─ Video mode → request camera/mic → join queue
    └─ Text mode  → join queue directly
    │
    ▼
"Finding a stranger…" (searching state)
    │
    ▼
Matched → WebRTC offer/answer exchange (video) or direct chat (text)
    │
    ▼
Connected — chat, skip, mute, report
    │
    ├─ Stranger disconnects → auto-search after 1.5s
    ├─ Click "Next / Esc"  → skip, find next immediately
    └─ Click "Stop"        → idle state, manual restart needed
```

---

## 🔒 Security & Privacy

- No video/audio stored anywhere
- No user accounts or personal data collected
- Rate limiting: 60 req/min per IP
- Report system: auto-block IP after 5 reports
- HTTPS enforced in production (Koyeb + WebRTC requirement)
- Socket IDs are ephemeral per session

---

## 🎛️ WebRTC ICE Configuration

Default (free, included):
```js
{ urls: "stun:stun.l.google.com:19302" }
{ urls: "stun:stun1.l.google.com:19302" }
{ urls: "stun:stun.cloudflare.com:3478" }
```

For ~98% connection reliability in production, add TURN servers in `client/src/hooks/useWebRTC.js`:
```js
{
  urls: "turn:relay.metered.ca:80",
  username: "YOUR_USERNAME",
  credential: "YOUR_CREDENTIAL"
}
```
Free TURN: [metered.ca](https://metered.ca) (50GB/month free tier)

---

## 🧪 Local Testing

1. `npm run dev:server` in one terminal
2. `npm run dev:client` in another
3. Open `http://localhost:3000` in **two separate browser windows**
4. Click Start in both → they should match within seconds

---

## 📄 License

MIT — free to use, modify, and deploy.
