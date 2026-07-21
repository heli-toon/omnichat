import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { ChatSession, Message, ProviderConfig } from "./types";
import { X } from "lucide-react";

export default function App() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("failover_chatbot_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    const nextVal = !isSidebarCollapsed;
    setIsSidebarCollapsed(nextVal);
    try {
      localStorage.setItem("failover_chatbot_sidebar_collapsed", String(nextVal));
    } catch (e) {
      console.warn("Could not cache sidebar preference:", e);
    }
  };

  // Sync online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Fetch backend API keys presence configurations
  const fetchProviderConfig = async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = await response.json();
        setProviderConfig(data);
      }
    } catch (err) {
      console.warn("Could not fetch provider key statuses from server:", err);
    }
  };

  useEffect(() => {
    fetchProviderConfig();
  }, []);

  // Initialize state from local storage (Offline Caching & Performance)
  useEffect(() => {
    // 1. Dark Mode initialization
    const cachedDark = localStorage.getItem("failover_chatbot_dark_mode");
    const isDark = cachedDark === null ? true : cachedDark === "true";
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // 2. Chat Sessions initialization
    const cachedSessions = localStorage.getItem("failover_chatbot_sessions");
    const cachedActiveId = localStorage.getItem("failover_chatbot_active_id");

    if (cachedSessions) {
      try {
        const parsed = JSON.parse(cachedSessions) as ChatSession[];
        setSessions(parsed);
        if (cachedActiveId && parsed.some((s) => s.id === cachedActiveId)) {
          setActiveSessionId(cachedActiveId);
        } else if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to parse cached chat sessions", e);
        createNewDefaultSession();
      }
    } else {
      createNewDefaultSession();
    }
  }, []);

  const saveSessions = (updated: ChatSession[]) => {
    localStorage.setItem("failover_chatbot_sessions", JSON.stringify(updated));
  };

  const createNewDefaultSession = () => {
    const defaultSession: ChatSession = {
      id: "session-default-" + Date.now(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: "gemini",
      model: "gemini-3.5-flash",
      autoFailover: true,
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
    localStorage.setItem("failover_chatbot_sessions", JSON.stringify([defaultSession]));
    localStorage.setItem("failover_chatbot_active_id", defaultSession.id);
  };

  const handleNewSession = () => {
    const newSession: ChatSession = {
      id: "session-" + Date.now(),
      title: "New Conversation",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      provider: "gemini",
      model: "gemini-3.5-flash",
      autoFailover: true,
    };
    const nextSessions = [newSession, ...sessions];
    setSessions(nextSessions);
    setActiveSessionId(newSession.id);
    saveSessions(nextSessions);
    localStorage.setItem("failover_chatbot_active_id", newSession.id);
    setIsMobileSidebarOpen(false); // Auto close sidebar on mobile when creating
  };

  const handleDeleteSession = (id: string) => {
    const filtered = sessions.filter((s) => s.id !== id);
    setSessions(filtered);
    saveSessions(filtered);

    if (activeSessionId === id) {
      if (filtered.length > 0) {
        setActiveSessionId(filtered[0].id);
        localStorage.setItem("failover_chatbot_active_id", filtered[0].id);
      } else {
        // If all deleted, recreate one
        const emptySession: ChatSession = {
          id: "session-empty-" + Date.now(),
          title: "New Conversation",
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          provider: "gemini",
          model: "gemini-3.5-flash",
          autoFailover: true,
        };
        setSessions([emptySession]);
        setActiveSessionId(emptySession.id);
        saveSessions([emptySession]);
        localStorage.setItem("failover_chatbot_active_id", emptySession.id);
      }
    }
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    localStorage.setItem("failover_chatbot_active_id", id);
    setIsMobileSidebarOpen(false); // Auto close sidebar on mobile
  };

  const handleToggleDarkMode = () => {
    const nextMode = !darkMode;
    setDarkMode(nextMode);
    localStorage.setItem("failover_chatbot_dark_mode", String(nextMode));
    if (nextMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleUpdateSessionSettings = (
    provider: "gemini" | "nvidia" | "openrouter",
    model: string,
    autoFailover: boolean
  ) => {
    const updated = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          provider,
          model,
          autoFailover,
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });
    setSessions(updated);
    saveSessions(updated);
  };

  const handleSendMessage = async (
    content: string,
    provider: string,
    model: string,
    autoFailover: boolean
  ) => {
    if (!activeSessionId) return;

    const userMsg: Message = {
      id: "msg-user-" + Date.now(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    // Prepend locally instantly (lightning-fast interactivity feedback)
    const updatedSessions = sessions.map((s) => {
      if (s.id === activeSessionId) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          updatedAt: new Date().toISOString(),
        };
      }
      return s;
    });

    setSessions(updatedSessions);
    saveSessions(updatedSessions);
    setIsSending(true);

    try {
      const activeSessionObj = updatedSessions.find((s) => s.id === activeSessionId);
      if (!activeSessionObj) return;

      // Filter and map out standard properties for the endpoint payloads
      const payloadMessages = activeSessionObj.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: payloadMessages,
          provider,
          model,
          autoFailover,
        }),
      });

      if (!response.ok) {
        const errDetails = await response.json().catch(() => ({}));
        throw new Error(errDetails.error || `HTTP ${response.status}`);
      }

      const responseData = await response.json();

      const assistantMsg: Message = {
        id: "msg-assistant-" + Date.now(),
        role: "assistant",
        content: responseData.text,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        usedProvider: responseData.usedProvider,
        usedModel: responseData.usedModel,
        fallbackLog: responseData.fallbackLog,
      };

      const finalizedSessions = updatedSessions.map((s) => {
        if (s.id === activeSessionId) {
          // If the chat session was unnamed, dynamically derive a clean title from the user prompt
          const isFirstUserMessage = s.messages.filter((m) => m.role === "user").length === 1;
          const updatedTitle =
            isFirstUserMessage && s.title === "New Conversation"
              ? content.length > 26
                ? content.slice(0, 24) + "..."
                : content
              : s.title;

          return {
            ...s,
            title: updatedTitle,
            messages: [...s.messages, assistantMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });

      setSessions(finalizedSessions);
      saveSessions(finalizedSessions);
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      
      const assistantErrorMsg: Message = {
        id: "msg-error-" + Date.now(),
        role: "assistant",
        content: `⚠️ Failover Engine Warning:\nAll attempts to fulfill the request failed. \nReason: ${errMsg}\n\nPlease check server logs, verify your API keys are added in Secrets, or toggle "Auto-Failover" on to enable fallback to Google Gemini.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        usedProvider: "orchestrator",
        usedModel: "error-handler",
        fallbackLog: [`Fatal completion exception raised: ${errMsg}`],
      };

      const finalizedSessionsWithErr = updatedSessions.map((s) => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            messages: [...s.messages, assistantErrorMsg],
            updatedAt: new Date().toISOString(),
          };
        }
        return s;
      });

      setSessions(finalizedSessionsWithErr);
      saveSessions(finalizedSessionsWithErr);
    } finally {
      setIsSending(false);
    }
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  return (
    <div className="flex w-screen h-screen overflow-hidden bg-white dark:bg-[#0a0a0a] font-sans transition-colors duration-150">
      
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:block h-full shrink-0 transition-all duration-300 ease-in-out border-r border-stone-200 dark:border-white/5 ${isSidebarCollapsed ? "w-0 opacity-0 pointer-events-none overflow-hidden" : "w-80 opacity-100"}`}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          providerConfig={providerConfig}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          isOnline={isOnline}
          onRefreshConfig={fetchProviderConfig}
        />
      </aside>

      {/* Mobile Drawer Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Overlay mask */}
          <div 
            className="fixed inset-0 bg-stone-900/45 dark:bg-black/60 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* Drawer sheet */}
          <div className="relative flex flex-col w-72 max-w-[80vw] h-full bg-stone-100 dark:bg-[#121212] shadow-xl animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute right-3 top-3 p-1.5 rounded-lg bg-stone-200 dark:bg-white/5 text-stone-600 dark:text-stone-300"
            >
              <X className="w-4 h-4" />
            </button>
            <Sidebar
              sessions={sessions}
              activeSessionId={activeSessionId}
              providerConfig={providerConfig}
              onSelectSession={handleSelectSession}
              onNewSession={handleNewSession}
              onDeleteSession={handleDeleteSession}
              darkMode={darkMode}
              onToggleDarkMode={handleToggleDarkMode}
              isOnline={isOnline}
              onRefreshConfig={fetchProviderConfig}
            />
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 h-full min-w-0">
        <ChatWindow
          session={activeSession}
          providerConfig={providerConfig}
          onSendMessage={handleSendMessage}
          isSending={isSending}
          onUpdateSessionSettings={handleUpdateSessionSettings}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />
      </main>
    </div>
  );
}
