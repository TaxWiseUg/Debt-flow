import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLedger } from '../context/LedgerContext';
import { Invoice, InvoiceStatus } from '../types';
import {
  FileText,
  Search,
  Filter,
  Plus,
  Printer,
  CreditCard,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
  calculateDaysOverdue,
} from '../utils/formatters';

interface InvoicesViewProps {
  onOpenNewInvoice: () => void;
  onEditInvoice: (invoice: Invoice) => void;
  onViewInvoice: (invoice: Invoice) => void;
  onPayInvoice: (invoice: Invoice) => void;
  onViewCustomerStatement: (customerId: string) => void;
}

export const InvoicesView: React.FC<InvoicesViewProps> = ({
  onOpenNewInvoice,
  onEditInvoice,
  onViewInvoice,
  onPayInvoice,
  onViewCustomerStatement,
}) => {
  const { invoices, customers, deleteInvoice, activeCurrency } = useLedger();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Search
      const matchesSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.items.some((it) => it.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status
      const matchesStatus =
        selectedStatus === 'all' || inv.status === selectedStatus;

      // Customer
      const matchesCustomer =
        selectedCustomerId === 'all' || inv.customerId === selectedCustomerId;

      return matchesSearch && matchesStatus && matchesCustomer;
    });
  }, [invoices, searchQuery, selectedStatus, selectedCustomerId]);

  // Aggregate totals for the filtered set
  const filteredTotals = useMemo(() => {
    const totalBilled = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalBalance = filteredInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    return { totalBilled, totalPaid, totalBalance };
  }, [filteredInvoices]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return;
    const headers = ['Invoice Number', 'Customer', 'Issue Date', 'Due Date', 'Status', 'Total Amount', 'Paid Amount', 'Balance Due'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      `"${inv.customerName.replace(/"/g, '""')}"`,
      inv.issueDate,
      inv.dueDate,
      inv.status,
      inv.totalAmount,
      inv.paidAmount,
      inv.balanceDue,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LedgerFlow_Invoices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusTabs: Array<{ id: string; label: string }> = [
    { id: 'all', label: 'All Invoices' },
    { id: 'overdue', label: 'Overdue' },
    { id: 'partially_paid', label: 'Partially Paid' },
    { id: 'issued', label: 'Unpaid / Issued' },
    { id: 'paid', label: 'Paid in Full' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="space-y-8 pb-32"
    >
      {/* View Header with CTA */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Invoices & Billing
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track line-item sales, overdue payment dates, and outstanding debt balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={onOpenNewInvoice}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Banner for the View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 rounded-2xl liquid-glass text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400 font-medium">Filtered Total Billed:</span>
          <p className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-1">
            {formatCurrency(filteredTotals.totalBilled, activeCurrency)}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 font-medium">Total Collected:</span>
          <p className="font-mono text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(filteredTotals.totalPaid, activeCurrency)}
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400 font-medium">Total Outstanding Debt:</span>
          <p className="font-mono text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(filteredTotals.totalBalance, activeCurrency)}
          </p>
        </div>
      </div>

      {/* Interactive Status Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 liquid-glass-subtle rounded-2xl">
        {statusTabs.map((tab) => {
          const isActive = selectedStatus === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-xl transition-all ${
                isActive
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm font-bold border border-white/80 dark:border-white/10'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Search and Customer Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative grow">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by invoice #, customer name, or item description..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="sm:w-64 shrink-0">
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Invoices High-Density Table with Liquid Glass */}
      <div className="rounded-2xl overflow-hidden liquid-glass shadow-xs">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">No invoices found</p>
            <p>Create an invoice or adjust your search filter above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3.5">Invoice #</th>
                  <th className="py-3 px-3.5">Customer</th>
                  <th className="py-3 px-3.5">Issue / Due Date</th>
                  <th className="py-3 px-3.5 text-right">Total Amount</th>
                  <th className="py-3 px-3.5 text-right">Paid</th>
                  <th className="py-3 px-3.5 text-right">Balance Due</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv) => {
                  const daysOverdue = calculateDaysOverdue(inv.dueDate);
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Invoice # */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        <button
                          onClick={() => onViewInvoice(inv)}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </button>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-3.5">
                        <button
                          onClick={() => onViewCustomerStatement(inv.customerId)}
                          className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline text-left block"
                        >
                          {inv.customerName}
                        </button>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-xs block">
                          {inv.items.map((it) => it.productName).join(', ')}
                        </span>
                      </td>

                      {/* Dates & Overdue */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="text-slate-700 dark:text-slate-300">
                          Due: {formatDate(inv.dueDate)}
                        </div>
                        {inv.balanceDue > 0 && daysOverdue > 0 && (
                          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                            {daysOverdue} days overdue
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3 px-3.5 text-right font-mono font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </td>

                      {/* Paid Amount */}
                      <td className="py-3 px-3.5 text-right font-mono text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount, inv.currency) : '-'}
                      </td>

                      {/* Balance Due (Debt) */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        {inv.balanceDue > 0 ? (
                          <span className="text-rose-600 dark:text-rose-400">
                            {formatCurrency(inv.balanceDue, inv.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Settled</span>
                        )}
                      </td>

                      {/* Status Tag (Zero-pill compliant clean text) */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {inv.status === 'paid' && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase text-[11px]">
                            Paid
                          </span>
                        )}
                        {inv.status === 'partially_paid' && (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold uppercase text-[11px]">
                            Partial
                          </span>
                        )}
                        {inv.status === 'overdue' && (
                          <span className="text-rose-600 dark:text-rose-400 font-bold uppercase text-[11px]">
                            Overdue
                          </span>
                        )}
                        {inv.status === 'issued' && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-semibold uppercase text-[11px]">
                            Issued
                          </span>
                        )}
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="View & Download Invoice (PDF / PNG)"
                          >
                            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                          </button>

                          {inv.balanceDue > 0 && (
                            <button
                              onClick={() => onPayInvoice(inv)}
                              className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors"
                              title="Record Payment for this invoice"
                            >
                              Pay
                            </button>
                          )}

                          <button
                            onClick={() => onEditInvoice(inv)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`Delete invoice ${inv.invoiceNumber}?`)) {
                                deleteInvoice(inv.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};
