import React, { useState } from "react";
import styles from "./HomePage.module.css";

export default function HomePage({ onStart }) {
  const [mode, setMode] = useState("video");

  return (
    <div className={styles.page}>
      <div className={styles.grid} aria-hidden />

      <main className={styles.hero}>
        <div className={styles.badge}>Anonymous · Real-time · Free</div>

        <h1 className={styles.title}>
          <span className={styles.titleAccent}>hyvigle</span>
        </h1>

        <p className={styles.tagline}>
          Talk to strangers.<br />
          Instantly. Anonymously.
        </p>

        {/* Mode selector */}
        <div className={styles.modeSelector} role="group" aria-label="Chat mode">

          <button
            className={`${styles.modeBtn} ${mode === "video" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("video")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14v-4z"/>
              <rect x="3" y="8" width="12" height="8" rx="2"/>
            </svg>
            Video Chat
          </button>

          <button
            className={`${styles.modeBtn} ${mode === "text" ? styles.modeBtnActive : ""}`}
            onClick={() => setMode("text")}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            Text Only
          </button>

        </div>

        {/* Mode description */}
        <p className={styles.modeDesc}>
          {mode === "video"
            ? "Share your webcam and talk face-to-face with a stranger."
            : "Chat anonymously via text only — no camera or mic needed."
          }
        </p>

        <button className={styles.startBtn} onClick={() => onStart(mode)}>
          <span>Start Chatting</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>

        <p className={styles.disclaimer}>
          By clicking Start, you agree to our{" "}
          <a href="#terms" className={styles.link}>Terms</a> and confirm you are 18+.
          Please be kind and respectful.
        </p>

        <div className={styles.features}>
          <div className={styles.feature}><span>⚡</span> Instant matching</div>
          <div className={styles.feature}><span>🔒</span> No sign-up</div>
          <div className={styles.feature}><span>🌍</span> Global strangers</div>
        </div>
      </main>

      <footer className={styles.footer}>
        <span>© 2025 Hyvigle</span>
        <span className={styles.dot}>·</span>
        <a href="#privacy" className={styles.link}>Privacy</a>
        <span className={styles.dot}>·</span>
        <a href="#safety" className={styles.link}>Safety</a>
      </footer>
    </div>
  );
}
