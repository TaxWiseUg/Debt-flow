import React from 'react';
import { Customer, Invoice, Payment } from '../types';
import { useLedger } from '../context/LedgerContext';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  FileCheck,
  CheckCircle,
} from 'lucide-react';
import {
  formatCurrency,
  formatDate,
} from '../utils/formatters';

export type DocumentType = 'invoice' | 'receipt' | 'statement';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  invoice?: Invoice | null;
  payment?: Payment | null;
  customer?: Customer | null;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  documentType,
  invoice,
  payment,
  customer,
}) => {
  const { businessProfile, activeCurrency, getCustomerLedger, getCustomerBalance } = useLedger();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const ledgerEntries = customer ? getCustomerLedger(customer.id) : [];
  const customerBalance = customer ? getCustomerBalance(customer.id) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white text-slate-900 rounded-2xl shadow-2xl overflow-hidden my-4 max-h-[95vh] flex flex-col border border-white/20">
        {/* Top Control Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-950/90 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg liquid-glass-subtle flex items-center justify-center text-indigo-400">
              <Printer className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              {documentType === 'invoice' && `Invoice: ${invoice?.invoiceNumber}`}
              {documentType === 'receipt' && `Payment Receipt: ${payment?.receiptNumber}`}
              {documentType === 'statement' && `Statement of Account: ${customer?.name}`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet (A4 Styled Layout) */}
        <div className="printable-document p-8 sm:p-10 overflow-y-auto grow bg-white text-slate-900">
          {/* Document Header with Business Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b-2 border-slate-900">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                  LF
                </div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  {businessProfile.name}
                </h1>
              </div>
              <p className="text-xs text-slate-600 max-w-sm mb-1">{businessProfile.tagline}</p>
              <p className="text-xs text-slate-500">{businessProfile.address}</p>
              <p className="text-xs text-slate-500">Phone: {businessProfile.phone} · Email: {businessProfile.email}</p>
              {businessProfile.taxNumber && (
                <p className="text-xs font-mono font-medium text-slate-700 mt-1">{businessProfile.taxNumber}</p>
              )}
            </div>

            <div className="text-right sm:self-start">
              <span className="text-2xl font-black uppercase tracking-wider text-slate-900">
                {documentType === 'invoice' && 'INVOICE'}
                {documentType === 'receipt' && 'RECEIPT VOUCHER'}
                {documentType === 'statement' && 'STATEMENT OF ACCOUNT'}
              </span>
              <div className="mt-2 text-xs font-mono text-slate-600 space-y-1">
                {documentType === 'invoice' && invoice && (
                  <>
                    <p><span className="text-slate-400">Invoice Ref:</span> <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span></p>
                    <p><span className="text-slate-400">Issue Date:</span> {formatDate(invoice.issueDate)}</p>
                    <p><span className="text-slate-400">Due Date:</span> <span className="font-bold text-slate-900">{formatDate(invoice.dueDate)}</span></p>
                  </>
                )}
                {documentType === 'receipt' && payment && (
                  <>
                    <p><span className="text-slate-400">Receipt Ref:</span> <span className="font-bold text-slate-900">{payment.receiptNumber}</span></p>
                    <p><span className="text-slate-400">Date Paid:</span> {formatDate(payment.paymentDate)}</p>
                    {payment.referenceNumber && (
                      <p><span className="text-slate-400">Txn ID:</span> {payment.referenceNumber}</p>
                    )}
                  </>
                )}
                {documentType === 'statement' && customer && (
                  <>
                    <p><span className="text-slate-400">Statement Date:</span> {formatDate(new Date().toISOString())}</p>
                    <p><span className="text-slate-400">Account ID:</span> {customer.id}</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Customer / Client Bill To Info */}
          <div className="my-6 p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row justify-between gap-4 text-xs">
            <div>
              <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px] mb-1">
                {documentType === 'receipt' ? 'Received From:' : 'Billed To Client:'}
              </p>
              <p className="text-sm font-bold text-slate-900">
                {documentType === 'invoice' && invoice?.customerName}
                {documentType === 'receipt' && payment?.customerName}
                {documentType === 'statement' && customer?.name}
              </p>
              {customer?.companyName && (
                <p className="text-slate-700 font-medium">{customer.companyName}</p>
              )}
              {customer?.address && (
                <p className="text-slate-600">{customer.address}</p>
              )}
              {customer?.phone && (
                <p className="text-slate-600">Tel: {customer.phone}</p>
              )}
              {customer?.taxId && (
                <p className="text-slate-600 font-mono mt-0.5">{customer.taxId}</p>
              )}
            </div>

            {/* Quick Status / Net Balance Callout */}
            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 self-start">
              {documentType === 'invoice' && invoice && (
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Payment Status</p>
                  <p className={`text-sm font-bold uppercase mt-1 ${
                    invoice.balanceDue <= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {invoice.status.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Balance Due: <span className="font-mono font-bold text-slate-900">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                  </p>
                </div>
              )}
              {documentType === 'receipt' && payment && (
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Amount Received</p>
                  <p className="text-base font-black font-mono text-emerald-700 mt-0.5">
                    {formatCurrency(payment.amount, payment.currency)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 uppercase font-medium">
                    Method: {payment.paymentMethod.replace('_', ' ')} {payment.mobileMoneyNetwork ? `(${payment.mobileMoneyNetwork})` : ''}
                  </p>
                </div>
              )}
              {documentType === 'statement' && customerBalance && (
                <div>
                  <p className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">Current Total Debt</p>
                  <p className="text-base font-black font-mono text-rose-700 mt-0.5">
                    {formatCurrency(customerBalance.balanceDue, activeCurrency)}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Total Billed: {formatCurrency(customerBalance.totalBilled, activeCurrency)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* DOCUMENT BODY - INVOICE */}
          {documentType === 'invoice' && invoice && (
            <div className="space-y-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2">#</th>
                    <th className="py-2.5 px-3">Item Description</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-center">Unit</th>
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={item.id}>
                      <td className="py-3 px-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{item.productName}</td>
                      <td className="py-3 px-3 text-center font-mono">{item.quantity}</td>
                      <td className="py-3 px-3 text-center text-slate-600">{item.unit}</td>
                      <td className="py-3 px-3 text-right font-mono">{formatCurrency(item.unitPrice, invoice.currency)}</td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(item.total, invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="flex justify-end pt-4 border-t border-slate-300">
                <div className="w-64 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                  </div>
                  {invoice.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700">
                      <span>Discount:</span>
                      <span className="font-mono">- {formatCurrency(invoice.discountAmount, invoice.currency)}</span>
                    </div>
                  )}
                  {invoice.taxAmount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax / VAT ({invoice.taxPercent}%):</span>
                      <span className="font-mono">{formatCurrency(invoice.taxAmount, invoice.currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-300 text-sm">
                    <span>Total Amount:</span>
                    <span className="font-mono">{formatCurrency(invoice.totalAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Paid to Date:</span>
                    <span className="font-mono">{formatCurrency(invoice.paidAmount, invoice.currency)}</span>
                  </div>
                  <div className="flex justify-between font-black text-rose-700 pt-2 border-t border-slate-900 text-sm">
                    <span>Balance Due:</span>
                    <span className="font-mono">{formatCurrency(invoice.balanceDue, invoice.currency)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT BODY - PAYMENT RECEIPT */}
          {documentType === 'receipt' && payment && (
            <div className="space-y-6">
              <div className="p-6 rounded-xl border border-slate-300 bg-slate-50 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500">Payment Reference:</span>
                    <p className="font-mono font-bold text-slate-900 text-sm">{payment.receiptNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Transaction Date:</span>
                    <p className="font-semibold text-slate-900">{formatDate(payment.paymentDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-slate-500">Payment Channel:</span>
                    <p className="font-semibold text-slate-900 uppercase">
                      {payment.paymentMethod.replace('_', ' ')} {payment.mobileMoneyNetwork ? `· ${payment.mobileMoneyNetwork}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Network / Bank Reference:</span>
                    <p className="font-mono font-semibold text-slate-900">{payment.referenceNumber || 'N/A'}</p>
                  </div>
                </div>

                {payment.invoiceNumber && (
                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-slate-500">Applied Towards Invoice:</span>
                    <p className="font-mono font-bold text-indigo-700">{payment.invoiceNumber}</p>
                  </div>
                )}

                {payment.notes && (
                  <div className="pt-3 border-t border-slate-200">
                    <span className="text-slate-500">Remarks:</span>
                    <p className="text-slate-700 italic">{payment.notes}</p>
                  </div>
                )}

                <div className="pt-4 border-t-2 border-slate-900 flex justify-between items-center text-sm font-bold">
                  <span>Total Amount Paid:</span>
                  <span className="font-mono font-black text-lg text-emerald-800">
                    {formatCurrency(payment.amount, payment.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* DOCUMENT BODY - CUSTOMER STATEMENT */}
          {documentType === 'statement' && customer && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-900 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-2">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Reference #</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (Billed)</th>
                      <th className="py-2.5 px-3 text-right">Credit (Paid)</th>
                      <th className="py-2.5 px-3 text-right">Running Debt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-2 text-slate-600 font-mono whitespace-nowrap">{formatDate(entry.date)}</td>
                        <td className="py-2.5 px-3 font-semibold uppercase text-[11px]">
                          {entry.type === 'invoice' ? (
                            <span className="text-rose-700">Invoice</span>
                          ) : (
                            <span className="text-emerald-700">Payment</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-900">{entry.reference}</td>
                        <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{entry.description}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {entry.debit > 0 ? formatCurrency(entry.debit, entry.currency) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit, entry.currency) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {formatCurrency(entry.runningBalance, entry.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Statement Summary Box */}
              {customerBalance && (
                <div className="flex justify-end pt-4 border-t border-slate-300">
                  <div className="w-72 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total Lifetime Invoiced:</span>
                      <span className="font-mono font-semibold">{formatCurrency(customerBalance.totalBilled, activeCurrency)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>Total Payments Cleared:</span>
                      <span className="font-mono">{formatCurrency(customerBalance.totalPaid, activeCurrency)}</span>
                    </div>
                    <div className="flex justify-between font-black text-rose-700 pt-2 border-t-2 border-slate-900 text-sm">
                      <span>Outstanding Debt:</span>
                      <span className="font-mono">{formatCurrency(customerBalance.balanceDue, activeCurrency)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Instructions & Bank Details Footer */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-900 uppercase tracking-wider text-[10px] mb-1">
                Official Payment Details
              </p>
              {businessProfile.mobileMoneyMerchant && (
                <p className="text-slate-700 font-medium">
                  {businessProfile.mobileMoneyMerchant} ({businessProfile.mobileMoneyNumber})
                </p>
              )}
              {businessProfile.bankName && (
                <p className="text-slate-600">
                  Bank: {businessProfile.bankName} · Acc: {businessProfile.bankAccount}
                </p>
              )}
              {businessProfile.notes && (
                <p className="text-slate-500 text-[11px] mt-1">{businessProfile.notes}</p>
              )}
            </div>

            <div className="flex flex-col justify-end items-end sm:text-right">
              <div className="w-48 border-b border-slate-400 pb-1 text-center">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Authorized Signature</span>
              </div>
              <p className="text-[11px] font-semibold text-slate-800 mt-1">For: {businessProfile.name}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
