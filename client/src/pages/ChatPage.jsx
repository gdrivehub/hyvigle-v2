import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useSocket } from "../hooks/useSocket.js";
import { useWebRTC } from "../hooks/useWebRTC.js";
import StatusOverlay from "../components/StatusOverlay.jsx";
import styles from "./ChatPage.module.css";

export default function ChatPage({ mode = "video", onExit }) {
  const isVideo = mode === "video";
  const isText  = mode === "text";

  const [status, setStatus]               = useState(isText ? "searching" : "requesting");
  const [messages, setMessages]           = useState([]);
  const [onlineCount, setOnlineCount]     = useState(0);
  const [reportSent, setReportSent]       = useState(false);
  const [input, setInput]                 = useState("");
  const [confirmReport, setConfirmReport] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const bottomRef     = useRef(null);
  const inputRef      = useRef(null);

  const isConnected = status === "connected";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const socketHandlers = {
    connect:   () => console.log("[socket] connected"),
    waiting:   () => setStatus("searching"),
    matched: ({ initiator }) => {
      setStatus("connected");
      setMessages([{ text: "You are now connected to a stranger. Say hi! 👋", from: "system", ts: Date.now() }]);
      setReportSent(false);
      if (initiator && isVideo) setTimeout(() => startCall(), 300);
    },
    offer:               (data) => handleOffer(data),
    answer:              (data) => handleAnswer(data),
    iceCandidate:        (data) => handleIceCandidate(data),
    chatMessage:         (msg)  => setMessages((prev) => [...prev, msg]),
    partnerDisconnected: () => {
      if (isVideo) closeConnection();
      setMessages((prev) => [...prev, { text: "Stranger has disconnected.", from: "system", ts: Date.now() }]);
      setStatus("disconnected");
    },
    onlineCount:     (n) => setOnlineCount(n),
    reportConfirmed: ()  => setReportSent(true),
    blocked: () => { alert("You have been blocked."); onExit(); },
    disconnect: () => setStatus("idle"),
  };

  const { emit } = useSocket(socketHandlers);

  const {
    getLocalStream, startCall, handleOffer, handleAnswer, handleIceCandidate,
    closeConnection, stopLocalStream, toggleVideo, toggleAudio, mediaState,
  } = useWebRTC({ emit, localVideoRef, remoteVideoRef });

  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (isText) { emit("joinQueue", { mode }); return; }
      try {
        await getLocalStream("video");
        if (!cancelled) { setStatus("searching"); emit("joinQueue", { mode }); }
      } catch { if (!cancelled) setStatus("error"); }
    }
    init();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line

  useEffect(() => {
    return () => { if (isVideo) { closeConnection(); stopLocalStream(); } };
  }, []); // eslint-disable-line

  const handleSkip = useCallback(() => {
    if (isVideo) closeConnection();
    setMessages([]);
    setReportSent(false);
    setStatus("searching");
    emit("skip");
  }, [closeConnection, emit, isVideo]);

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

  const handleReport = useCallback(() => {
    if (!confirmReport) {
      setConfirmReport(true);
      setTimeout(() => setConfirmReport(false), 3000);
      return;
    }
    emit("report", { reason: "inappropriate" });
    setConfirmReport(false);
  }, [confirmReport, emit]);

  const handleExit = () => {
    if (isVideo) { closeConnection(); stopLocalStream(); }
    onExit();
  };

  return (
    <div className={styles.page}>

      {/* HEADER */}
      <header className={styles.header}>
        <button className={styles.logo} onClick={handleExit}>hyvigle</button>

        <div className={styles.statusPill} data-status={status}>
          <span className={styles.statusDot} data-status={status} />
          {status === "requesting"   && "Requesting camera…"}
          {status === "searching"    && "Finding a stranger…"}
          {status === "connected"    && "Connected"}
          {status === "disconnected" && "Disconnected"}
          {status === "error"        && "Permission denied"}
        </div>

        {onlineCount > 0 && (
          <div className={styles.onlineCount}>
            <span className={styles.onlineDot} />
            {onlineCount.toLocaleString()}+ online
          </div>
        )}
      </header>

      {/* BODY */}
      <div className={`${styles.body} ${isText ? styles.textOnlyBody : ""}`}>

        {/* LEFT: Videos */}
        {isVideo && (
          <div className={styles.videoCol}>

            {/* Stranger video */}
            <div className={styles.videoBox}>
              <video ref={remoteVideoRef} className={styles.video} autoPlay playsInline />
              <div className={styles.videoLabel}>Stranger</div>
              <button
                className={`${styles.flagBtn} ${confirmReport ? styles.flagWarn : ""} ${reportSent ? styles.flagDone : ""}`}
                onClick={handleReport}
                disabled={reportSent || !isConnected}
              >
                {reportSent
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                }
                {reportSent ? "Reported" : confirmReport ? "Confirm?" : "Report"}
              </button>
              {!isConnected && (
                <StatusOverlay status={status} mode={mode} onRetry={() => { setStatus("searching"); emit("joinQueue", { mode }); }} />
              )}
            </div>

            {/* Local video */}
            <div className={styles.videoBox}>
              <video ref={localVideoRef} className={`${styles.video} ${styles.mirror}`} autoPlay playsInline muted />
              {!mediaState.videoEnabled && (
                <div className={styles.camOff}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10M1 1l22 22"/></svg>
                  <span>Camera off</span>
                </div>
              )}
              <div className={styles.videoLabel}>You</div>
            </div>

          </div>
        )}

        {/* RIGHT: Chat */}
        <div className={styles.chatCol}>

          {isText && !isConnected && (
            <div className={styles.textSearching}>
              <div className={styles.searchDots}>
                <span /><span /><span />
              </div>
              <p>Finding a stranger to chat with…</p>
            </div>
          )}

          {/* Messages */}
          <div className={styles.messages}>
            {messages.length === 0 && isConnected && (
              <div className={styles.empty}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                <p>Say something!</p>
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

          {/* Input + controls */}
          <div className={styles.inputArea}>
            <div className={styles.inputRow}>
              <input
                ref={inputRef}
                className={styles.input}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isConnected ? "Type a message…" : "Waiting for connection…"}
                disabled={!isConnected}
                maxLength={500}
                autoComplete="off"
              />
              <button className={styles.sendBtn} onClick={handleSend} disabled={!isConnected || !input.trim()}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>

            <div className={styles.controls}>
              <button className={styles.nextBtn} onClick={handleSkip}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Next
              </button>

              {isVideo && (
                <>
                  <button className={`${styles.ctrlBtn} ${!mediaState.audioEnabled ? styles.ctrlOff : ""}`} onClick={toggleAudio} title={mediaState.audioEnabled ? "Mute" : "Unmute"}>
                    {mediaState.audioEnabled
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/><path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 1.02-.21 2-.59 2.9M12 19v4M8 23h8"/></svg>
                    }
                    <span>{mediaState.audioEnabled ? "Mute" : "Unmute"}</span>
                  </button>

                  <button className={`${styles.ctrlBtn} ${!mediaState.videoEnabled ? styles.ctrlOff : ""}`} onClick={toggleVideo} title={mediaState.videoEnabled ? "Camera off" : "Camera on"}>
                    {mediaState.videoEnabled
                      ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14v-4z"/><rect x="3" y="8" width="12" height="8" rx="2"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10M1 1l22 22"/></svg>
                    }
                    <span>{mediaState.videoEnabled ? "Cam off" : "Cam on"}</span>
                  </button>
                </>
              )}

              {isText && (
                <button
                  className={`${styles.ctrlBtn} ${styles.reportBtnText} ${confirmReport ? styles.ctrlOff : ""} ${reportSent ? styles.ctrlDone : ""}`}
                  onClick={handleReport}
                  disabled={reportSent || !isConnected}
                >
                  {reportSent
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                  }
                  <span>{reportSent ? "Reported" : confirmReport ? "Confirm?" : "Report"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
