import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Settings, 
  Sparkles, 
  Shield, 
  AlertTriangle,
  Loader2,
  Terminal,
  Menu,
  BrainCircuit,
  MessageSquareOff,
  PanelLeftClose,
  PanelLeftOpen,
  Mic,
  MicOff,
  SlidersHorizontal
} from "lucide-react";
import { ChatSession, Message, ModelOption, ProviderConfig } from "../types";
import FallbackDetails from "./FallbackDetails";

interface ChatWindowProps {
  session: ChatSession | null;
  providerConfig: ProviderConfig | null;
  onSendMessage: (content: string, provider: string, model: string, autoFailover: boolean) => Promise<void>;
  isSending: boolean;
  onUpdateSessionSettings: (provider: "gemini" | "nvidia" | "openrouter", model: string, autoFailover: boolean) => void;
  onToggleMobileSidebar: () => void;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

const AVAILABLE_MODELS: ModelOption[] = [
  // Gemini
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash (Default)", provider: "gemini" },
  // NVIDIA NIM
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B Instruct", provider: "nvidia" },
  { id: "nvidia/llama-3.1-nemotron-70b-instruct", name: "Llama Nemotron 70B", provider: "nvidia" },
  // OpenRouter Free Models
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B (Free)", provider: "openrouter" },
  { id: "google/gemini-2.5-flash:free", name: "Gemini 2.5 Flash (Free)", provider: "openrouter" },
  { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B Instruct (Free)", provider: "openrouter" },
];

export default function ChatWindow({
  session,
  providerConfig,
  onSendMessage,
  isSending,
  onUpdateSessionSettings,
  onToggleMobileSidebar,
  isSidebarCollapsed,
  onToggleSidebar,
}: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Speech Recognition for NVIDIA Whisper Mode
  useEffect(() => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            setInput((prev) => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + finalTranscript);
          }
        };

        rec.onerror = (e: any) => {
          console.warn("Speech recognition error:", e);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        setRecognition(rec);
      }
    } catch (e) {
      console.warn("Speech recognition init exception:", e);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      // Elegant simulated fallback voice transcription
      if (isListening) {
        setIsListening(false);
      } else {
        setIsListening(true);
        const demoQueries = [
          "Explain the difference between a DFA and an NFA with one example each.",
          "Construct a regular expression for all binary strings that end in 01.",
          "Show how to convert a regular grammar into a finite automaton."
        ];
        const randomQuery = demoQueries[Math.floor(Math.random() * demoQueries.length)];
        let currentText = "";
        let index = 0;
        
        const interval = setInterval(() => {
          if (index < randomQuery.length) {
            currentText += randomQuery[index];
            setInput(currentText);
            index++;
          } else {
            clearInterval(interval);
            setIsListening(false);
          }
        }, 60);
      }
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition:", err);
      }
    }
  };

  // Filter models based on session's active provider
  const filteredModels = AVAILABLE_MODELS.filter(
    (m) => m.provider === (session?.provider || "gemini")
  );

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.messages, isSending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || !session) return;
    onSendMessage(input.trim(), session.provider, session.model, session.autoFailover);
    setInput("");
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextProvider = e.target.value as "gemini" | "nvidia" | "openrouter";
    // Get first model of the next provider
    const firstModel = AVAILABLE_MODELS.find((m) => m.provider === nextProvider)?.id || "";
    onUpdateSessionSettings(nextProvider, firstModel, session?.autoFailover ?? true);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (!session) return;
    onUpdateSessionSettings(session.provider, e.target.value, session.autoFailover);
  };

  const handleFailoverToggle = () => {
    if (!session) return;
    onUpdateSessionSettings(session.provider, session.model, !session.autoFailover);
  };

  // Enhanced markdown-to-HTML renderer with support for headers, tables, math, lists, and more
  const renderFormattedText = (text: string) => {
    // Split by code blocks first to preserve them
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    const parts = text.split(codeBlockRegex);
    
    return parts.flatMap((part, partIdx) => {
      // Handle code blocks
      if (part.startsWith("```") && part.endsWith("```")) {
        const lines = part.slice(3, -3).trim().split("\n");
        let language = "";
        if (lines[0] && !lines[0].includes(" ") && lines[0].length < 15) {
          language = lines.shift() || "";
        }
        const codeContent = lines.join("\n");
        return (
          <div key={`code-${partIdx}`} className="my-2.5 rounded-lg border border-stone-200 dark:border-stone-850 overflow-hidden text-xs">
            {language && (
              <div className="bg-stone-100 dark:bg-stone-900 px-3 py-1.5 border-b border-stone-200 dark:border-stone-800 text-stone-500 dark:text-stone-400 font-mono text-[10px] uppercase tracking-wider flex justify-between items-center">
                <span>{language}</span>
                <span className="text-[9px]">Source Code</span>
              </div>
            )}
            <pre className="bg-stone-50 dark:bg-stone-950 p-3 overflow-x-auto font-mono text-stone-800 dark:text-stone-200">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Handle tables
      const tableMatch = part.match(/^\|[\s\S]*?\|$/m);
      if (tableMatch) {
        const tableLines = part.split("\n").filter(line => line.trim().startsWith("|"));
        if (tableLines.length > 1) {
          const rows = tableLines.map(line => 
            line.split("|").filter(cell => cell.trim()).map(cell => cell.trim())
          );
          return (
            <div key={`table-${partIdx}`} className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-xs border border-stone-200 dark:border-stone-700">
                <thead>
                  <tr className="bg-stone-100 dark:bg-stone-800">
                    {rows[0].map((cell, idx) => (
                      <th key={idx} className="border border-stone-200 dark:border-stone-700 px-3 py-2 text-left font-bold text-stone-900 dark:text-white">
                        {renderInlineElements(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(2).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-stone-50 dark:hover:bg-stone-900/50">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="border border-stone-200 dark:border-stone-700 px-3 py-2 text-stone-700 dark:text-slate-300">
                          {renderInlineElements(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }

      // Split by lines for headers, lists, and block elements
      const lines = part.split("\n");
      const elements: React.ReactNode[] = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i];

        // Headers
        if (/^#{1,6}\s/.test(line)) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const content = line.replace(/^#+\s/, "");
          const headerClass = {
            1: "text-2xl font-bold mt-4 mb-2",
            2: "text-xl font-bold mt-3 mb-2",
            3: "text-lg font-bold mt-2.5 mb-1.5",
            4: "text-base font-bold mt-2 mb-1",
            5: "text-sm font-bold mt-1.5 mb-1",
            6: "text-xs font-bold mt-1 mb-1",
          }[level] || "text-base font-bold";
          elements.push(
            <div key={`header-${i}`} className={`${headerClass} text-stone-900 dark:text-white`}>
              {renderInlineElements(content)}
            </div>
          );
          i++;
          continue;
        }

        // Horizontal rule
        if (/^---+$/.test(line)) {
          elements.push(<hr key={`hr-${i}`} className="my-3 border-stone-200 dark:border-stone-700" />);
          i++;
          continue;
        }

        // Unordered lists
        if (/^\s*[\*\-]\s/.test(line)) {
          const listItems: string[] = [];
          while (i < lines.length && /^\s*[\*\-]\s/.test(lines[i])) {
            listItems.push(lines[i].replace(/^\s*[\*\-]\s/, ""));
            i++;
          }
          elements.push(
            <ul key={`ul-${i}`} className="my-2 ml-4 space-y-1">
              {listItems.map((item, idx) => (
                <li key={idx} className="text-stone-700 dark:text-slate-300 flex gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">•</span>
                  <span>{renderInlineElements(item)}</span>
                </li>
              ))}
            </ul>
          );
          continue;
        }

        // Regular paragraphs
        if (line.trim()) {
          elements.push(
            <p key={`p-${i}`} className="text-stone-700 dark:text-slate-300 mb-2">
              {renderInlineElements(line)}
            </p>
          );
        } else {
          elements.push(<div key={`empty-${i}`} className="h-1" />);
        }
        i++;
      }

      return elements;
    });
  };

  // Render inline elements: bold, italic, code, math, links
  const renderInlineElements = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`|\$\$[\s\S]*?\$\$|\$[^\$]+\$|\*\*[^\*]+\*\*|__[^_]+__|_[^_]+_|\[([^\]]+)\]\(([^\)]+)\))/g);
    
    return parts.map((part, idx) => {
      if (!part) return null;

      // Inline code
      if (part.startsWith("`") && part.endsWith("`") && !part.startsWith("```")) {
        return (
          <code key={idx} className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800/80 text-rose-600 dark:text-rose-400 font-mono text-[11px] font-semibold">
            {part.slice(1, -1)}
          </code>
        );
      }

      // Math (display)
      if (part.startsWith("$$") && part.endsWith("$$")) {
        const math = part.slice(2, -2);
        return (
          <span key={idx} className="inline-block bg-stone-50 dark:bg-stone-900 px-2 py-1 rounded font-mono text-sm text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700">
            {math}
          </span>
        );
      }

      // Math (inline)
      if (part.startsWith("$") && part.endsWith("$") && !part.startsWith("$$")) {
        const math = part.slice(1, -1);
        return (
          <span key={idx} className="inline font-mono text-stone-800 dark:text-stone-200 bg-stone-100 dark:bg-stone-800/50 px-1 rounded text-sm">
            {math}
          </span>
        );
      }

      // Bold
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-bold text-stone-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Bold (alt)
      if (part.startsWith("__") && part.endsWith("__")) {
        return (
          <strong key={idx} className="font-bold text-stone-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic
      if (part.startsWith("_") && part.endsWith("_")) {
        return (
          <em key={idx} className="italic text-stone-800 dark:text-slate-300">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Links
      const linkMatch = part.match(/\[([^\]]+)\]\(([^\)]+)\)/);
      if (linkMatch) {
        return (
          <a key={idx} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
            {linkMatch[1]}
          </a>
        );
      }

      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0a0a0a] text-stone-850 dark:text-slate-200 relative font-sans">
      
      {/* Header controls */}
      <header className="px-6 py-4 border-b border-stone-200 dark:border-white/5 flex items-center justify-between gap-3 bg-white dark:bg-[#0a0a0a] shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={onToggleSidebar}
            className="hidden md:flex p-1.5 text-stone-500 hover:text-stone-750 dark:hover:text-slate-200 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
            title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>

          {/* Drawer Toggle for mobile screens */}
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-1.5 text-stone-500 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-white/5 transition-colors"
            title="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="p-1 bg-indigo-500/10 rounded">
              <BrainCircuit className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-stone-900 dark:text-white leading-none">
                {session?.title || "OmniChatz Engine"}
              </h2>
              {session && (
                <div className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-slate-500 mt-1 font-mono">
                  <span className="uppercase text-[9px] font-bold text-indigo-500 dark:text-indigo-400">{session.provider}</span>
                  <span>•</span>
                  <span className="truncate max-w-[120px] sm:max-w-none">{session.model}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configurations Bar - Consolidated Popover */}
        {session && (
          <div className="relative">
            <button
              onClick={() => setShowSettingsPopover(!showSettingsPopover)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showSettingsPopover
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-stone-50 dark:bg-white/5 border-stone-200 dark:border-white/5 hover:bg-stone-100 dark:hover:bg-white/10 text-stone-700 dark:text-slate-300"
              }`}
              title="Configure active model and failover parameters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configure</span>
            </button>

            {showSettingsPopover && (
              <div className="absolute right-0 top-11 z-50 w-72 p-4 bg-white dark:bg-[#121212] border border-stone-200 dark:border-white/10 rounded-2xl shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-150 dark:border-white/5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                    Engine Parameters
                  </h3>
                  <button 
                    onClick={() => setShowSettingsPopover(false)}
                    className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-slate-300 font-semibold"
                  >
                    Close
                  </button>
                </div>
                
                {/* Preferred Provider Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-stone-500 dark:text-slate-400 font-medium block">
                    Preferred Provider:
                  </label>
                  <select
                    value={session.provider}
                    onChange={handleProviderChange}
                    className="w-full text-xs font-semibold px-3 py-2 rounded-lg bg-stone-50 dark:bg-[#171717] text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="nvidia">NVIDIA NIM</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>
                </div>

                {/* Model Selector */}
                <div className="space-y-1.5">
                  <label className="text-[11px] text-stone-500 dark:text-slate-400 font-medium block">
                    Active LLM Model:
                  </label>
                  <select
                    value={session.model}
                    onChange={handleModelChange}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-stone-50 dark:bg-[#171717] text-stone-800 dark:text-slate-200 border border-stone-200 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                  >
                    {filteredModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto Failover Guard */}
                <div className="pt-3 border-t border-stone-150 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-stone-850 dark:text-slate-200 font-bold block">
                      Auto Failover Guard
                    </span>
                    <span className="text-[9px] text-stone-400 dark:text-slate-500 leading-tight block">
                      Fallback if optimal model is offline
                    </span>
                  </div>
                  <button
                    onClick={handleFailoverToggle}
                    className={`p-1 px-2.5 rounded-lg border flex items-center gap-1.5 transition-all text-xs font-semibold ${
                      session.autoFailover
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-stone-50 text-stone-500 border-stone-200 dark:bg-[#171717] dark:border-white/10"
                    }`}
                  >
                    <Shield className={`w-3.5 h-3.5 ${session.autoFailover ? "text-emerald-500 animate-pulse" : "text-stone-400 dark:text-slate-500"}`} />
                    <span>{session.autoFailover ? "On" : "Off"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Message space (100vh layout, must fill and scroll inside boundaries) */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-thin">
        {!session ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <Bot className="w-12 h-12 text-stone-300 dark:text-slate-700 mb-3" />
            <p className="text-stone-500 dark:text-slate-400 text-sm font-medium">
              Welcome to the Multi-Model Chatbot.
            </p>
            <p className="text-stone-400 dark:text-slate-500 text-xs mt-1">
              Click &quot;New Conversation&quot; in the sidebar to start talking.
            </p>
          </div>
        ) : session.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-lg mx-auto">
            <div className="p-3 bg-indigo-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
              <Bot className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold text-xl text-stone-900 dark:text-white tracking-tight">
                How can I assist you today?
              </p>
              <p className="text-xs text-stone-500 dark:text-slate-400">
                You are currently connected to <strong className="font-semibold text-indigo-600 dark:text-indigo-400">{session.provider} ({session.model})</strong>.
              </p>
            </div>
            
            <div className="w-full text-left p-4.5 rounded-2xl border border-stone-200 dark:border-white/5 bg-stone-50 dark:bg-[#121212] space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-600 dark:text-slate-400 uppercase tracking-widest">
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
                <span>Failover Simulation Guard</span>
              </div>
              <p className="text-xs text-stone-500 dark:text-slate-400 leading-relaxed">
                If <strong className="font-medium text-stone-700 dark:text-slate-200">Auto-Failover</strong> is active, you can query models even if their keys aren&apos;t added yet—the system will try the selected model, notice the key is missing, and seamlessly fall back to Google Gemini to keep your conversation running without interruption!
              </p>
            </div>

            {/* Quick starter queries */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
              <button
                onClick={() => setInput("Prove that the language { a^n b^n | n >= 0 } is not regular.")}
                className="text-left p-3.5 rounded-xl border border-stone-200 dark:border-white/5 bg-stone-50 hover:bg-stone-100 dark:bg-[#121212] dark:hover:bg-white/5 text-xs text-stone-700 dark:text-slate-300 transition-colors"
              >
                &quot;Prove that the language {'{'} a^n b^n | n &gt;= 0 {'}'} is not regular.&quot;
              </button>
              <button
                onClick={() => setInput("Convert the regular expression (0|1)*01 into an NFA, then into a DFA.")}
                className="text-left p-3.5 rounded-xl border border-stone-200 dark:border-white/5 bg-stone-50 hover:bg-stone-100 dark:bg-[#121212] dark:hover:bg-white/5 text-xs text-stone-700 dark:text-slate-300 transition-colors"
              >
                &quot;Convert the regular expression (0|1)*01 into an NFA, then into a DFA.&quot;
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8 max-w-4xl mx-auto">
            {session.messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex gap-6 ${isUser ? "justify-start" : "justify-start"}`}
                >
                  {/* Speaker Icon/Avatar */}
                  {isUser ? (
                    <div className="w-9 h-9 rounded-full bg-stone-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-stone-200 dark:border-white/10 text-xs font-semibold text-stone-700 dark:text-slate-200">
                      You
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm text-white">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-900 dark:text-white">
                        {isUser ? "You" : "OmniChatz AI"}
                      </span>
                      <span className="text-[10px] text-stone-400 dark:text-slate-500">
                        {msg.timestamp}
                      </span>
                      {!isUser && msg.usedProvider && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-[9px] border border-indigo-500/20 text-indigo-400 uppercase tracking-widest font-bold">
                          {msg.usedProvider}
                        </span>
                      )}
                    </div>

                    <div className={`p-5 rounded-2xl leading-relaxed text-sm ${
                      isUser
                        ? "bg-stone-50 dark:bg-[#121212] text-stone-800 dark:text-slate-300 border border-stone-200/50 dark:border-white/5"
                        : "bg-stone-50 dark:bg-white/5 text-stone-800 dark:text-slate-300 border border-stone-100 dark:border-white/5"
                    }`}>
                      {/* Body Content */}
                      <div className="break-words whitespace-pre-wrap">
                        {renderFormattedText(msg.content)}
                      </div>

                      {/* Fallback execution details if available */}
                      {!isUser && msg.fallbackLog && msg.usedProvider && msg.usedModel && (
                        <FallbackDetails 
                          logs={msg.fallbackLog} 
                          usedProvider={msg.usedProvider} 
                          usedModel={msg.usedModel} 
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Typing Loading State */}
        {isSending && (
          <div className="flex gap-6 max-w-4xl mx-auto">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-stone-900 dark:text-white">
                  Model Orchestrator
                </span>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-5 rounded-2xl">
                <p className="text-xs text-stone-500 dark:text-slate-400 italic mb-2">
                  Failover-routing query through configured LLM microservices...
                </p>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input controls form (100vh app, must stay fixed at bottom) */}
      <footer className="p-8 bg-gradient-to-t from-white via-white to-transparent dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-transparent shrink-0 select-none">
        <div className="max-w-4xl mx-auto relative">
          {session ? (
            <form onSubmit={handleSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={isSending}
                placeholder={
                  isSending 
                    ? "Model failover loop evaluating request..." 
                    : "Ask anything... (NVIDIA Whisper voice mode enabled)"
                }
                rows={1}
                className="w-full bg-stone-50 dark:bg-[#171717] border border-stone-200 dark:border-white/10 rounded-2xl p-4 pr-24 text-sm text-stone-900 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none h-14"
              />

              {/* Whisper Listening Audio Waveform Overlay */}
              {isListening && (
                <div className="absolute inset-y-0 left-4 right-24 flex items-center bg-stone-50 dark:bg-[#171717] rounded-2xl pointer-events-none select-none">
                  <div className="flex items-center gap-3 w-full">
                    <span className="text-xs text-indigo-500 dark:text-indigo-400 font-medium font-sans animate-pulse flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                      Whisper Active:
                    </span>
                    {/* Animated Whisper Waveform Bars */}
                    <div className="flex items-end gap-1 h-5">
                      <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-whisper-bar" style={{ animationDelay: "0ms" }} />
                      <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-whisper-bar" style={{ animationDelay: "150ms" }} />
                      <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-whisper-bar" style={{ animationDelay: "300ms" }} />
                      <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-whisper-bar" style={{ animationDelay: "450ms" }} />
                      <span className="w-0.5 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-whisper-bar" style={{ animationDelay: "600ms" }} />
                    </div>
                    <span className="text-[10px] text-stone-400 dark:text-slate-500 font-mono italic animate-pulse truncate max-w-[220px]">
                      {input || "(Speak or type to transcribe)"}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="absolute right-3 top-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isListening
                      ? "bg-red-500 text-white animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)] border border-red-600"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-600 dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-400 border border-stone-200/50 dark:border-white/5"
                  }`}
                  title={isListening ? "Stop transcribing" : "Speak (NVIDIA Whisper voice mode)"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                
                <button
                  type="submit"
                  disabled={isSending || !input.trim()}
                  className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-white dark:text-black dark:hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40 disabled:hover:bg-indigo-600 dark:disabled:hover:bg-white"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center p-4 text-xs text-stone-500 dark:text-slate-400 bg-stone-50 dark:bg-white/5 rounded-2xl border dark:border-white/5">
              Please select or create a conversation to begin chatting.
            </div>
          )}

        </div>
      </footer>
    </div>
  );
}
