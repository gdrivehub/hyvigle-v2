import React, { useState } from "react";
import styles from "./Controls.module.css";

export default function Controls({
  onSkip,
  onToggleAudio,
  onToggleVideo,
  onReport,
  onToggleChat,
  audioEnabled,
  videoEnabled,
  isConnected,
  unread,
  reportSent,
  mode,
}) {
  const [confirmReport, setConfirmReport] = useState(false);

  const handleReport = () => {
    if (!confirmReport) {
      setConfirmReport(true);
      setTimeout(() => setConfirmReport(false), 3000);
      return;
    }
    onReport();
    setConfirmReport(false);
  };

  return (
    <div className={styles.bar}>
      {/* Skip/Next */}
      <button
        className={styles.skipBtn}
        onClick={onSkip}
        aria-label="Next stranger"
        title="Next stranger"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
        <span>Next</span>
      </button>

      <div className={styles.group}>
        {/* Mute */}
        <button
          className={`${styles.iconBtn} ${!audioEnabled ? styles.off : ""}`}
          onClick={onToggleAudio}
          aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"}
          title={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23"/>
              <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6"/>
              <path d="M17 16.95A7 7 0 015 12v-2m14 0v2c0 1.02-.21 2-.59 2.9M12 19v4M8 23h8"/>
            </svg>
          )}
        </button>

        {/* Camera toggle (video mode only) */}
        {onToggleVideo && (
          <button
            className={`${styles.iconBtn} ${!videoEnabled ? styles.off : ""}`}
            onClick={onToggleVideo}
            aria-label={videoEnabled ? "Turn off camera" : "Turn on camera"}
            title={videoEnabled ? "Camera off" : "Camera on"}
          >
            {videoEnabled ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14v-4z"/>
                <rect x="3" y="8" width="12" height="8" rx="2"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 16v1a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2h2m5.66 0H14a2 2 0 012 2v3.34l1 1L23 7v10M1 1l22 22"/>
              </svg>
            )}
          </button>
        )}

        {/* Chat */}
        <button
          className={styles.iconBtn}
          onClick={onToggleChat}
          aria-label="Toggle text chat"
          title="Text chat"
          style={{ position: "relative" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          {unread > 0 && (
            <span className={styles.badge}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>

        {/* Report */}
        <button
          className={`${styles.iconBtn} ${confirmReport ? styles.reportConfirm : ""} ${reportSent ? styles.reportSent : ""}`}
          onClick={handleReport}
          disabled={reportSent || !isConnected}
          aria-label="Report stranger"
          title={reportSent ? "Reported" : confirmReport ? "Click again to confirm" : "Report"}
        >
          {reportSent ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
              <line x1="4" y1="22" x2="4" y2="15"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
