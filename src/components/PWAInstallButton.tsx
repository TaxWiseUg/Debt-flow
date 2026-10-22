import React, { useState } from 'react';
import { usePWAInstall } from '../utils/usePWAInstall';
import { Download, Share2, PlusSquare, X } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissedBanner, setDismissedBanner] = useState(false);

  // If already running standalone or installed, hide prompt
  if (isInstalled) {
    return null;
  }

  // Handle banner presentation
  if (variant === 'banner') {
    if (dismissedBanner) return null;
    if (!isInstallable && !isIOS) return null;

    return (
      <div className="mx-4 mb-4 p-3 rounded-2xl liquid-glass border border-indigo-500/30 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm">
            <Download className="w-4 h-4" />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Install LedgerFlow App</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Fast offline access from home screen</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isInstallable ? (
            <button
              onClick={install}
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors"
            >
              Install
            </button>
          ) : (
            <button
              onClick={() => setShowIOSModal(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors"
            >
              How to Install
            </button>
          )}
          <button
            onClick={() => setDismissedBanner(true)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Full button variant (for settings or dashboard)
  if (variant === 'full') {
    if (isInstallable) {
      return (
        <button
          onClick={install}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Install App to Home Screen</span>
        </button>
      );
    }
    if (isIOS) {
      return (
        <>
          <button
            onClick={() => setShowIOSModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Install on iPhone / iPad</span>
          </button>
          {showIOSModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
              <div className="w-full max-w-sm liquid-glass rounded-2xl p-6 shadow-2xl border border-white/30 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Install on iPhone / Safari</h3>
                  <button onClick={() => setShowIOSModal(false)} className="p-1 text-slate-400 hover:text-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 font-bold">1</div>
                    <p>Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-indigo-500 mx-0.5" /> in your Safari bottom navigation bar.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 font-bold">2</div>
                    <p>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-500 mx-0.5" />.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 font-bold">3</div>
                    <p>Tap <strong>Add</strong> in the top right corner. LedgerFlow will run full-screen like a native app!</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="w-full py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </>
      );
    }
    return null;
  }

  // Compact variant (e.g. Header icon button)
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 liquid-glass-subtle hover:bg-indigo-500/10 rounded-xl transition-colors"
        title="Install LedgerFlow App"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 liquid-glass-subtle hover:bg-indigo-500/10 rounded-xl transition-colors"
          title="Install on iPhone / iPad"
        >
          <Download className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">Install</span>
        </button>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <div className="w-full max-w-sm liquid-glass rounded-2xl p-6 shadow-2xl border border-white/30 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Install on iPhone / Safari</h3>
                <button onClick={() => setShowIOSModal(false)} className="p-1 text-slate-400 hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 font-bold">1</div>
                  <p>Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-indigo-500 mx-0.5" /> in your Safari bottom navigation bar.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 font-bold">2</div>
                  <p>Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-indigo-500 mx-0.5" />.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0 font-bold">3</div>
                  <p>Tap <strong>Add</strong> in the top right corner.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
