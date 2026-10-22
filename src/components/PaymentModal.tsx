import React, { useState, useEffect } from 'react';
import { Customer, Invoice, Payment, PaymentMethod } from '../types';
import { useLedger } from '../context/LedgerContext';
import {
  X,
  CreditCard,
  User,
  FileText,
  DollarSign,
  Calendar,
  Smartphone,
  CheckCircle,
} from 'lucide-react';
import {
  formatCurrency,
  getTodayDateString,
} from '../utils/formatters';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedCustomerId?: string;
  preselectedInvoiceId?: string;
  onPaymentRecorded?: (payment: Payment) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedCustomerId,
  preselectedInvoiceId,
  onPaymentRecorded,
}) => {
  const {
    customers,
    invoices,
    activeCurrency,
    addPayment,
    getCustomerBalance,
  } = useLedger();

  const [customerId, setCustomerId] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');
  const [mobileMoneyNetwork, setMobileMoneyNetwork] = useState<'MTN' | 'Airtel' | 'M-Pesa' | 'Other'>('MTN');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ customer?: string; amount?: string }>({});

  useEffect(() => {
    if (!isOpen) return;

    if (preselectedInvoiceId) {
      const inv = invoices.find(i => i.id === preselectedInvoiceId);
      if (inv) {
        setCustomerId(inv.customerId);
        setInvoiceId(inv.id);
        setAmount(String(inv.balanceDue > 0 ? inv.balanceDue : ''));
      }
    } else if (preselectedCustomerId) {
      setCustomerId(preselectedCustomerId);
      setInvoiceId('');
      const balance = getCustomerBalance(preselectedCustomerId);
      setAmount(balance.balanceDue > 0 ? String(balance.balanceDue) : '');
    } else {
      setCustomerId(customers[0]?.id || '');
      setInvoiceId('');
      setAmount('');
    }

    setPaymentDate(getTodayDateString());
    setPaymentMethod('mobile_money');
    setMobileMoneyNetwork('MTN');
    setReferenceNumber('');
    setNotes('');
    setErrors({});
  }, [isOpen, preselectedCustomerId, preselectedInvoiceId]);

  if (!isOpen) return null;

  // Unpaid invoices for this customer
  const customerInvoices = invoices.filter(
    inv => inv.customerId === customerId && inv.balanceDue > 0
  );

  const selectedInvoice = invoices.find(inv => inv.id === invoiceId);
  const customerBalance = customerId ? getCustomerBalance(customerId) : null;

  const handleCustomerChange = (newCustId: string) => {
    setCustomerId(newCustId);
    setInvoiceId('');
    const bal = getCustomerBalance(newCustId);
    if (bal.balanceDue > 0) {
      setAmount(String(bal.balanceDue));
    }
  };

  const handleInvoiceChange = (newInvId: string) => {
    setInvoiceId(newInvId);
    if (newInvId) {
      const inv = invoices.find(i => i.id === newInvId);
      if (inv && inv.balanceDue > 0) {
        setAmount(String(inv.balanceDue));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { customer?: string; amount?: string } = {};

    if (!customerId) {
      newErrors.customer = 'Please select a customer';
    }

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'Please enter a valid payment amount greater than zero';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const cust = customers.find(c => c.id === customerId);

    const payload = {
      customerId,
      customerName: cust ? cust.name : 'Unknown Customer',
      ...(invoiceId ? { invoiceId } : {}),
      ...(selectedInvoice?.invoiceNumber ? { invoiceNumber: selectedInvoice.invoiceNumber } : {}),
      amount: numericAmount,
      currency: activeCurrency,
      paymentDate,
      paymentMethod,
      ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
      ...(paymentMethod === 'mobile_money' && mobileMoneyNetwork ? { mobileMoneyNetwork } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    };

    const recorded = await addPayment(payload);
    if (onPaymentRecorded) {
      onPaymentRecorded(recorded);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg liquid-glass rounded-2xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-glass-subtle text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Record Payment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly decreases customer debt and settles invoices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select
                value={customerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                  errors.customer
                    ? 'border-rose-500'
                    : 'border-slate-300 dark:border-slate-700'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              >
                <option value="">Select customer...</option>
                {customers.map((c) => {
                  const bal = getCustomerBalance(c.id);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} {bal.balanceDue > 0 ? `(Debt: ${formatCurrency(bal.balanceDue, activeCurrency)})` : '(No Debt)'}
                    </option>
                  );
                })}
              </select>
            </div>
            {errors.customer && (
              <p className="text-xs text-rose-500 mt-1">{errors.customer}</p>
            )}

            {customerBalance && customerBalance.balanceDue > 0 && (
              <div className="mt-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-center justify-between text-xs text-amber-800 dark:text-amber-300">
                <span>Total Outstanding Customer Debt:</span>
                <span className="font-mono font-bold">
                  {formatCurrency(customerBalance.balanceDue, activeCurrency)}
                </span>
              </div>
            )}
          </div>

          {/* Optional: Allocate to Specific Invoice */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Apply to Specific Invoice (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select
                value={invoiceId}
                onChange={(e) => handleInvoiceChange(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- On-Account Credit (General Customer Balance) --</option>
                {customerInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} - Due: {inv.dueDate} (Balance: {formatCurrency(inv.balanceDue, activeCurrency)})
                  </option>
                ))}
              </select>
            </div>
            {selectedInvoice && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-1 px-1">
                <span>Invoice Total: {formatCurrency(selectedInvoice.totalAmount, activeCurrency)}</span>
                <button
                  type="button"
                  onClick={() => setAmount(String(selectedInvoice.balanceDue))}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Pay Exact Balance ({formatCurrency(selectedInvoice.balanceDue, activeCurrency)})
                </button>
              </div>
            )}
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Amount Paid ({activeCurrency}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 5000000"
                  className={`w-full pl-9 pr-3 py-2 text-sm font-mono font-semibold rounded-lg border ${
                    errors.amount
                      ? 'border-rose-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-rose-500 mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Payment Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Method
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'mobile_money', label: 'Mobile Money' },
                { id: 'bank_transfer', label: 'Bank Wire / EFT' },
                { id: 'cash', label: 'Cash' },
                { id: 'card', label: 'Credit / Debit Card' },
                { id: 'cheque', label: 'Cheque' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as PaymentMethod)}
                  className={`p-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                    paymentMethod === m.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile Money network if applicable */}
          {paymentMethod === 'mobile_money' && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mobile Money Operator
              </label>
              <div className="flex gap-2">
                {(['MTN', 'Airtel', 'M-Pesa', 'Other'] as const).map((net) => (
                  <button
                    key={net}
                    type="button"
                    onClick={() => setMobileMoneyNetwork(net)}
                    className={`px-3 py-1.5 rounded text-xs font-semibold border transition-colors ${
                      mobileMoneyNetwork === net
                        ? 'bg-amber-400 text-slate-900 border-amber-500'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {net}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reference Number */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Transaction ID / Cheque # / Reference
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. MOMO-3948201 or STANBIC-WIRE-8912"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Payment Remarks
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received by accountant, receipt issued."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Record & Settle</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
