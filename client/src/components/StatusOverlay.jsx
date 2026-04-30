import React from "react";
import styles from "./StatusOverlay.module.css";

export default function StatusOverlay({ status, mode, onRetry }) {
  if (status === "requesting") {
    return (
      <div className={styles.overlay}>
        <div className={styles.spinner} />
        <p className={styles.title}>Requesting permissions...</p>
        <p className={styles.sub}>Please allow camera and microphone access.</p>
      </div>
    );
  }

  if (status === "searching") {
    return (
      <div className={styles.overlay}>
        <div className={styles.searchAnim}>
          <div className={styles.ring} style={{ animationDelay: "0s" }} />
          <div className={styles.ring} style={{ animationDelay: "0.5s" }} />
          <div className={styles.ring} style={{ animationDelay: "1s" }} />
          <div className={styles.dot} />
        </div>
        <p className={styles.title}>Finding a stranger...</p>
        <p className={styles.sub}>
          {mode === "audio" ? "Audio-only" : "Video"} match · Please wait
        </p>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className={styles.overlay}>
        <div className={styles.icon}>👋</div>
        <p className={styles.title}>Stranger disconnected</p>
        <p className={styles.sub}>Finding you a new match...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.overlay}>
        <div className={styles.errorIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className={styles.title}>Permission denied</p>
        <p className={styles.sub}>Camera/microphone access is required.</p>
        <button className={styles.retryBtn} onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  return null;
}
