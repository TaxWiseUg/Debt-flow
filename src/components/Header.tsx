import React from 'react';
import { useLedger } from '../context/LedgerContext';
import { CurrencyCode } from '../types';
import {
  Moon,
  Sun,
  Plus,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  onOpenNewInvoice: () => void;
  onOpenNewPayment: () => void;
  currentViewTitle: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewInvoice,
  onOpenNewPayment,
  currentViewTitle,
}) => {
  const {
    businessProfile,
    activeCurrency,
    theme,
    toggleTheme,
    cloudStatus,
  } = useLedger();

  return (
    <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-8 py-3.5 liquid-glass transition-colors">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
          LF
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {businessProfile.name || 'LedgerFlow'}
            </span>

            {/* Cloud Storage Status */}
            <div
              className="flex items-center gap-1 text-[11px] font-medium"
              title={
                cloudStatus === 'connected'
                  ? 'Firestore Cloud Storage Active & Synced'
                  : cloudStatus === 'syncing'
                  ? 'Syncing with Firestore...'
                  : 'Operating in cached offline mode'
              }
            >
              {cloudStatus === 'connected' && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Cloud className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Cloud Synced</span>
                </span>
              )}
              {cloudStatus === 'syncing' && (
                <span className="flex items-center gap-1 text-amber-500 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span className="hidden md:inline">Syncing...</span>
                </span>
              )}
              {cloudStatus === 'offline' && (
                <span className="flex items-center gap-1 text-slate-400">
                  <CloudOff className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Local Cache</span>
                </span>
              )}
            </div>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {currentViewTitle}
          </span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Currency Badge (UGX) */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 liquid-glass-subtle rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400">
          <span>UGX</span>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white liquid-glass-subtle rounded-xl transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Primary Invoice CTA */}
        <button
          onClick={onOpenNewInvoice}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-colors whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Invoice</span>
        </button>
      </div>
    </header>
  );
};
