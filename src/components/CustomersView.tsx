import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLedger } from '../context/LedgerContext';
import { Customer } from '../types';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  CreditCard,
  Printer,
  Edit2,
  Trash2,
  ArrowUpDown,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

interface CustomersViewProps {
  onOpenNewCustomer: () => void;
  onEditCustomer: (customer: Customer) => void;
  onIssueInvoiceForCustomer: (customer: Customer) => void;
  onRecordPaymentForCustomer: (customer: Customer) => void;
  onPrintCustomerStatement: (customer: Customer) => void;
  selectedCustomerIdForLedger?: string | null;
  onClearSelectedCustomerLedger?: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  onOpenNewCustomer,
  onEditCustomer,
  onIssueInvoiceForCustomer,
  onRecordPaymentForCustomer,
  onPrintCustomerStatement,
  selectedCustomerIdForLedger,
  onClearSelectedCustomerLedger,
}) => {
  const { customers, deleteCustomer, getCustomerBalance, getCustomerLedger, activeCurrency } = useLedger();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [selectedCustomerIdForLedger]);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'billed_desc' | 'name_asc'>('debt_desc');
  const [activeLedgerCustomerId, setActiveLedgerCustomerId] = useState<string | null>(
    selectedCustomerIdForLedger || null
  );

  // Sync if prop changes
  React.useEffect(() => {
    if (selectedCustomerIdForLedger) {
      setActiveLedgerCustomerId(selectedCustomerIdForLedger);
    }
  }, [selectedCustomerIdForLedger]);

  // Filter & Sort customers
  const filteredCustomers = useMemo(() => {
    const list = customers.filter((c) => {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        c.phone.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)
      );
    });

    list.sort((a, b) => {
      const balA = getCustomerBalance(a.id);
      const balB = getCustomerBalance(b.id);
      if (sortBy === 'debt_desc') {
        return balB.balanceDue - balA.balanceDue;
      }
      if (sortBy === 'billed_desc') {
        return balB.totalBilled - balA.totalBilled;
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [customers, searchQuery, sortBy, getCustomerBalance]);

  // Selected customer for detailed ledger view
  const activeCustomer = customers.find((c) => c.id === activeLedgerCustomerId);
  const activeCustomerBalance = activeCustomer ? getCustomerBalance(activeCustomer.id) : null;
  const activeCustomerLedger = activeCustomer ? getCustomerLedger(activeCustomer.id) : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-8 pb-32"
    >
      {/* View Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Customers & Debt Ledgers
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitor client debt balances, billing histories, and issue statements
          </p>
        </div>

        <button
          onClick={onOpenNewCustomer}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search and Sort Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone number, company, or address..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="sm:w-56 shrink-0 flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            <option value="debt_desc">Highest Debt First</option>
            <option value="billed_desc">Highest Revenue Billed</option>
            <option value="name_asc">Alphabetical (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Main Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2 liquid-glass rounded-2xl">
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">No customers found</p>
            <p>Add a new customer to start recording invoices and payments.</p>
          </div>
        ) : (
          filteredCustomers.map((customer) => {
            const balance = getCustomerBalance(customer.id);
            const hasDebt = balance.balanceDue > 0;

            return (
              <div
                key={customer.id}
                className={`p-5 rounded-2xl liquid-glass shadow-xs flex flex-col justify-between transition-all ${
                  activeLedgerCustomerId === customer.id
                    ? 'ring-2 ring-indigo-500/50 border-indigo-500/40'
                    : 'hover:border-slate-300/80 dark:hover:border-slate-700/80'
                }`}
              >
              <div>
                {/* Header row: Customer name & debt indicator */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {customer.name}
                    </h3>
                    {customer.companyName && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{customer.companyName}</span>
                      </p>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider shrink-0 ${
                      hasDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}
                  >
                    {hasDebt ? 'Has Debt' : 'Clear'}
                  </span>
                </div>

                {/* Contact metadata */}
                <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 my-3">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono">{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.address}</span>
                    </div>
                  )}
                  {customer.notes && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1 pt-0.5">
                      "{customer.notes}"
                    </div>
                  )}
                </div>

                {/* Financial balance breakdown card */}
                <div className="p-3.5 rounded-xl liquid-glass-subtle text-xs space-y-2 my-3">
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Lifetime Invoiced:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {formatCurrency(balance.totalBilled, activeCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span>Total Paid:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(balance.totalPaid, activeCurrency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center font-bold">
                    <span className="text-slate-900 dark:text-white">Current Balance (Debt):</span>
                    <span
                      className={`font-mono text-sm ${
                        hasDebt ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-slate-400'
                      }`}
                    >
                      {formatCurrency(balance.balanceDue, activeCurrency)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between gap-1 text-xs">
                <button
                  onClick={() => setActiveLedgerCustomerId(customer.id)}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Statement</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onIssueInvoiceForCustomer(customer)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                    title="Issue Invoice"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRecordPaymentForCustomer(customer)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-600 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                    title="Record Payment"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onPrintCustomerStatement(customer)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                    title="Print Statement"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onEditCustomer(customer)}
                    className="p-1.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                    title="Edit Customer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete customer ${customer.name}?`)) {
                        deleteCustomer(customer.id);
                        if (activeLedgerCustomerId === customer.id) {
                          setActiveLedgerCustomerId(null);
                        }
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>

      {/* Customer Statement & Ledger Drawer with Liquid Glass */}
      {activeCustomer && activeCustomerBalance && (
        <div className="mt-8 p-6 sm:p-8 rounded-2xl liquid-glass shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-5 border-b border-slate-200/60 dark:border-slate-800/60">
            <div>
              <div className="flex items-center gap-2.5">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Statement of Account: {activeCustomer.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Audit trail of all debits (invoices) and credits (payments) in chronological order
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onPrintCustomerStatement(activeCustomer)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 dark:text-white liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Statement</span>
              </button>

              <button
                onClick={() => onIssueInvoiceForCustomer(activeCustomer)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue Invoice</span>
              </button>

              <button
                onClick={() => onRecordPaymentForCustomer(activeCustomer)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pay</span>
              </button>

              <button
                onClick={() => {
                  setActiveLedgerCustomerId(null);
                  if (onClearSelectedCustomerLedger) onClearSelectedCustomerLedger();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Statement Running Balances Table */}
          <div className="rounded-xl overflow-hidden liquid-glass-subtle">
            {activeCustomerLedger.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
                No invoices or payments logged for this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3.5">Date</th>
                      <th className="py-3 px-3.5">Type</th>
                      <th className="py-3 px-3.5">Reference</th>
                      <th className="py-3 px-3.5">Description</th>
                      <th className="py-3 px-3.5 text-right">Debit (Billed)</th>
                      <th className="py-3 px-3.5 text-right">Credit (Paid)</th>
                      <th className="py-3 px-3.5 text-right">Running Debt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/60 dark:divide-slate-800/60">
                    {activeCustomerLedger.map((row) => (
                      <tr key={row.id} className="hover:bg-white/40 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="py-3 px-3.5 uppercase text-[11px] font-bold">
                          {row.type === 'invoice' ? (
                            <span className="text-rose-600 dark:text-rose-400">Invoice</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">Payment</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-medium text-slate-900 dark:text-white">
                          {row.reference}
                        </td>
                        <td className="py-3 px-3.5 text-slate-700 dark:text-slate-300 max-w-sm truncate">
                          {row.description}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-900 dark:text-white whitespace-nowrap">
                          {row.debit > 0 ? formatCurrency(row.debit, row.currency) : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {row.credit > 0 ? formatCurrency(row.credit, row.currency) : '-'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(row.runningBalance, row.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Statement Bottom Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 sm:p-5 rounded-xl liquid-glass-subtle text-xs">
            <div className="text-slate-500 dark:text-slate-400">
              Total lifetime ledger transactions: {activeCustomerLedger.length}
            </div>
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Billed: </span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {formatCurrency(activeCustomerBalance.totalBilled, activeCurrency)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Cleared: </span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(activeCustomerBalance.totalPaid, activeCurrency)}
                </span>
              </div>
              <div className="pl-4 border-l border-slate-300/60 dark:border-slate-700/60">
                <span className="text-slate-500 dark:text-slate-400">Current Debt: </span>
                <span className="font-mono font-black text-sm text-rose-600 dark:text-rose-400">
                  {formatCurrency(activeCustomerBalance.balanceDue, activeCurrency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
