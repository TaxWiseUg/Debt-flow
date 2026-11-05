import React from 'react';
import { Sparkles } from 'lucide-react';

interface AgentTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AgentTrigger: React.FC<AgentTriggerProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="no-print fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/90 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white shadow-xl hover:shadow-2xl border border-white/20 dark:border-indigo-400/30 backdrop-blur-md transition-all active:scale-95 group"
      title="Open NexTone Autonomous AI Operations Copilot"
    >
      <div className="relative">
        <Sparkles className="w-4 h-4 text-amber-300 dark:text-amber-200 animate-pulse" />
        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
      </div>
      <span className="text-xs font-bold tracking-tight pr-0.5 hidden xs:inline">
        NexTone Copilot
      </span>
    </button>
  );
};
