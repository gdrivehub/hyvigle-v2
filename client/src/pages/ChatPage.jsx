import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSocket } from "../hooks/useSocket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";
import StatusOverlay from "../components/StatusOverlay.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";
import styles from "./ChatPage.module.css";

/**
 * Chat states:
 * idle        → landed, not started
 * requesting  → asking camera/mic permission
 * searching   → in queue, waiting for match
 * connected   → paired with a stranger
 * disconnected→ partner left, will auto-reconnect
 * stopped     → user manually stopped, back to idle
 * error       → permission denied
 */

const AUTO_RECONNECT_DELAY = 1500; // ms before auto-searching after disconnect

export default function ChatPage({ mode, onExit, theme, toggleTheme }) {
  const isVideo = mode === "video";
  const isText  = mode === "text";

  const [status, setStatus]               = useState("idle");
  const [messages, setMessages]           = useState([]);
  const [onlineCount, setOnlineCount]     = useState(0);
  const [reportSent, setReportSent]       = useState(false);
  const [input, setInput]                 = useState("");
  const [confirmReport, setConfirmReport] = useState(false);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const bottomRef      = useRef(null);
  const inputRef       = useRef(null);
  const reconnectTimer = useRef(null);

  const isConnected  = status === "connected";
  const isSearching  = status === "searching";
  const isStopped    = status === "stopped" || status === "idle";

  // Auto-scroll chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup reconnect timer on unmount
  useEffect(() => () => clearTimeout(reconnectTimer.current), []);

  // ── Socket handlers ─────────────────────────────────────────────────────
  const socketHandlers = {
    connect: () => console.log("[socket] connected"),
    waiting: () => setStatus("searching"),

    matched: ({ initiator }) => {
      clearTimeout(reconnectTimer.current);
      setStatus("connected");
      setMessages([{
        text: "You are now connected to a stranger. Say hi! 👋",
        from: "system", ts: Date.now()
      }]);
      setReportSent(false);
      setConfirmReport(false);
      if (initiator && isVideo) setTimeout(() => startCall(), 300);
    },

    offer:        (data) => handleOffer(data),
    answer:       (data) => handleAnswer(data),
    iceCandidate: (data) => handleIceCandidate(data),

    chatMessage: (msg) =>
      setMessages((prev) => [...prev, msg]),

    partnerDisconnected: () => {
      if (isVideo) closeConnection();
      setMessages((prev) => [
        ...prev,
        { text: "Stranger disconnected. Finding a new match…", from: "system", ts: Date.now() }
      ]);
      setStatus("disconnected");
      // Auto-reconnect after short delay
      reconnectTimer.current = setTimeout(() => {
        setStatus("searching");
        emitRef.current("joinQueue", { mode });
      }, AUTO_RECONNECT_DELAY);
    },

    onlineCount:     (n) => setOnlineCount(n),
    reportConfirmed: ()  => setReportSent(true),
    blocked: () => { alert("You have been blocked due to multiple reports."); onExit(); },
    disconnect: () => {
      if (status !== "stopped") setStatus("idle");
    },
  };

  const { emit } = useSocket(socketHandlers);

  // Keep a ref to emit so closures (setTimeout) always call latest version
  const emitRef = useRef(emit);
  useEffect(() => { emitRef.current = emit; }, [emit]);

  const {
    getLocalStream, startCall, handleOffer, handleAnswer, handleIceCandidate,
    closeConnection, stopLocalStream, toggleVideo, toggleAudio, mediaState,
  } = useWebRTC({ emit, localVideoRef, remoteVideoRef });

  // ── Start searching ──────────────────────────────────────────────────────
  const startSearching = useCallback(async () => {
    clearTimeout(reconnectTimer.current);
    setMessages([]);
    setReportSent(false);

    if (isText) {
      setStatus("searching");
      emit("joinQueue", { mode });
      return;
    }

    // Video mode — get media first if not already
    try {
      setStatus("requesting");
      await getLocalStream("video");
      setStatus("searching");
      emit("joinQueue", { mode });
    } catch {
      setStatus("error");
    }
  }, [isText, mode, emit, getLocalStream]);

  // ── Skip (next stranger) ─────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    if (isVideo) closeConnection();
    setMessages([]);
    setReportSent(false);
    setConfirmReport(false);
    setStatus("searching");
    emit("skip");
  }, [isVideo, closeConnection, emit]);

  // ── Stop completely ──────────────────────────────────────────────────────
  const handleStop = useCallback(() => {
    clearTimeout(reconnectTimer.current);
    if (isVideo) closeConnection();
    setStatus("stopped");
    setMessages([]);
    emit("skip"); // removes from queue / disconnects partner
  }, [isVideo, closeConnection, emit]);

  // ── Send chat message ────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || !isConnected) return;
    emit("chatMessage", { text });
    setMessages((prev) => [...prev, { text, from: "me", ts: Date.now() }]);
    setInput("");
    inputRef.current?.focus();
  }, [input, isConnected, emit]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Report ───────────────────────────────────────────────────────────────
  const handleReport = useCallback(() => {
    if (!confirmReport) {
      setConfirmReport(true);
      setTimeout(() => setConfirmReport(false), 3000);
      return;
    }
    emit("report", { reason: "inappropriate" });
    setConfirmReport(false);
  }, [confirmReport, emit]);

  // ── Exit to home ─────────────────────────────────────────────────────────
  const handleExit = () => {
    clearTimeout(reconnectTimer.current);
    if (isVideo) { closeConnection(); stopLocalStream(); }
    onExit();
  };

  // ── Derived UI state ─────────────────────────────────────────────────────
  const statusLabel = {
    idle:         "Ready",
    requesting:   "Requesting camera…",
    searching:    "Finding a stranger…",
    connected:    "Connected",
    disconnected: "Reconnecting…",
    stopped:      "Stopped",
    error:        "Permission denied",
  }[status] || "";

  const statusColor = {
    connected:    "green",
    searching:    "blue",
    disconnected: "yellow",
    requesting:   "yellow",
    error:        "red",
    stopped:      "gray",
    idle:         "gray",
  }[status];

  return (
    <div className={styles.page}>

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className={styles.header}>
        <button className={styles.logo} onClick={handleExit} title="Back to home">
          hyvigle
        </button>

        <div className={styles.statusPill}>
          <span className={styles.statusDot} data-color={statusColor} />
          <span>{statusLabel}</span>
        </div>

        <div className={styles.headerRight}>
          {onlineCount > 0 && (
            <div className={styles.onlineCount}>
              <span className={styles.onlineDot} />
              {onlineCount.toLocaleString()}+ online
            </div>
          )}
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      {/* ── BODY ──────────────────────────────────────────────────────────── */}
      <div className={`${styles.body} ${isText ? styles.textOnlyBody : ""}`}>

        {/* LEFT: Video column */}
        {isVideo && (
          <div className={styles.videoCol}>

            {/* Stranger video */}
            <div className={styles.videoBox}>
              <video ref={remoteVideoRef} className={styles.video} autoPlay playsInline />
              <div className={styles.videoLabel}>Stranger</div>
              {isConnected && (
                <button
                  className={`${styles.flagBtn} ${confirmReport ? styles.flagWarn : ""} ${reportSent ? styles.flagDone : ""}`}
                  onClick={handleReport}
                  disabled={reportSent}
                >
                  {reportSent
                    ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> Reported</>
                    : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> {confirmReport ? "Confirm?" : "Report"}</>
                  }
                </button>
              )}
              {!isConnected && (
                <StatusOverlay
                  status={status}
                  mode={mode}
                  onStart={startSearching}
                  onRetry={startSearching}
                />
              )}
            </div>

            {/* Local video */}
            <div className={styles.videoBox}>
              <video ref={localVideoRef} className={`${styles.video} ${styles.mirror}`} autoPlay playsInline muted />
              {!mediaState.videoEnabled && (
                <div className={styles.camOff}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10M1 1l22 22"/>
                  </svg>
                  <span>Camera off</span>
                </div>
              )}
              <div className={styles.videoLabel}>You</div>
            </div>
          </div>
        )}

        {/* RIGHT: Chat column */}
        <div className={styles.chatCol}>

          {/* Messages */}
          <div className={styles.messages}>
            {isStopped && (
              <div className={styles.idleState}>
                <div className={styles.idleIcon}>
                  {isText
                    ? <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="8" width="12" height="8" rx="2"/></svg>
                  }
                </div>
                <p className={styles.idleTitle}>Ready to chat?</p>
                <p className={styles.idleSub}>Click <strong>Start</strong> to find a stranger.</p>
              </div>
            )}

            {messages.map((msg, i) =>
              msg.from === "system" ? (
                <div key={i} className={styles.sysMsg}>{msg.text}</div>
              ) : (
                <div key={i} className={`${styles.msg} ${msg.from === "me" ? styles.me : styles.them}`}>
                  <span className={styles.who}>{msg.from === "me" ? "You" : "Stranger"}</span>
                  <div className={styles.bubble}>{msg.text}</div>
                  <span className={styles.ts}>
                    {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              )
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={styles.inputArea}>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConnected ? "Type a message… (Enter to send)" : "Waiting for connection…"}
                disabled={!isConnected}
                maxLength={500}
                autoComplete="off"
              />
              <button className={styles.sendBtn} onClick={handleSend} disabled={!isConnected || !input.trim()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            {/* ── Controls ── */}
            <div className={styles.controls}>

              {/* START — shown when idle/stopped/error */}
              {(isStopped || status === "error") && (
                <button className={styles.startBtn} onClick={startSearching}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                  Start
                </button>
              )}

              {/* ESC (skip) + STOP — shown when searching or connected */}
              {(isSearching || isConnected || status === "disconnected") && (
                <>
                  <button className={styles.escBtn} onClick={handleSkip} title="Skip to next stranger">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span>Next</span>
                    <kbd className={styles.kbd}>Esc</kbd>
                  </button>

                  <button className={styles.stopBtn} onClick={handleStop} title="Stop chatting">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2"/>
                    </svg>
                    Stop
                  </button>
                </>
              )}

              {/* Spacer */}
              <div className={styles.controlSpacer} />

              {/* Mute + Camera (video mode) */}
              {isVideo && isConnected && (
                <>
                  <button
                    className={`${styles.ctrlBtn} ${!mediaState.audioEnabled ? styles.ctrlOff : ""}`}
                    onClick={toggleAudio}
                    title={mediaState.audioEnabled ? "Mute microphone" : "Unmute microphone"}
                  >
                    {mediaState.audioEnabled
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 1.02-.21 2-.59 2.9M12 19v4M8 23h8"/></svg>
                    }
                    <span>{mediaState.audioEnabled ? "Mute" : "Unmute"}</span>
                  </button>

                  <button
                    className={`${styles.ctrlBtn} ${!mediaState.videoEnabled ? styles.ctrlOff : ""}`}
                    onClick={toggleVideo}
                    title={mediaState.videoEnabled ? "Turn off camera" : "Turn on camera"}
                  >
                    {mediaState.videoEnabled
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="8" width="12" height="8" rx="2"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10M1 1l22 22"/></svg>
                    }
                    <span>{mediaState.videoEnabled ? "Cam off" : "Cam on"}</span>
                  </button>
                </>
              )}

              {/* Report (text mode) */}
              {isText && isConnected && (
                <button
                  className={`${styles.ctrlBtn} ${confirmReport ? styles.ctrlWarn : ""} ${reportSent ? styles.ctrlDone : ""}`}
                  onClick={handleReport}
                  disabled={reportSent}
                >
                  {reportSent
                    ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg><span>Reported</span></>
                    : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg><span>{confirmReport ? "Confirm?" : "Report"}</span></>
                  }
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
