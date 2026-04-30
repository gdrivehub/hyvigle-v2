import React, { useState } from "react";
import HomePage from "./pages/HomePage.jsx";
import ChatPage from "./pages/ChatPage.jsx";

export default function App() {
  const [page, setPage] = useState("home"); // "home" | "chat"
  const [chatMode, setChatMode] = useState("video");

  const handleStart = (mode) => {
    setChatMode(mode);
    setPage("chat");
  };

  const handleExit = () => {
    setPage("home");
  };

  if (page === "chat") {
    return <ChatPage mode={chatMode} onExit={handleExit} />;
  }

  return <HomePage onStart={handleStart} />;
}
