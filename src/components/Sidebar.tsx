import React from "react";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Sun, 
  Moon, 
  Key, 
  Cloud, 
  CloudOff,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { ChatSession, ProviderConfig } from "../types";

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  providerConfig: ProviderConfig | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession: (id: string) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  isOnline: boolean;
  onRefreshConfig: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  providerConfig,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  darkMode,
  onToggleDarkMode,
  isOnline,
  onRefreshConfig,
}: SidebarProps) {
  return (
    <div className="w-full h-full flex flex-col bg-stone-50 dark:bg-[#121212] border-r border-stone-200 dark:border-white/5 text-stone-800 dark:text-slate-200 font-sans">
      {/* App Branding */}
      <div className="p-4 border-b border-stone-200 dark:border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base tracking-tight leading-none text-stone-900 dark:text-white">
              OmniChat
            </h1>
            <span className="text-[10px] text-stone-500 dark:text-slate-500 font-mono tracking-wider">
              AUTO-FAILOVER v1.0
            </span>
          </div>
        </div>

        {/* Online / Offline Cache Badge */}
        <div className="flex items-center" title="All chats are cached in local storage for offline retrieval">
          {isOnline ? (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100/60 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20">
              <Cloud className="w-3 h-3 text-emerald-500" />
              <span>Sync On</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100/60 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20">
              <CloudOff className="w-3 h-3 text-amber-500" />
              <span>Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-lg transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Conversation</span>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
        <div className="text-[10px] uppercase tracking-widest text-stone-400 dark:text-slate-500 font-bold mb-2.5 mt-2 px-2">
          Recent Sessions
        </div>
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 dark:text-slate-500">
            No past conversations
          </div>
        ) : (
          sessions.map((session) => {
            const isActive = session.id === activeSessionId;
            const lastMsg = session.messages[session.messages.length - 1]?.content || "Empty chat";
            
            return (
              <div
                key={session.id}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? "bg-stone-200/80 dark:bg-white/5 text-stone-950 dark:text-white border-l-4 border-indigo-600 dark:border-indigo-500 dark:border-l-0 dark:border-t dark:border-b dark:border-r dark:border-white/10"
                    : "hover:bg-stone-200/40 dark:hover:bg-white/5 text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-slate-200"
                }`}
                onClick={() => onSelectSession(session.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-stone-400 dark:text-slate-600"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate">
                      {session.title || "Untitled Conversation"}
                    </p>
                    <p className="text-[10px] text-stone-400 dark:text-slate-500 truncate mt-0.5">
                      {lastMsg}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="p-1 text-stone-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  title="Delete Conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* API Key Connection Indicators */}
      <div className="p-3.5 mx-2 my-2 rounded-xl bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-slate-400">
            <Key className="w-3.5 h-3.5 text-indigo-500" />
            <span>Server Connections</span>
          </div>
          <button 
            onClick={onRefreshConfig}
            className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-slate-200 transition-colors"
            title="Refresh status"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="space-y-1.5">
          {/* Gemini */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500 dark:text-slate-400">Google Gemini API</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${providerConfig?.geminiConfigured ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                {providerConfig?.geminiConfigured ? "Connected" : "Not Found"}
              </span>
            </span>
          </div>
          {/* Nvidia NIM */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500 dark:text-slate-400">NVIDIA NIM</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${providerConfig?.nvidiaConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                {providerConfig?.nvidiaConfigured ? "Connected" : "Inactive (Auto-skip)"}
              </span>
            </span>
          </div>
          {/* OpenRouter */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-stone-500 dark:text-slate-400">OpenRouter Backup</span>
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${providerConfig?.openRouterConfigured ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span className="text-[10px] text-stone-400 dark:text-slate-500 font-medium">
                {providerConfig?.openRouterConfigured ? "Connected" : "Inactive (Auto-skip)"}
              </span>
            </span>
          </div>
        </div>
        {!providerConfig?.nvidiaConfigured && !providerConfig?.openRouterConfigured && (
          <p className="text-[9px] text-stone-400 dark:text-slate-500 mt-2 font-sans italic leading-tight">
            * Add NVIDIA_API_KEY / OPENROUTER_API_KEY in Secrets panel to fully enable all multi-model fallbacks.
          </p>
        )}
      </div>

      {/* Theme Toggle & Bottom Actions */}
      <div className="p-4 border-t border-stone-200 dark:border-white/5 flex items-center justify-between bg-stone-100 dark:bg-black/20">
        <span className="text-xs text-stone-400 dark:text-slate-500 font-medium">Appearance</span>
        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg bg-stone-200 dark:bg-white/5 hover:bg-stone-300/80 dark:hover:bg-white/10 border dark:border-white/5 transition-all text-stone-600 dark:text-slate-300 flex items-center gap-1.5 text-xs font-semibold"
        >
          {darkMode ? (
            <>
              <Sun className="w-4 h-4 text-amber-500" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
