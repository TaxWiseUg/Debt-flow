import React from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  CreditCard,
  Settings,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

export type ActiveTab = 'dashboard' | 'invoices' | 'customers' | 'products' | 'payments' | 'settings';

interface FloatingNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenSettings: () => void;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
}) => {
  const { metrics } = useLedger();

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
      hasDot: false,
    },
    {
      id: 'invoices' as ActiveTab,
      label: 'Invoices & Billing',
      icon: FileText,
      hasDot: metrics.overdueInvoicesCount > 0,
      dotColor: 'bg-rose-500',
    },
    {
      id: 'customers' as ActiveTab,
      label: 'Customers & Debts',
      icon: Users,
      hasDot: false,
    },
    {
      id: 'products' as ActiveTab,
      label: 'Unit Price Catalog',
      icon: Package,
      hasDot: false,
    },
    {
      id: 'payments' as ActiveTab,
      label: 'Payment Ledger',
      icon: CreditCard,
      hasDot: false,
    },
    {
      id: 'settings' as ActiveTab,
      label: 'Business Settings',
      icon: Settings,
      hasDot: false,
    },
  ];

  return (
    <nav
      className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-fit pointer-events-auto"
      aria-label="Bottom Navigation"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-full liquid-glass shadow-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => {
                if (item.id === 'settings') {
                  onOpenSettings();
                } else {
                  setActiveTab(item.id);
                }
              }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              className={`relative p-2.5 rounded-full transition-colors flex items-center justify-center ${
                isActive
                  ? 'text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-slate-800/70'
              }`}
              title={item.label}
              aria-label={item.label}
            >
              {/* Active animated background pill */}
              {isActive && (
                <motion.div
                  layoutId="activeFloatingIndicator"
                  className="absolute inset-0 rounded-full bg-indigo-600 shadow-md shadow-indigo-500/30 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              <Icon className="w-5 h-5 relative z-10" />

              {/* Status Alert Dot */}
              {item.hasDot && (
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-white dark:ring-slate-900 ${
                    item.dotColor || 'bg-amber-500'
                  }`}
                />
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </nav>
  );
};
