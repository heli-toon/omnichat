import React, { useState } from "react";
import { ChevronDown, ChevronUp, ShieldCheck, Terminal } from "lucide-react";

interface FallbackDetailsProps {
  logs?: string[];
  usedProvider: string;
  usedModel: string;
}

export default function FallbackDetails({ logs, usedProvider, usedModel }: FallbackDetailsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!logs || logs.length === 0) return null;

  const didFailover = logs.some((log) => log.toLowerCase().includes("failed"));

  return (
    <div className="mt-2 text-xs border border-stone-200 dark:border-white/5 rounded-lg bg-stone-50 dark:bg-[#121212] overflow-hidden font-sans">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 hover:bg-stone-100 dark:hover:bg-white/5 transition-all text-stone-600 dark:text-slate-400"
      >
        <span className="flex items-center gap-1.5 font-medium">
          <Terminal className="w-3.5 h-3.5 text-indigo-500" />
          Execution Log
          {didFailover ? (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/20 font-semibold font-sans">
              Failover Triggered
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 font-semibold font-sans">
              Optimal Path
            </span>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[11px] text-stone-400 dark:text-slate-500 font-mono">
            {usedProvider} ({usedModel})
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
        </span>
      </button>

      {isOpen && (
        <div className="p-3 border-t border-stone-200 dark:border-white/5 bg-stone-100/50 dark:bg-black/20 font-mono text-[11px] leading-relaxed text-stone-700 dark:text-slate-300 space-y-1 max-h-48 overflow-y-auto">
          {logs.map((log, idx) => {
            const isError = log.includes("Failed") || log.includes("missing") || log.includes("Error");
            const isSuccess = log.includes("Success");
            return (
              <div
                key={idx}
                className={`p-1 px-1.5 rounded ${
                  isError
                    ? "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
                    : isSuccess
                    ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20"
                    : "text-stone-500 dark:text-slate-400"
                }`}
              >
                &gt; {log}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
