import React from 'react';
import { motion } from 'motion/react';
import { useLedger } from '../context/LedgerContext';
import { Invoice } from '../types';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Plus,
  CreditCard,
  UserPlus,
  PackagePlus,
  ArrowRight,
  Eye,
  FileText,
  Users,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  calculateDaysOverdue,
} from '../utils/formatters';

interface DashboardViewProps {
  onOpenNewInvoice: () => void;
  onOpenNewPayment: () => void;
  onOpenNewCustomer: () => void;
  onOpenNewProduct: () => void;
  onViewInvoice: (invoice: Invoice) => void;
  onPayInvoice: (invoice: Invoice) => void;
  onViewCustomerStatement: (customerId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenNewInvoice,
  onOpenNewPayment,
  onOpenNewCustomer,
  onOpenNewProduct,
  onViewInvoice,
  onPayInvoice,
  onViewCustomerStatement,
  onNavigateToTab,
}) => {
  const { invoices, payments, customers, products, metrics, debtAging, activeCurrency } = useLedger();

  const unpaidInvoices = invoices
    .filter(i => i.balanceDue > 0)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
    .slice(0, 5);

  const totalAgingDebt = debtAging.current + debtAging.totalOverdue;
  const currentPct = totalAgingDebt > 0 ? (debtAging.current / totalAgingDebt) * 100 : 0;
  const days30Pct = totalAgingDebt > 0 ? (debtAging.days1to30 / totalAgingDebt) * 100 : 0;
  const days60Pct = totalAgingDebt > 0 ? (debtAging.days31to60 / totalAgingDebt) * 100 : 0;
  const daysOver60Pct = totalAgingDebt > 0 ? (debtAging.daysOver60 / totalAgingDebt) * 100 : 0;

  const isBrandNew = invoices.length === 0 && customers.length === 0 && products.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-8 pb-32"
    >
      {/* Brand New Clean Welcome Card if empty */}
      {isBrandNew && (
        <div className="p-8 sm:p-10 rounded-3xl liquid-glass text-center max-w-xl mx-auto space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Clean Ledger Ready
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Your database is connected to the cloud and completely cleared. Add your first customer or item to begin tracking debts and payments.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={onOpenNewCustomer}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
            <button
              onClick={onOpenNewProduct}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Add Unit Price Item</span>
            </button>
            <button
              onClick={onOpenNewInvoice}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </button>
          </div>
        </div>
      )}

      {/* 4 Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Debt */}
        <div className="p-6 rounded-2xl liquid-glass flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold">Total Receivables (Debt)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight my-1">
            {formatCurrency(metrics.totalDebt, activeCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {customers.length} customer accounts
          </div>
        </div>

        {/* Collected This Month */}
        <div className="p-6 rounded-2xl liquid-glass flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold">Collected This Month</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight my-1">
            {formatCurrency(metrics.totalCollectedThisMonth, activeCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {payments.length} payments cleared
          </div>
        </div>

        {/* Total Billed Revenue */}
        <div className="p-6 rounded-2xl liquid-glass flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold">Total Billed</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight my-1">
            {formatCurrency(metrics.totalBilled, activeCurrency)}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {invoices.length} invoices issued
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="p-6 rounded-2xl liquid-glass flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold">Overdue Invoices</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight my-1">
            {metrics.overdueInvoicesCount}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            Requiring immediate collection
          </div>
        </div>
      </div>

      {/* Debt Aging Schedule Card */}
      {totalAgingDebt > 0 && (
        <div className="p-7 rounded-2xl liquid-glass space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Debt Aging Schedule
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Payment maturity across outstanding accounts
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Unpaid: </span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {formatCurrency(totalAgingDebt, activeCurrency)}
              </span>
            </div>
          </div>

          {/* Bar */}
          <div className="w-full h-2.5 rounded-full overflow-hidden bg-slate-200/50 dark:bg-slate-800/50 flex">
            {currentPct > 0 && (
              <div style={{ width: `${currentPct}%` }} className="bg-indigo-500" />
            )}
            {days30Pct > 0 && (
              <div style={{ width: `${days30Pct}%` }} className="bg-amber-400" />
            )}
            {days60Pct > 0 && (
              <div style={{ width: `${days60Pct}%` }} className="bg-orange-500" />
            )}
            {daysOver60Pct > 0 && (
              <div style={{ width: `${daysOver60Pct}%` }} className="bg-rose-600" />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-1">
            <div className="p-3.5 rounded-xl liquid-glass-subtle">
              <span className="text-slate-500">Current (Not Due):</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(debtAging.current, activeCurrency)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl liquid-glass-subtle">
              <span className="text-amber-700 dark:text-amber-400">1 - 30 Days Due:</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(debtAging.days1to30, activeCurrency)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl liquid-glass-subtle">
              <span className="text-orange-700 dark:text-orange-400">31 - 60 Days Due:</span>
              <div className="font-mono font-bold text-slate-900 dark:text-white mt-1">
                {formatCurrency(debtAging.days31to60, activeCurrency)}
              </div>
            </div>
            <div className="p-3.5 rounded-xl liquid-glass-subtle">
              <span className="text-rose-700 dark:text-rose-400">60+ Days Overdue:</span>
              <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-1">
                {formatCurrency(debtAging.daysOver60, activeCurrency)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Inflows & Receivables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
        {/* Unpaid Invoices */}
        <div className="p-7 rounded-2xl liquid-glass flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/20 dark:border-white/10 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Unsettled Invoices
              </h3>
              <button
                onClick={() => onNavigateToTab('invoices')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {unpaidInvoices.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No unpaid invoices at this time.
              </div>
            ) : (
              <div className="space-y-3">
                {unpaidInvoices.map((inv) => {
                  const daysOverdue = calculateDaysOverdue(inv.dueDate);
                  return (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl liquid-glass-subtle flex items-center justify-between gap-3 text-xs"
                    >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {inv.invoiceNumber}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {inv.customerName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Due: {formatDate(inv.dueDate)} {daysOverdue > 0 ? `(${daysOverdue}d overdue)` : ''}
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        {formatCurrency(inv.balanceDue, inv.currency)}
                      </div>
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onPayInvoice(inv)}
                          className="px-2 py-0.5 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-500"
                        >
                          Pay
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="p-7 rounded-2xl liquid-glass flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/20 dark:border-white/10 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Recent Payment Inflows
              </h3>
              <button
                onClick={() => onNavigateToTab('payments')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Full Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                No payments logged yet.
              </div>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="p-3.5 rounded-xl liquid-glass-subtle flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {pay.receiptNumber}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                          {pay.customerName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDate(pay.paymentDate)} · {pay.paymentMethod.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>

                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      + {formatCurrency(pay.amount, pay.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
