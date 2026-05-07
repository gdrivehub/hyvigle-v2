import React, { useState, useEffect } from "react";
import HomePage from "./pages/HomePage.jsx";
import ChatPage from "./pages/ChatPage.jsx";

export default function App() {
  const [page, setPage]       = useState("home");
  const [chatMode, setChatMode] = useState("video");
  const [theme, setTheme]     = useState(() => {
    return localStorage.getItem("hyvigle-theme") || "dark";
  });

  // Apply theme to <html> element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("hyvigle-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  const handleStart = (mode) => {
    setChatMode(mode);
    setPage("chat");
  };

  const handleExit = () => setPage("home");

  if (page === "chat") {
    return <ChatPage mode={chatMode} onExit={handleExit} theme={theme} toggleTheme={toggleTheme} />;
  }

  return <HomePage onStart={handleStart} theme={theme} toggleTheme={toggleTheme} />;
}
