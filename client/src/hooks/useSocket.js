/**
 * useSocket — Manages Socket.IO connection lifecycle
 */
import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:4000");

export function useSocket(handlers = {}) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);

  // Keep handlers up to date without re-connecting
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Proxy all events to current handlers
    const events = [
      "connect",
      "disconnect",
      "waiting",
      "matched",
      "offer",
      "answer",
      "iceCandidate",
      "chatMessage",
      "partnerDisconnected",
      "onlineCount",
      "reportConfirmed",
      "blocked",
      "error",
    ];

    events.forEach((ev) => {
      socket.on(ev, (...args) => {
        const handler = handlersRef.current[ev];
        if (handler) handler(...args);
      });
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []); // only mount once

  const emit = useCallback((event, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  return { socketRef, emit };
}
