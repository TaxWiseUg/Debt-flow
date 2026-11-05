import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'motion/react';
import { useLedger } from '../context/LedgerContext';
import { Payment } from '../types';
import {
  CreditCard,
  Search,
  Plus,
  Printer,
  Trash2,
  Download,
  CheckCircle,
  FileText,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

interface PaymentsViewProps {
  onOpenNewPayment: () => void;
  onPrintReceipt: (payment: Payment) => void;
  onViewCustomerStatement: (customerId: string) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onOpenNewPayment,
  onPrintReceipt,
  onViewCustomerStatement,
}) => {
  const { payments, deletePayment, activeCurrency } = useLedger();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.receiptNumber.toLowerCase().includes(q) ||
        p.customerName.toLowerCase().includes(q) ||
        (p.referenceNumber && p.referenceNumber.toLowerCase().includes(q)) ||
        (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q));

      const matchesMethod =
        selectedMethod === 'all' || p.paymentMethod === selectedMethod;

      return matchesSearch && matchesMethod;
    });
  }, [payments, searchQuery, selectedMethod]);

  const totalCollected = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;
    const headers = ['Receipt #', 'Date', 'Customer', 'Linked Invoice', 'Method', 'Network', 'Reference ID', 'Amount', 'Notes'];
    const rows = filteredPayments.map((p) => [
      p.receiptNumber,
      p.paymentDate,
      `"${p.customerName.replace(/"/g, '""')}"`,
      p.invoiceNumber || 'On-Account',
      p.paymentMethod,
      p.mobileMoneyNetwork || '',
      p.referenceNumber || '',
      p.amount,
      `"${(p.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LedgerFlow_Payments_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            Payment Inflow Ledger & Receipts
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Audit trail of customer cash collections, Mobile Money transfers, and bank settlements
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
            onClick={onOpenNewPayment}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payment</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Card with Liquid Glass */}
      <div className="p-5 sm:p-6 rounded-2xl liquid-glass shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total Filtered Collections:</span>
          <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalCollected, activeCurrency)}
          </p>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-right sm:self-center">
          <span className="px-3 py-1.5 rounded-lg liquid-glass-subtle font-mono">{filteredPayments.length} transactions recorded</span>
        </div>
      </div>

      {/* Search and Payment Method Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by receipt #, customer name, transaction reference, or invoice..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="sm:w-64 shrink-0">
          <select
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">All Payment Methods</option>
            <option value="mobile_money">Mobile Money (MTN / Airtel / M-Pesa)</option>
            <option value="bank_transfer">Bank Wire / EFT</option>
            <option value="cash">Cash</option>
            <option value="card">Credit / Debit Card</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>
      </div>

      {/* Payments Table with Liquid Glass */}
      <div className="rounded-2xl overflow-hidden liquid-glass shadow-xs">
        {filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">No payment transactions recorded</p>
            <p>Log a received payment to clear customer debt.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3.5">Receipt #</th>
                  <th className="py-3 px-3.5">Date</th>
                  <th className="py-3 px-3.5">Customer</th>
                  <th className="py-3 px-3.5">Linked Invoice</th>
                  <th className="py-3 px-3.5">Channel / Method</th>
                  <th className="py-3 px-3.5">Txn Reference</th>
                  <th className="py-3 px-3.5 text-right">Amount Cleared</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((pay) => (
                  <tr
                    key={pay.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Receipt # */}
                    <td className="py-3 px-3.5 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {pay.receiptNumber}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-mono">
                      {formatDate(pay.paymentDate)}
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-3.5">
                      <button
                        onClick={() => onViewCustomerStatement(pay.customerId)}
                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                      >
                        {pay.customerName}
                      </button>
                    </td>

                    {/* Linked Invoice */}
                    <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {pay.invoiceNumber ? (
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                          {pay.invoiceNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">On-Account</span>
                      )}
                    </td>

                    {/* Channel */}
                    <td className="py-3 px-3.5 uppercase font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {pay.paymentMethod.replace('_', ' ')}
                      {pay.mobileMoneyNetwork ? ` (${pay.mobileMoneyNetwork})` : ''}
                    </td>

                    {/* Reference */}
                    <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {pay.referenceNumber || '-'}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      + {formatCurrency(pay.amount, pay.currency)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPrintReceipt(pay)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="View & Download Receipt (PDF / PNG)"
                        >
                          <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete payment ${pay.receiptNumber}? This will restore the debt balance on any linked invoice.`
                              )
                            ) {
                              deletePayment(pay.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Payment Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
};
