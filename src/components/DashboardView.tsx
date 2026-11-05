import React, { useEffect, useMemo } from 'react';
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
  ChevronRight,
  ArrowUpRight,
  ShieldAlert,
  ClipboardList,
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
  const {
    invoices,
    payments,
    customers,
    products,
    orders,
    metrics,
    debtAging,
    profitSummary,
    activeCurrency,
    businessProfile,
    getCustomerBalance,
  } = useLedger();

  // Reset scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  // Top unpaid invoices
  const unpaidInvoices = useMemo(() => {
    return invoices
      .filter((i) => i.balanceDue > 0)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5);
  }, [invoices]);

  // Recent payments
  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      .slice(0, 5);
  }, [payments]);

  // Top Debtors (Customers with highest outstanding debt)
  const topDebtors = useMemo(() => {
    return customers
      .map((c) => {
        const bal = getCustomerBalance(c.id);
        return {
          customer: c,
          ...bal,
        };
      })
      .filter((c) => c.balanceDue > 0)
      .sort((a, b) => b.balanceDue - a.balanceDue)
      .slice(0, 4);
  }, [customers, invoices, payments, getCustomerBalance]);

  // Aging schedule calculations
  const totalAgingDebt = debtAging.current + debtAging.totalOverdue;
  const currentPct = totalAgingDebt > 0 ? (debtAging.current / totalAgingDebt) * 100 : 0;
  const days30Pct = totalAgingDebt > 0 ? (debtAging.days1to30 / totalAgingDebt) * 100 : 0;
  const days60Pct = totalAgingDebt > 0 ? (debtAging.days31to60 / totalAgingDebt) * 100 : 0;
  const daysOver60Pct = totalAgingDebt > 0 ? (debtAging.daysOver60 / totalAgingDebt) * 100 : 0;

  // Circular ring/pie calculations
  const computedSegments = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius; // ~364.425
    const segments = [
      {
        id: 'current',
        label: 'Current (Not Due)',
        amount: debtAging.current,
        pct: currentPct,
        stroke: '#6366f1', // indigo-500
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgClass: 'bg-indigo-500',
      },
      {
        id: 'days30',
        label: '1 - 30 Days Due',
        amount: debtAging.days1to30,
        pct: days30Pct,
        stroke: '#fbbf24', // amber-400
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-400',
      },
      {
        id: 'days60',
        label: '31 - 60 Days Due',
        amount: debtAging.days31to60,
        pct: days60Pct,
        stroke: '#f97316', // orange-500
        colorClass: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-500',
      },
      {
        id: 'daysOver60',
        label: '60+ Days Overdue',
        amount: debtAging.daysOver60,
        pct: daysOver60Pct,
        stroke: '#e11d48', // rose-600
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgClass: 'bg-rose-600',
      },
    ];

    let acc = 0;
    return segments.map((seg) => {
      const strokeDasharray = `${(seg.pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((acc / 100) * circumference);
      acc += seg.pct;
      return {
        ...seg,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  }, [debtAging, currentPct, days30Pct, days60Pct, daysOver60Pct]);

  const isBrandNew = invoices.length === 0 && customers.length === 0 && products.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-6 sm:space-y-8 pb-32"
    >
      {/* Top Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Financial Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {businessProfile.name || 'NexTone'} · Receivables, collections, orders, and debt aging
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onNavigateToTab('orders')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 liquid-glass-subtle hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl border border-indigo-500/20 transition-all shadow-xs"
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Orders ({orders.length})</span>
          </button>
          <button
            onClick={onOpenNewPayment}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 liquid-glass-subtle hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl border border-emerald-500/20 transition-all shadow-xs"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Record Payment</span>
          </button>
          <button
            onClick={onOpenNewInvoice}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Brand New Empty State Welcome */}
      {isBrandNew && (
        <div className="p-8 sm:p-10 rounded-3xl liquid-glass text-center max-w-xl mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Ledger Ready for Billing
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Add your first client or issue an invoice to start tracking customer debt, installment payments, and revenue in Ugandan Shillings.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              onClick={onOpenNewCustomer}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
            <button
              onClick={onOpenNewProduct}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Price Catalog</span>
            </button>
            <button
              onClick={onOpenNewInvoice}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Invoice</span>
            </button>
          </div>
        </div>
      )}

      {/* Primary 4-Stat Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Receivables (Debt) */}
        <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between border border-rose-500/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Total Outstanding Debt</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight my-0.5">
            {formatCurrency(metrics.totalDebt, activeCurrency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>{customers.length} client account{customers.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => onNavigateToTab('customers')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center"
            >
              Debtors <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Collected This Month */}
        <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between border border-emerald-500/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Collected This Month</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight my-0.5">
            {formatCurrency(metrics.totalCollectedThisMonth, activeCurrency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>{payments.length} payment{payments.length !== 1 ? 's' : ''} cleared</span>
            <button
              onClick={() => onNavigateToTab('payments')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center"
            >
              Ledger <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Total Invoiced Volume */}
        <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between border border-indigo-500/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Total Invoiced</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight my-0.5">
            {formatCurrency(metrics.totalBilled, activeCurrency)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} issued</span>
            <button
              onClick={() => onNavigateToTab('invoices')}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline flex items-center"
            >
              View <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Overdue Invoices Alert */}
        <div className="p-5 rounded-2xl liquid-glass flex flex-col justify-between border border-amber-500/10">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-semibold text-slate-600 dark:text-slate-300">Overdue Invoices</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="font-mono text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight my-0.5">
            {metrics.overdueInvoicesCount}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <span>Requiring immediate follow-up</span>
            {metrics.overdueInvoicesCount > 0 && (
              <span className="text-amber-600 font-bold">Action Needed</span>
            )}
          </div>
        </div>
      </div>

      {/* Realized Cash Profit Intelligence Panel */}
      <div className="p-5 sm:p-6 rounded-2xl liquid-glass border border-emerald-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span>Cash Realized Profit vs. Invoiced Debt</span>
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                Money Received Basis
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Net earnings realized strictly from collected payments minus production outlay, plus profits pending in customer debt
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Realized Cash Margin:</span>
            <span className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {profitSummary.realizedMarginPercent}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Realized Cash Profit */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 space-y-1">
            <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold">Realized Cash Profit</span>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="font-mono text-lg font-black text-emerald-700 dark:text-emerald-400">
              {formatCurrency(profitSummary.realizedCashProfit, activeCurrency)}
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
              Bankable earnings from payments collected
            </p>
          </div>

          {/* Locked Profit in Receivables */}
          <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Profit Locked in Debt</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="font-mono text-lg font-black text-amber-700 dark:text-amber-400">
              {formatCurrency(profitSummary.lockedProfitInReceivables, activeCurrency)}
            </div>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
              Earnings pending customer settlement
            </p>
          </div>

          {/* Production & Material Cost Basis */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <span className="font-semibold">Total Production Cost</span>
              <CreditCard className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="font-mono text-lg font-black text-slate-800 dark:text-slate-200">
              {formatCurrency(profitSummary.totalProductionCost, activeCurrency)}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Raw materials, printing blanks & overhead
            </p>
          </div>
        </div>
      </div>

      {/* Debt Aging Schedule Section with Circular Donut Ring */}
      {totalAgingDebt > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl liquid-glass space-y-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                Debt Aging & Maturity Breakdown
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Maturity distribution across unpaid customer accounts
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Unsettled: </span>
              <span className="font-mono font-bold text-sm text-slate-900 dark:text-white">
                {formatCurrency(totalAgingDebt, activeCurrency)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-1">
            {/* Circular Donut Ring / Pie Chart */}
            <div className="md:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  {/* Subtle Background Ring */}
                  <circle
                    cx="80"
                    cy="80"
                    r="58"
                    strokeWidth="14"
                    fill="none"
                    className="text-slate-100 dark:text-slate-800/80 stroke-current"
                  />
                  {/* Segment Arcs */}
                  {computedSegments.map((seg) => {
                    if (seg.pct <= 0) return null;
                    return (
                      <circle
                        key={seg.id}
                        cx="80"
                        cy="80"
                        r="58"
                        strokeWidth="14"
                        fill="none"
                        stroke={seg.stroke}
                        strokeDasharray={seg.strokeDasharray}
                        strokeDashoffset={seg.strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-700 hover:opacity-90 cursor-default"
                      />
                    );
                  })}
                </svg>

                {/* Center Ring Information */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3 pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Due
                  </span>
                  <span className="font-mono font-black text-sm sm:text-base text-slate-900 dark:text-white leading-tight mt-0.5">
                    {formatCurrency(totalAgingDebt, activeCurrency)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Receivables
                  </span>
                </div>
              </div>
            </div>

            {/* Right Side: Detailed Aging Legend & Breakdown Cards */}
            <div className="md:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {computedSegments.map((seg) => (
                <div
                  key={seg.id}
                  className="p-3.5 rounded-xl liquid-glass-subtle flex flex-col justify-between space-y-1.5 border border-slate-200/60 dark:border-slate-800/60 hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${seg.bgClass} shrink-0 shadow-xs`} />
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {seg.label}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-500 dark:text-slate-400 text-[11px]">
                      {seg.pct.toFixed(0)}%
                    </span>
                  </div>

                  <div className={`font-mono text-base font-bold ${seg.colorClass} pt-0.5`}>
                    {formatCurrency(seg.amount, activeCurrency)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Actionable Work Area: Priority Invoices vs Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Unsettled / Overdue Invoices */}
        <div className="p-5 sm:p-6 rounded-2xl liquid-glass space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60 mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Priority Pending Invoices
                </h2>
              </div>
              <button
                onClick={() => onNavigateToTab('invoices')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
              >
                <span>View All</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {unpaidInvoices.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">All invoices settled!</p>
                <p>No outstanding debt currently requires collection.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {unpaidInvoices.map((inv) => {
                  const daysOverdue = calculateDaysOverdue(inv.dueDate);
                  const isOverdue = daysOverdue > 0;

                  return (
                    <div
                      key={inv.id}
                      className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs hover:border-indigo-500/30 transition-all"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="font-mono font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
                          >
                            {inv.invoiceNumber}
                          </button>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                            {inv.customerName}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span>Due: {formatDate(inv.dueDate)}</span>
                          {isOverdue && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              ({daysOverdue}d overdue)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0 space-y-1.5">
                        <div className="font-mono font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(inv.balanceDue, inv.currency)}
                        </div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition-colors"
                            title="Preview Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onPayInvoice(inv)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors shadow-xs"
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

        {/* Right Column: Recent Payments Cleared */}
        <div className="p-5 sm:p-6 rounded-2xl liquid-glass space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60 mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Inflow Receipts
                </h2>
              </div>
              <button
                onClick={() => onNavigateToTab('payments')}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
              >
                <span>Full Ledger</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentPayments.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <CreditCard className="w-8 h-8 text-slate-400 mx-auto opacity-70" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No payments recorded</p>
                <p>Record your first installment or full settlement payment.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentPayments.map((pay) => (
                  <div
                    key={pay.id}
                    className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {pay.receiptNumber}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">·</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {pay.customerName}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDate(pay.paymentDate)} · {pay.paymentMethod.replace('_', ' ').toUpperCase()}
                        {pay.referenceNumber ? ` · ${pay.referenceNumber}` : ''}
                      </div>
                    </div>

                    <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0 text-sm">
                      + {formatCurrency(pay.amount, pay.currency)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Client Debtors Section */}
      {topDebtors.length > 0 && (
        <div className="p-5 sm:p-6 rounded-2xl liquid-glass space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Key Accounts with Outstanding Balances
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Clients holding the largest receivables on account
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('customers')}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-semibold"
            >
              <span>All Clients</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {topDebtors.map(({ customer, totalBilled, totalPaid, balanceDue }) => (
              <div
                key={customer.id}
                className="p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white truncate">
                    {customer.name}
                  </div>
                  {customer.companyName && (
                    <div className="text-[11px] text-slate-400 truncate">
                      {customer.companyName}
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Billed:</span>
                      <span className="font-mono">{formatCurrency(totalBilled, activeCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>Paid:</span>
                      <span className="font-mono text-emerald-600">{formatCurrency(totalPaid, activeCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-rose-600 dark:text-rose-400">Due:</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400">
                        {formatCurrency(balanceDue, activeCurrency)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onViewCustomerStatement(customer.id)}
                  className="w-full py-1.5 text-center text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg border border-indigo-200/80 dark:border-indigo-900 transition-colors"
                >
                  View Ledger & Statement
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
