import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Users,
  CreditCard,
  Package,
  MoreHorizontal,
  Sparkles,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

export type ActiveTab =
  | 'dashboard'
  | 'orders'
  | 'invoices'
  | 'customers'
  | 'products'
  | 'payments'
  | 'settings';

interface FloatingNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
  onToggleAgent?: () => void;
  isAgentOpen?: boolean;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onToggleAgent,
  isAgentOpen = false,
}) => {
  const { metrics } = useLedger();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close more menu on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
    }
    if (isMoreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMoreOpen]);

  // Primary 4 daily navigation items
  const primaryNavItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      hasDot: false,
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'Invoices',
      icon: FileText,
      hasDot: metrics.overdueInvoicesCount > 0,
      dotColor: 'bg-rose-500',
    },
    {
      id: 'orders' as ActiveTab,
      label: 'Orders',
      icon: ClipboardList,
      hasDot: false,
    },
    {
      id: 'customers' as ActiveTab,
      label: 'Customers',
      icon: Users,
      hasDot: false,
    },
  ];

  // Secondary items housed in the icon-only "More" dock
  const secondaryNavItems = [
    {
      id: 'payments' as ActiveTab,
      label: 'Payments',
      icon: CreditCard,
    },
    {
      id: 'products' as ActiveTab,
      label: 'Catalog',
      icon: Package,
    },
  ];

  const isSecondaryActive =
    activeTab === 'payments' || activeTab === 'products';

  return (
    <nav
      className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-fit pointer-events-auto"
      aria-label="Application navigation"
    >
      <div className="relative flex items-center gap-1 p-1.5 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-900/5 dark:shadow-black/30">
        {/* Primary 4 Tab Buttons */}
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <div key={item.id} className="relative flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  setActiveTab(item.id);
                }}
                onMouseEnter={() => setHoveredTab(item.id)}
                onMouseLeave={() => setHoveredTab(null)}
                className={`relative px-3.5 py-2 rounded-full text-xs font-medium transition-colors flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  isActive
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeFloatingIndicator"
                    className="absolute inset-0 rounded-full bg-indigo-600 shadow-xs"
                    transition={{
                      type: 'spring',
                      stiffness: 480,
                      damping: 36,
                    }}
                  />
                )}

                <Icon
                  className="w-4 h-4 relative z-10 shrink-0"
                  strokeWidth={isActive ? 2.25 : 1.75}
                />

                {item.hasDot && (
                  <span
                    className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                      item.dotColor || 'bg-rose-500'
                    } z-20`}
                  />
                )}
              </button>

              <AnimatePresence>
                {hoveredTab === item.id && !isMoreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 2, scale: 0.98 }}
                    transition={{ duration: 0.12, ease: 'easeOut' }}
                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-medium whitespace-nowrap shadow-xs"
                  >
                    {item.label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Subtle Divider */}
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />

        {/* More Options Trigger (Icon-only popover with no header or text) */}
        <div ref={moreRef} className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsMoreOpen((prev) => !prev)}
            onMouseEnter={() => setHoveredTab('more')}
            onMouseLeave={() => setHoveredTab(null)}
            className={`relative px-3 py-2 rounded-full text-xs font-medium transition-colors flex items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
              isSecondaryActive
                ? 'text-white'
                : isMoreOpen
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
            }`}
            aria-label="More views"
            aria-expanded={isMoreOpen}
          >
            {isSecondaryActive && (
              <motion.span
                layoutId="activeFloatingIndicator"
                className="absolute inset-0 rounded-full bg-indigo-600 shadow-xs"
                transition={{
                  type: 'spring',
                  stiffness: 480,
                  damping: 36,
                }}
              />
            )}

            <MoreHorizontal
              className="w-4 h-4 relative z-10 shrink-0"
              strokeWidth={isSecondaryActive ? 2.25 : 1.75}
            />
          </button>

          <AnimatePresence>
            {hoveredTab === 'more' && !isMoreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 2, scale: 0.98 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-medium whitespace-nowrap shadow-xs"
              >
                More
              </motion.div>
            )}
          </AnimatePresence>

          {/* Compact Icon-Only Floating Dock (No Text, No Header) */}
          <AnimatePresence>
            {isMoreOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.14, ease: 'easeOut' }}
                className="absolute bottom-12 right-0 flex items-center gap-1 p-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-slate-900/10 dark:shadow-black/40"
              >
                {secondaryNavItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = activeTab === sub.id;

                  return (
                    <div key={sub.id} className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMoreOpen(false);
                          setActiveTab(sub.id);
                        }}
                        onMouseEnter={() => setHoveredTab(sub.id)}
                        onMouseLeave={() => setHoveredTab(null)}
                        className={`p-2 rounded-full transition-colors flex items-center justify-center ${
                          isSubActive
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        aria-label={sub.label}
                      >
                        <SubIcon className="w-4 h-4" />
                      </button>

                      {hoveredTab === sub.id && (
                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-[10px] font-medium whitespace-nowrap shadow-xs">
                          {sub.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dedicated Agent CTA Button on the Nav Bar */}
        {onToggleAgent && (
          <>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-0.5" />
            <button
              type="button"
              onClick={onToggleAgent}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs outline-none ${
                isAgentOpen
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/30'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60'
              }`}
              title="Toggle AI Operations Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};
