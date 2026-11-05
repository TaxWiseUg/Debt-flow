import React, { useState, useRef } from 'react';
import { Customer, Invoice, Payment, ClientOrder } from '../types';
import { useLedger } from '../context/LedgerContext';
import {
  X,
  Printer,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Globe,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  formatCurrency,
} from '../utils/formatters';
import { exportElementToPdf, exportElementToPng } from '../utils/documentExport';

export type DocumentType = 'invoice' | 'receipt' | 'statement' | 'order';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: DocumentType;
  invoice?: Invoice | null;
  payment?: Payment | null;
  customer?: Customer | null;
  order?: ClientOrder | null;
}

const formatDisplayDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  documentType,
  invoice,
  payment,
  customer,
  order,
}) => {
  const { businessProfile, activeCurrency, invoices, payments, getCustomerLedger, getCustomerBalance } = useLedger();
  
  const [exportingState, setExportingState] = useState<'pdf' | 'png' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Company details - Strictly NexTone
  const companyName = 'NexTone';
  const rawTagline = businessProfile?.tagline || '';
  const companyTagline = (!rawTagline || rawTagline.toLowerCase().includes('invoicing'))
    ? 'Printing, Branding & Custom Media Solutions'
    : rawTagline;
  const companyPhone = businessProfile?.phone || '+256 700 123456';
  const companyEmail = businessProfile?.email && !businessProfile.email.includes('ledgerflow')
    ? businessProfile.email
    : 'orders@nextone.ug';

  // Customer ledger & balances
  const targetCustomerId =
    customer?.id ||
    invoice?.customerId ||
    payment?.customerId ||
    order?.customerId ||
    '';

  const customerDebt = targetCustomerId ? getCustomerBalance(targetCustomerId) : null;
  const ledgerEntries = customer ? getCustomerLedger(customer.id) : [];

  // Customer Invoices & Payments for Statements
  const customerInvoices = (targetCustomerId
    ? invoices
        .filter(inv => inv.customerId === targetCustomerId)
        .sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime())
    : []);

  const customerPayments = (targetCustomerId
    ? payments.filter(p => p.customerId === targetCustomerId)
    : []);

  // Statement Totals: Total Invoiced, Total Paid, and Outstanding Balance
  const statementTotals = {
    totalInvoiced: customerInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0),
    totalPaid: customerInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0),
    totalBalance: customerInvoices.reduce((sum, inv) => sum + (inv.balanceDue || 0), 0),
  };

  const formatInvoiceSummary = (inv: Invoice) => {
    if (!inv.items || inv.items.length === 0) return 'General Printing & Services';
    return inv.items
      .map(it => `${it.productName}${it.quantity ? ` (${it.quantity} ${it.unit || 'pcs'})` : ''}`)
      .join(', ');
  };

  // For receipts: find linked invoice if applicable
  const linkedInvoice = (() => {
    if (documentType !== 'receipt' || !payment) return null;
    if (payment.invoiceId) {
      const match = invoices.find(inv => inv.id === payment.invoiceId);
      if (match) return match;
    }
    if (payment.invoiceNumber) {
      const match = invoices.find(inv => inv.invoiceNumber === payment.invoiceNumber);
      if (match) return match;
    }
    return null;
  })();

  // Document Title
  const documentTitle = (() => {
    switch (documentType) {
      case 'invoice':
        return 'INVOICE';
      case 'order':
        return 'QUOTATION';
      case 'receipt':
        return 'RECEIPT';
      case 'statement':
        return 'STATEMENT';
      default:
        return 'INVOICE';
    }
  })();

  // Document Number
  const documentNumber = (() => {
    if (documentType === 'invoice' && invoice) return invoice.invoiceNumber;
    if (documentType === 'order' && order) return order.orderNumber;
    if (documentType === 'receipt' && payment) return payment.receiptNumber;
    if (documentType === 'statement' && customer) {
      const code = (customer.name || 'CLIENT')
        .replace(/[^a-zA-Z0-9]/g, '')
        .slice(0, 5)
        .toUpperCase();
      const year = new Date().getFullYear();
      return `STM-${year}-${code}`;
    }
    return '01234';
  })();

  // Document Date
  const documentDate = (() => {
    if (documentType === 'invoice' && invoice) return formatDisplayDate(invoice.issueDate);
    if (documentType === 'order' && order) return formatDisplayDate(order.orderDate);
    if (documentType === 'receipt' && payment) return formatDisplayDate(payment.paymentDate);
    return formatDisplayDate(new Date().toISOString());
  })();

  // Customer Information
  const clientName =
    (documentType === 'invoice' && invoice?.customerName) ||
    (documentType === 'order' && order?.customerName) ||
    (documentType === 'receipt' && payment?.customerName) ||
    (documentType === 'statement' && customer?.name) ||
    'Valued Client';

  const clientAddress =
    (documentType === 'invoice' && invoice?.customerAddress) ||
    (documentType === 'order' && order?.customerAddress) ||
    customer?.address ||
    'Kampala, Uganda';

  const clientPhone =
    (documentType === 'invoice' && invoice?.customerPhone) ||
    (documentType === 'order' && order?.customerPhone) ||
    customer?.phone ||
    '';

  const clientCompany = customer?.companyName;
  const clientTaxId = customer?.taxId;

  // Notes
  const notesText =
    (documentType === 'invoice' && invoice?.notes) ||
    (documentType === 'order' && order?.notes) ||
    (documentType === 'receipt' && payment?.notes) ||
    'We prioritize customer satisfaction. Our team is dedicated to delivering exceptional quality printing and branding solutions, ensuring complete satisfaction on every project.';

  // Totals calculations
  const subtotal =
    documentType === 'invoice' && invoice ? invoice.subtotal :
    documentType === 'order' && order ? order.subtotal :
    documentType === 'receipt' && payment ? payment.amount :
    documentType === 'statement' ? statementTotals.totalInvoiced : 0;

  const taxPercent =
    documentType === 'invoice' && invoice ? invoice.taxPercent :
    documentType === 'order' && order ? order.taxPercent : 0;

  const taxAmount =
    documentType === 'invoice' && invoice ? invoice.taxAmount :
    documentType === 'order' && order ? order.taxAmount : 0;

  const discountAmount =
    documentType === 'invoice' && invoice ? invoice.discountAmount :
    documentType === 'order' && order ? order.discountAmount : 0;

  const discountPercent =
    documentType === 'invoice' && invoice ? invoice.discountPercent :
    documentType === 'order' && order ? order.discountPercent : 0;

  const grandTotal =
    documentType === 'invoice' && invoice ? invoice.totalAmount :
    documentType === 'order' && order ? order.totalAmount :
    documentType === 'receipt' && payment ? payment.amount :
    documentType === 'statement' ? statementTotals.totalBalance : 0;

  const currency =
    (documentType === 'invoice' && invoice?.currency) ||
    (documentType === 'order' && order?.currency) ||
    (documentType === 'receipt' && payment?.currency) ||
    activeCurrency;

  const exportFilename = `NexTone_${documentTitle}_${documentNumber}`;

  // Download Handlers
  const handleDownloadPdf = async () => {
    const target = previewRef.current || exportRef.current;
    if (!target) return;
    setExportingState('pdf');
    setExportError(null);
    try {
      await exportElementToPdf(target, {
        filename: exportFilename,
        backgroundColor: '#F6F4EB',
        pixelRatio: 2,
      });
    } catch (err) {
      console.error('PDF export failed', err);
      setExportError('Unable to generate PDF automatically. You can also use Print / Save as PDF.');
    } finally {
      setExportingState(null);
    }
  };

  const handleDownloadPng = async () => {
    const target = previewRef.current || exportRef.current;
    if (!target) return;
    setExportingState('png');
    setExportError(null);
    try {
      await exportElementToPng(target, {
        filename: exportFilename,
        backgroundColor: '#F6F4EB',
        pixelRatio: 2,
      });
    } catch (err) {
      console.error('PNG export failed', err);
      setExportError('Unable to generate PNG image.');
    } finally {
      setExportingState(null);
    }
  };

  return (
    <div className="print-modal-container fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="print-card-wrapper relative w-full max-w-4xl bg-slate-950 text-slate-900 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[96vh] flex flex-col border border-white/20 animate-modal-pop">
        
        {/* Top Control Bar (Hidden when printing/saving PDF) */}
        <div className="no-print flex items-center justify-between px-4 sm:px-6 py-3.5 bg-slate-950 text-white shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold tracking-tight">
                {documentTitle}: {documentNumber}
              </p>
              <p className="text-[10px] sm:text-[11px] text-slate-400">NexTone Document · PDF & PNG Downloads Available</p>
            </div>
          </div>

          {/* Action Buttons: PDF, PNG, Print, Close */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={exportingState !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60 rounded-xl shadow-md transition-all active:scale-95"
              title="Download high-resolution PDF document"
            >
              {exportingState === 'pdf' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>{exportingState === 'pdf' ? 'Saving...' : 'PDF'}</span>
            </button>

            {/* Download PNG */}
            <button
              onClick={handleDownloadPng}
              disabled={exportingState !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-teal-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-teal-500/40 disabled:opacity-60 rounded-xl shadow-sm transition-all active:scale-95"
              title="Download high-resolution PNG image"
            >
              {exportingState === 'png' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5" />
              )}
              <span>{exportingState === 'png' ? 'Saving...' : 'PNG'}</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl transition-all"
              title="Open browser print dialog"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors ml-0.5"
              aria-label="Close document modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error notification banner if any */}
        {exportError && (
          <div className="no-print bg-rose-500/10 border-b border-rose-500/20 px-4 py-2 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{exportError}</span>
          </div>
        )}

        {/* Scrollable Viewport - Fully responsive, zero horizontal scrolling */}
        <div className="overflow-y-auto grow p-2.5 sm:p-6 bg-slate-900/60">
          
          {/* Printable Document Sheet (Interactive Responsive View) */}
          <div
            ref={previewRef}
            className="printable-document relative mx-auto w-full max-w-3xl bg-[#F6F4EB] text-slate-900 rounded-3xl p-5 sm:p-12 shadow-2xl border border-white/60 select-text"
          >
            
            {/* Top-Right Decorative Arc (Vector SVG) */}
            <div className="absolute top-0 right-0 pointer-events-none select-none overflow-hidden w-48 h-48 sm:w-80 sm:h-80">
              <svg
                className="w-full h-full"
                viewBox="0 0 350 350"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="topTealArc" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0B4A54" />
                    <stop offset="50%" stopColor="#1B7382" />
                    <stop offset="100%" stopColor="#5CBDB9" />
                  </linearGradient>
                </defs>
                <circle cx="350" cy="0" r="310" stroke="#E2EFEA" strokeWidth="24" opacity="0.6" fill="none" />
                <circle cx="350" cy="0" r="230" stroke="#EAF4F1" strokeWidth="16" opacity="0.8" fill="none" />
                <path
                  d="M 100,0 C 100,140 210,250 350,250 L 350,0 Z"
                  fill="url(#topTealArc)"
                />
                <path
                  d="M 160,0 C 160,105 245,190 350,190 L 350,0 Z"
                  fill="#F6F4EB"
                />
              </svg>
            </div>

            {/* Bottom-Left Decorative Arc (Vector SVG) */}
            <div className="absolute bottom-0 left-0 pointer-events-none select-none overflow-hidden w-40 h-40 sm:w-64 sm:h-64">
              <svg
                className="w-full h-full"
                viewBox="0 0 260 260"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="bottomTealArc" x1="100%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#0B4A54" />
                    <stop offset="60%" stopColor="#1B7382" />
                    <stop offset="100%" stopColor="#5CBDB9" />
                  </linearGradient>
                </defs>
                <path
                  d="M 0,140 C 80,140 140,200 140,260 L 0,260 Z"
                  fill="url(#bottomTealArc)"
                  opacity="0.9"
                />
                <path
                  d="M 0,190 C 50,190 90,230 90,260 L 0,260 Z"
                  fill="#F6F4EB"
                />
              </svg>
            </div>

            {/* Document Content */}
            <div className="relative z-10 flex flex-col justify-between min-h-full">
              <div>
                
                {/* DESKTOP & PRINT HEADER (Side-by-side 2-column layout) */}
                <div className="hidden sm:flex print-force-flex justify-between items-start gap-8">
                  {/* Top-Left: NexTone Branding & Customer Details */}
                  <div className="space-y-6 max-w-sm">
                    {/* NexTone Geometric Logo + Brand Name */}
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#0B4A54] via-[#1B7382] to-[#3AA2A0] p-2 flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
                          <path
                            d="M4 7C4 5.34315 5.34315 4 7 4H10C11.6569 4 13 5.34315 13 7V17C13 18.6569 11.6569 20 10 20H7C5.34315 20 4 18.6569 4 17V7Z"
                            fill="currentColor"
                            fillOpacity="0.85"
                          />
                          <path
                            d="M12 7C12 5.34315 13.3431 4 15 4H17C18.6569 4 20 5.34315 20 7V13C20 14.6569 18.6569 16 17 16H15C13.3431 16 12 14.6569 12 13V7Z"
                            fill="#88E2DD"
                          />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-xl font-extrabold tracking-wider text-[#0A2635] leading-none">
                          {companyName}
                        </h1>
                        <p className="text-[11px] text-[#4A6472] font-medium tracking-tight mt-1">
                          {companyTagline}
                        </p>
                      </div>
                    </div>

                    {/* Customer Info Block */}
                    <div className="space-y-1 pt-1">
                      <p className="text-xs font-bold tracking-widest text-[#0A2635] uppercase">
                        {documentType === 'receipt' ? 'RECEIVED FROM' : documentType === 'order' ? 'PREPARED FOR' : 'PAYABLE TO'}
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {clientName}
                      </p>
                      {clientCompany && (
                        <p className="text-xs text-slate-700 font-medium">{clientCompany}</p>
                      )}
                      <p className="text-xs text-slate-600">
                        {clientAddress}
                      </p>
                      {clientPhone && (
                        <p className="text-xs text-slate-600 font-medium">{clientPhone}</p>
                      )}
                      {clientTaxId && (
                        <p className="text-xs font-mono text-slate-500">TIN: {clientTaxId}</p>
                      )}
                    </div>
                  </div>

                  {/* Top-Right: Document Title, Number, Date */}
                  <div className="text-right space-y-3 shrink-0 self-start">
                    <h2 className="text-3xl sm:text-4xl font-extrabold tracking-[0.2em] text-[#0A2635] uppercase">
                      {documentTitle}
                    </h2>
                    <div className="text-xs text-slate-700 space-y-1">
                      <p>
                        <span className="text-slate-500">Number:</span>{' '}
                        <span className="font-semibold text-slate-900 font-mono">{documentNumber}</span>
                      </p>
                      <p>
                        <span className="text-slate-500">Date:</span>{' '}
                        <span className="font-semibold text-slate-900">{documentDate}</span>
                      </p>
                      {documentType === 'invoice' && invoice?.dueDate && (
                        <p>
                          <span className="text-slate-500">Due Date:</span>{' '}
                          <span className="font-semibold text-slate-900">{formatDisplayDate(invoice.dueDate)}</span>
                        </p>
                      )}
                      {documentType === 'order' && order?.deliveryDate && (
                        <p>
                          <span className="text-slate-500">Target Delivery:</span>{' '}
                          <span className="font-semibold text-slate-900">{formatDisplayDate(order.deliveryDate)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* MOBILE RESPONSIVE HEADER (sm:hidden, print-force-hidden) */}
                <div className="sm:hidden print-force-hidden space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-br from-[#0B4A54] via-[#1B7382] to-[#3AA2A0] p-1.5 flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
                          <path
                            d="M4 7C4 5.34315 5.34315 4 7 4H10C11.6569 4 13 5.34315 13 7V17C13 18.6569 11.6569 20 10 20H7C5.34315 20 4 18.6569 4 17V7Z"
                            fill="currentColor"
                            fillOpacity="0.85"
                          />
                          <path
                            d="M12 7C12 5.34315 13.3431 4 15 4H17C18.6569 4 20 5.34315 20 7V13C20 14.6569 18.6569 16 17 16H15C13.3431 16 12 14.6569 12 13V7Z"
                            fill="#88E2DD"
                          />
                        </svg>
                      </div>
                      <div>
                        <h1 className="text-base font-extrabold tracking-wide text-[#0A2635] leading-none">
                          {companyName}
                        </h1>
                        <p className="text-[10px] text-[#4A6472] font-medium tracking-tight mt-0.5">
                          Printing & Branding
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 text-xs font-black tracking-widest text-[#0A2635] bg-[#E2EFEA] rounded-lg uppercase">
                        {documentTitle}
                      </span>
                      <p className="text-[11px] font-mono font-semibold text-slate-800 mt-1">
                        #{documentNumber}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {documentDate}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 border border-slate-200/60 space-y-0.5">
                    <p className="text-[10px] font-bold tracking-widest text-[#0A2635] uppercase">
                      {documentType === 'receipt' ? 'RECEIVED FROM' : documentType === 'order' ? 'PREPARED FOR' : 'PAYABLE TO'}
                    </p>
                    <p className="text-xs font-bold text-slate-900">
                      {clientName}
                    </p>
                    {clientCompany && (
                      <p className="text-[11px] text-slate-700 font-medium">{clientCompany}</p>
                    )}
                    <p className="text-[11px] text-slate-600">
                      {clientAddress} {clientPhone ? `· ${clientPhone}` : ''}
                    </p>
                  </div>
                </div>

                {/* ITEM DESCRIPTION SECTION */}
                <div className="mt-6 sm:mt-8">
                  {/* Desktop / Print Table Header Banner */}
                  <div className="hidden sm:flex print-force-flex bg-gradient-to-r from-[#0C4E5B] via-[#16707F] to-[#2DA3A3] text-white rounded-2xl py-3 px-6 shadow-sm items-center text-xs font-bold uppercase tracking-wider">
                    <div className="flex-1 text-left">
                      {documentType === 'statement' ? 'INVOICE & PARTICULARS' : 'ITEM DESCRIPTION'}
                    </div>
                    {documentType === 'statement' ? (
                      <>
                        <div className="w-28 shrink-0 text-right">TOTAL INVOICE</div>
                        <div className="w-28 shrink-0 text-right">AMOUNT PAID</div>
                        <div className="w-28 shrink-0 text-right">BALANCE DUE</div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 shrink-0 text-center">QTY</div>
                        <div className="w-28 shrink-0 text-right">
                          {documentType === 'receipt' ? 'AMOUNT PAID' : 'PRICE'}
                        </div>
                        <div className="w-28 shrink-0 text-right">TOTAL</div>
                      </>
                    )}
                  </div>

                  {/* Mobile Table Header Banner */}
                  <div className="sm:hidden print-force-hidden bg-gradient-to-r from-[#0C4E5B] via-[#16707F] to-[#2DA3A3] text-white rounded-xl py-2 px-3.5 shadow-sm flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                    <span>
                      {documentType === 'statement'
                        ? 'INVOICE BREAKDOWN'
                        : documentType === 'receipt'
                        ? 'PAYMENT PARTICULARS'
                        : 'ITEMS & SERVICES'}
                    </span>
                    <span>{documentType === 'statement' ? 'BALANCE DUE' : 'TOTAL'}</span>
                  </div>

                  {/* Content Card */}
                  <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 mt-2 border border-slate-100/90 divide-y divide-slate-100">
                    
                    {/* 1. INVOICE ITEMS */}
                    {documentType === 'invoice' && invoice && invoice.items.map((item, idx) => (
                      <React.Fragment key={item.id || idx}>
                        {/* Desktop & Print Row */}
                        <div className="hidden sm:flex print-force-flex py-3 items-center text-xs text-slate-800 first:pt-0 last:pb-0">
                          <div className="flex-1 text-left pr-4">
                            <p className="text-slate-900 font-semibold">{item.productName}</p>
                            {item.unit && <p className="text-[11px] text-slate-500 mt-0.5">Unit: {item.unit}</p>}
                          </div>
                          <div className="w-16 shrink-0 text-center font-mono text-slate-700">
                            {item.quantity}
                          </div>
                          <div className="w-28 shrink-0 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(item.unitPrice, invoice.currency)}
                          </div>
                          <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(item.total, invoice.currency)}
                          </div>
                        </div>

                        {/* Mobile Optimized Item */}
                        <div className="sm:hidden print-force-hidden py-2.5 first:pt-0 last:pb-0 space-y-1">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {item.productName}
                          </p>
                          <div className="flex justify-between items-center text-[11px] text-slate-600">
                            <span className="font-mono">
                              Qty: <strong className="text-slate-900">{item.quantity}</strong> {item.unit ? `(${item.unit})` : ''} × {formatCurrency(item.unitPrice, invoice.currency)}
                            </span>
                            <span className="font-mono font-bold text-xs text-[#0A2635]">
                              {formatCurrency(item.total, invoice.currency)}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}

                    {/* 2. ORDER ITEMS */}
                    {documentType === 'order' && order && order.items.map((item, idx) => (
                      <React.Fragment key={item.id || idx}>
                        {/* Desktop & Print Row */}
                        <div className="hidden sm:flex print-force-flex py-3 items-center text-xs text-slate-800 first:pt-0 last:pb-0">
                          <div className="flex-1 text-left pr-4">
                            <p className="text-slate-900 font-semibold">{item.productName}</p>
                            {item.unit && <p className="text-[11px] text-slate-500 mt-0.5">Unit: {item.unit}</p>}
                          </div>
                          <div className="w-16 shrink-0 text-center font-mono text-slate-700">
                            {item.quantity}
                          </div>
                          <div className="w-28 shrink-0 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(item.unitPrice, order.currency)}
                          </div>
                          <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(item.total, order.currency)}
                          </div>
                        </div>

                        {/* Mobile Optimized Item */}
                        <div className="sm:hidden print-force-hidden py-2.5 first:pt-0 last:pb-0 space-y-1">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {item.productName}
                          </p>
                          <div className="flex justify-between items-center text-[11px] text-slate-600">
                            <span className="font-mono">
                              Qty: <strong className="text-slate-900">{item.quantity}</strong> {item.unit ? `(${item.unit})` : ''} × {formatCurrency(item.unitPrice, order.currency)}
                            </span>
                            <span className="font-mono font-bold text-xs text-[#0A2635]">
                              {formatCurrency(item.total, order.currency)}
                            </span>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}

                    {/* 3. RECEIPT PAYMENT ROW & BALANCE BREAKDOWN */}
                    {documentType === 'receipt' && payment && (
                      <>
                        {/* Desktop & Print Payment Row */}
                        <div className="hidden sm:flex print-force-flex py-3.5 items-center text-xs text-slate-800 first:pt-0">
                          <div className="flex-1 text-left pr-4">
                            <p className="text-slate-900 font-bold text-sm">
                              {payment.invoiceNumber
                                ? `Official Payment for Invoice #${payment.invoiceNumber}`
                                : 'Account Balance Settlement / Payment Received'}
                            </p>
                            {payment.referenceNumber && (
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                Transaction Reference: {payment.referenceNumber}
                              </p>
                            )}
                          </div>
                          <div className="w-16 shrink-0 text-center font-mono text-slate-700">1</div>
                          <div className="w-28 shrink-0 text-right font-mono text-slate-700 whitespace-nowrap">
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                          <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                        </div>

                        {/* Mobile Payment Row */}
                        <div className="sm:hidden print-force-hidden py-2.5 first:pt-0 space-y-1.5">
                          <p className="text-xs font-bold text-slate-900 leading-snug">
                            {payment.invoiceNumber
                              ? `Official Payment for Invoice #${payment.invoiceNumber}`
                              : 'Account Balance Settlement / Payment Received'}
                          </p>
                          {payment.referenceNumber && (
                            <p className="text-[10px] text-slate-500 font-mono">
                              Ref: {payment.referenceNumber}
                            </p>
                          )}
                          <div className="flex justify-between items-center text-[11px] pt-0.5">
                            <span className="text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                              Amount Paid:
                            </span>
                            <span className="font-mono font-black text-xs text-[#0B4A54]">
                              {formatCurrency(payment.amount, payment.currency)}
                            </span>
                          </div>
                        </div>

                        {/* Linked Invoice Detailed Balance Overview Row */}
                        {linkedInvoice && (
                          <>
                            {/* Desktop/Print Version */}
                            <div className="hidden sm:flex print-force-flex py-3 items-center text-xs text-slate-700 bg-slate-50/70 -mx-6 px-6 border-t border-slate-100">
                              <div className="flex-1 text-left pr-4">
                                <p className="font-semibold text-slate-800">
                                  Invoice #{linkedInvoice.invoiceNumber} Balance Status
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Total Billed: {formatCurrency(linkedInvoice.totalAmount, linkedInvoice.currency)} · Cumulative Paid: {formatCurrency(linkedInvoice.paidAmount, linkedInvoice.currency)}
                                </p>
                              </div>
                              <div className="w-16 shrink-0 text-center font-mono text-slate-400">-</div>
                              <div className="w-28 shrink-0 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                Balance Due:
                              </div>
                              <div className={`w-28 shrink-0 text-right font-mono font-bold whitespace-nowrap ${linkedInvoice.balanceDue > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}`}>
                                {formatCurrency(linkedInvoice.balanceDue, linkedInvoice.currency)}
                              </div>
                            </div>

                            {/* Mobile Callout Card */}
                            <div className="sm:hidden print-force-hidden bg-slate-50 rounded-xl p-3 mt-2 border border-slate-200/70 space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                                  Invoice #{linkedInvoice.invoiceNumber} Balance
                                </span>
                                {linkedInvoice.balanceDue === 0 ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                    Fully Paid
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                    Balance Remaining
                                  </span>
                                )}
                              </div>
                              <div className="flex justify-between items-center text-[11px] text-slate-600">
                                <span>Total Billed:</span>
                                <span className="font-mono">{formatCurrency(linkedInvoice.totalAmount, linkedInvoice.currency)}</span>
                              </div>
                              <div className="flex justify-between items-center text-[11px] text-slate-600">
                                <span>Total Paid to Date:</span>
                                <span className="font-mono text-emerald-700 font-medium">{formatCurrency(linkedInvoice.paidAmount, linkedInvoice.currency)}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-slate-200">
                                <span className="text-slate-800">Remaining Balance:</span>
                                <span className={`font-mono ${linkedInvoice.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                  {formatCurrency(linkedInvoice.balanceDue, linkedInvoice.currency)}
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    )}

                    {/* 4. CUSTOMER STATEMENT: INVOICE-BY-INVOICE BREAKDOWN (Total Amount, Amount Paid, Balance) */}
                    {documentType === 'statement' && (
                      customerInvoices.length > 0 ? (
                        customerInvoices.map((inv) => (
                          <React.Fragment key={inv.id}>
                            {/* Desktop & Print Row */}
                            <div className="hidden sm:flex print-force-flex py-3 items-center text-xs text-slate-800 first:pt-0 last:pb-0">
                              <div className="flex-1 text-left pr-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-900 font-bold font-mono text-sm">
                                    #{inv.invoiceNumber}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    inv.balanceDue === 0
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : inv.paidAmount > 0
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}>
                                    {inv.balanceDue === 0 ? 'Fully Paid' : inv.paidAmount > 0 ? 'Partially Paid' : 'Unpaid'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 mt-1 font-medium">
                                  {formatInvoiceSummary(inv)}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  Issued: {formatDisplayDate(inv.issueDate)}
                                  {inv.dueDate ? ` · Due: ${formatDisplayDate(inv.dueDate)}` : ''}
                                </p>
                              </div>

                              <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                {formatCurrency(inv.totalAmount, inv.currency)}
                              </div>
                              <div className="w-28 shrink-0 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                                {formatCurrency(inv.paidAmount, inv.currency)}
                              </div>
                              <div className={`w-28 shrink-0 text-right font-mono font-bold whitespace-nowrap ${
                                inv.balanceDue > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'
                              }`}>
                                {formatCurrency(inv.balanceDue, inv.currency)}
                              </div>
                            </div>

                            {/* Mobile Version with 3-Box Metrics (Total, Paid, Balance) */}
                            <div className="sm:hidden print-force-hidden py-3 first:pt-0 last:pb-0 space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 font-mono">
                                      #{inv.invoiceNumber}
                                    </span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                      inv.balanceDue === 0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : inv.paidAmount > 0
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}>
                                      {inv.balanceDue === 0 ? 'PAID' : inv.paidAmount > 0 ? 'PARTIAL' : 'DUE'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                    {formatDisplayDate(inv.issueDate)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Balance</span>
                                  <span className={`text-xs font-mono font-bold ${inv.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                    {formatCurrency(inv.balanceDue, inv.currency)}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-slate-700 leading-snug">
                                {formatInvoiceSummary(inv)}
                              </p>

                              <div className="grid grid-cols-3 gap-1.5 bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 text-center">
                                <div className="border-r border-slate-200 pr-1">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Total</span>
                                  <span className="text-[11px] font-mono font-bold text-slate-900 block mt-0.5">
                                    {formatCurrency(inv.totalAmount, inv.currency)}
                                  </span>
                                </div>
                                <div className="border-r border-slate-200 px-1">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Paid</span>
                                  <span className="text-[11px] font-mono font-bold text-emerald-700 block mt-0.5">
                                    {formatCurrency(inv.paidAmount, inv.currency)}
                                  </span>
                                </div>
                                <div className="pl-1">
                                  <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Balance</span>
                                  <span className={`text-[11px] font-mono font-bold block mt-0.5 ${inv.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                    {formatCurrency(inv.balanceDue, inv.currency)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        ))
                      ) : (
                        <p className="py-4 text-center text-xs text-slate-500 italic">No invoices recorded for this customer.</p>
                      )
                    )}
                  </div>
                </div>

                {/* Bottom Section: Notes & Summary Totals */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-8 mt-5 sm:mt-6 items-start print-force-grid">
                  
                  {/* Notes Block */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] sm:text-xs font-bold tracking-widest text-[#0A2635] uppercase">
                      NOTES:
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                      {notesText}
                    </p>
                  </div>

                  {/* Summary Totals Card */}
                  <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 border border-slate-100/90 text-xs space-y-2.5">
                    
                    {/* For Statements: Show Total Invoiced, Total Paid, and Outstanding Balance */}
                    {documentType === 'statement' ? (
                      <>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-semibold uppercase tracking-wider text-[11px]">TOTAL AMOUNT INVOICED</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(statementTotals.totalInvoiced, currency)}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-emerald-700">
                          <span className="font-semibold uppercase tracking-wider text-[11px]">TOTAL AMOUNT PAID</span>
                          <span className="font-mono font-bold text-emerald-700 text-sm">
                            {formatCurrency(statementTotals.totalPaid, currency)}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                          <span className="uppercase tracking-wider text-[#0A2635]">TOTAL OUTSTANDING BALANCE</span>
                          <span className={`font-mono text-base font-black ${
                            statementTotals.totalBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                          }`}>
                            {formatCurrency(statementTotals.totalBalance, currency)}
                          </span>
                        </div>

                        {statementTotals.totalBalance === 0 ? (
                          <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-emerald-700 pt-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ALL INVOICES FULLY SETTLED</span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-rose-700 pt-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>PAYMENT DUE</span>
                          </div>
                        )}
                      </>
                    ) : documentType === 'receipt' && payment ? (
                      <>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-semibold uppercase tracking-wider text-[11px]">AMOUNT RECEIVED</span>
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {formatCurrency(payment.amount, currency)}
                          </span>
                        </div>

                        {linkedInvoice && (
                          <>
                            <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
                              <span className="font-medium uppercase tracking-wider text-[11px]">INVOICE TOTAL</span>
                              <span className="font-mono">{formatCurrency(linkedInvoice.totalAmount, linkedInvoice.currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-emerald-700">
                              <span className="font-medium uppercase tracking-wider text-[11px]">TOTAL PAID TO DATE</span>
                              <span className="font-mono font-semibold">{formatCurrency(linkedInvoice.paidAmount, linkedInvoice.currency)}</span>
                            </div>
                            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                              <span className="uppercase tracking-wider text-[#0A2635]">REMAINING INVOICE BALANCE</span>
                              <span className={`font-mono text-sm font-black ${linkedInvoice.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                                {formatCurrency(linkedInvoice.balanceDue, linkedInvoice.currency)}
                              </span>
                            </div>
                            {linkedInvoice.balanceDue === 0 && (
                              <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>INVOICE FULLY PAID</span>
                              </div>
                            )}
                          </>
                        )}

                        {/* Customer Overall Account Balance if available */}
                        {customerDebt && (!linkedInvoice || customerDebt.balanceDue !== linkedInvoice.balanceDue) && (
                          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                            <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600">CUSTOMER TOTAL BALANCE</span>
                            <span className={`font-mono font-bold ${customerDebt.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {formatCurrency(customerDebt.balanceDue, currency)}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Standard Invoice, Quotation, or Statement Totals */
                      <>
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-semibold uppercase tracking-wider text-[11px]">SUB TOTAL</span>
                          <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
                        </div>

                        {discountAmount > 0 && (
                          <div className="flex justify-between items-center text-emerald-700">
                            <span className="font-semibold uppercase tracking-wider text-[11px]">
                              DISCOUNT {discountPercent ? `(${discountPercent}%)` : ''}
                            </span>
                            <span className="font-mono">- {formatCurrency(discountAmount, currency)}</span>
                          </div>
                        )}

                        {taxAmount > 0 && (
                          <div className="flex justify-between items-center text-slate-700">
                            <span className="font-semibold uppercase tracking-wider text-[11px]">TAX ({taxPercent}%)</span>
                            <span className="font-mono">{formatCurrency(taxAmount, currency)}</span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-[#0A2635]">
                          <span className="uppercase tracking-wider">GRAND TOTAL</span>
                          <span className="font-mono text-base">{formatCurrency(grandTotal, currency)}</span>
                        </div>

                        {/* Partial Payment breakdown for Invoices */}
                        {documentType === 'invoice' && invoice && invoice.paidAmount > 0 && (
                          <>
                            <div className="flex justify-between items-center text-emerald-700 pt-1 text-xs">
                              <span className="font-semibold uppercase tracking-wider text-[11px]">PAID TO DATE</span>
                              <span className="font-mono">{formatCurrency(invoice.paidAmount, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center text-rose-700 pt-1 border-t border-slate-200 font-bold text-sm">
                              <span className="uppercase tracking-wider">BALANCE DUE</span>
                              <span className="font-mono font-black">{formatCurrency(invoice.balanceDue, currency)}</span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Footer Banner (Teal Pill with Website, Phone, Email - strictly NexTone) */}
              <div className="mt-8 sm:mt-10 bg-gradient-to-r from-[#09323B] via-[#0E4956] to-[#09323B] text-white rounded-2xl py-3 px-3 sm:px-6 shadow-md flex flex-row items-center justify-between gap-1 sm:gap-4 text-[11px] sm:text-xs font-medium print-force-flex whitespace-nowrap">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Globe className="w-3.5 h-3.5 text-[#5CBDB9]" />
                  <span>nextone.ug</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Phone className="w-3.5 h-3.5 text-[#5CBDB9]" />
                  <span>{companyPhone}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Mail className="w-3.5 h-3.5 text-[#5CBDB9]" />
                  <span>{companyEmail}</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom Quick-Action Toolbar (Hidden when printing) */}
        <div className="no-print p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-400">
            Export <strong className="text-white">{documentTitle} #{documentNumber}</strong>:
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={exportingState !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 disabled:opacity-60 rounded-lg shadow-sm transition-all"
            >
              {exportingState === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
              <span>Download PDF</span>
            </button>
            <button
              onClick={handleDownloadPng}
              disabled={exportingState !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-300 bg-slate-900 border border-teal-500/40 hover:bg-slate-800 rounded-lg shadow-sm transition-all"
            >
              {exportingState === 'png' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
              <span>Download PNG</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

      </div>

      {/* OFF-SCREEN MASTER A4 TEMPLATE (Used for High-Resolution PDF & PNG Exports) */}
      <div
        ref={exportRef}
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '0px',
          width: '820px',
          minHeight: '1140px',
          zIndex: -100,
        }}
        className="bg-[#F6F4EB] text-slate-900 p-12 select-none relative overflow-hidden"
      >
        {/* Top-Right Decorative Arc */}
        <div className="absolute top-0 right-0 pointer-events-none select-none overflow-hidden w-80 h-80">
          <svg className="w-full h-full" viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="exportTopArc" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B4A54" />
                <stop offset="50%" stopColor="#1B7382" />
                <stop offset="100%" stopColor="#5CBDB9" />
              </linearGradient>
            </defs>
            <circle cx="350" cy="0" r="310" stroke="#E2EFEA" strokeWidth="24" opacity="0.6" fill="none" />
            <circle cx="350" cy="0" r="230" stroke="#EAF4F1" strokeWidth="16" opacity="0.8" fill="none" />
            <path d="M 100,0 C 100,140 210,250 350,250 L 350,0 Z" fill="url(#exportTopArc)" />
            <path d="M 160,0 C 160,105 245,190 350,190 L 350,0 Z" fill="#F6F4EB" />
          </svg>
        </div>

        {/* Bottom-Left Decorative Arc */}
        <div className="absolute bottom-0 left-0 pointer-events-none select-none overflow-hidden w-64 h-64">
          <svg className="w-full h-full" viewBox="0 0 260 260" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="exportBottomArc" x1="100%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#0B4A54" />
                <stop offset="60%" stopColor="#1B7382" />
                <stop offset="100%" stopColor="#5CBDB9" />
              </linearGradient>
            </defs>
            <path d="M 0,140 C 80,140 140,200 140,260 L 0,260 Z" fill="url(#exportBottomArc)" opacity="0.9" />
            <path d="M 0,190 C 50,190 90,230 90,260 L 0,260 Z" fill="#F6F4EB" />
          </svg>
        </div>

        {/* Offscreen Content Container */}
        <div className="relative z-10 flex flex-col justify-between min-h-[1040px]">
          <div>
            {/* 2-Column Header */}
            <div className="flex justify-between items-start gap-8">
              <div className="space-y-6 max-w-sm">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-[#0B4A54] via-[#1B7382] to-[#3AA2A0] p-2 flex items-center justify-center shadow-sm">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-white">
                      <path d="M4 7C4 5.34315 5.34315 4 7 4H10C11.6569 4 13 5.34315 13 7V17C13 18.6569 11.6569 20 10 20H7C5.34315 20 4 18.6569 4 17V7Z" fill="currentColor" fillOpacity="0.85" />
                      <path d="M12 7C12 5.34315 13.3431 4 15 4H17C18.6569 4 20 5.34315 20 7V13C20 14.6569 18.6569 16 17 16H15C13.3431 16 12 14.6569 12 13V7Z" fill="#88E2DD" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-extrabold tracking-wider text-[#0A2635] leading-none">{companyName}</h1>
                    <p className="text-[11px] text-[#4A6472] font-medium tracking-tight mt-1">{companyTagline}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <p className="text-xs font-bold tracking-widest text-[#0A2635] uppercase">
                    {documentType === 'receipt' ? 'RECEIVED FROM' : documentType === 'order' ? 'PREPARED FOR' : 'PAYABLE TO'}
                  </p>
                  <p className="text-sm font-bold text-slate-900">{clientName}</p>
                  {clientCompany && <p className="text-xs text-slate-700 font-medium">{clientCompany}</p>}
                  <p className="text-xs text-slate-600">{clientAddress}</p>
                  {clientPhone && <p className="text-xs text-slate-600 font-medium">{clientPhone}</p>}
                  {clientTaxId && <p className="text-xs font-mono text-slate-500">TIN: {clientTaxId}</p>}
                </div>
              </div>

              <div className="text-right space-y-3 shrink-0 self-start">
                <h2 className="text-4xl font-extrabold tracking-[0.2em] text-[#0A2635] uppercase">{documentTitle}</h2>
                <div className="text-xs text-slate-700 space-y-1">
                  <p><span className="text-slate-500">Number:</span> <span className="font-semibold text-slate-900 font-mono">{documentNumber}</span></p>
                  <p><span className="text-slate-500">Date:</span> <span className="font-semibold text-slate-900">{documentDate}</span></p>
                  {documentType === 'invoice' && invoice?.dueDate && (
                    <p><span className="text-slate-500">Due Date:</span> <span className="font-semibold text-slate-900">{formatDisplayDate(invoice.dueDate)}</span></p>
                  )}
                  {documentType === 'order' && order?.deliveryDate && (
                    <p><span className="text-slate-500">Target Delivery:</span> <span className="font-semibold text-slate-900">{formatDisplayDate(order.deliveryDate)}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* 4-Column Table */}
            <div className="mt-8">
              <div className="bg-gradient-to-r from-[#0C4E5B] via-[#16707F] to-[#2DA3A3] text-white rounded-2xl py-3 px-6 shadow-sm flex items-center text-xs font-bold uppercase tracking-wider">
                <div className="flex-1 text-left">
                  {documentType === 'statement' ? 'INVOICE & PARTICULARS' : 'ITEM DESCRIPTION'}
                </div>
                {documentType === 'statement' ? (
                  <>
                    <div className="w-28 shrink-0 text-right">TOTAL INVOICE</div>
                    <div className="w-28 shrink-0 text-right">AMOUNT PAID</div>
                    <div className="w-28 shrink-0 text-right">BALANCE DUE</div>
                  </>
                ) : (
                  <>
                    <div className="w-16 shrink-0 text-center">QTY</div>
                    <div className="w-28 shrink-0 text-right">{documentType === 'receipt' ? 'AMOUNT PAID' : 'PRICE'}</div>
                    <div className="w-28 shrink-0 text-right">TOTAL</div>
                  </>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 mt-2.5 border border-slate-100 divide-y divide-slate-100">
                {documentType === 'invoice' && invoice && invoice.items.map((item, idx) => (
                  <div key={item.id || idx} className="py-3 flex items-center text-xs text-slate-800 first:pt-0 last:pb-0">
                    <div className="flex-1 text-left pr-4">
                      <p className="text-slate-900 font-semibold">{item.productName}</p>
                      {item.unit && <p className="text-[11px] text-slate-500 mt-0.5">Unit: {item.unit}</p>}
                    </div>
                    <div className="w-16 shrink-0 text-center font-mono text-slate-700">{item.quantity}</div>
                    <div className="w-28 shrink-0 text-right font-mono text-slate-700 whitespace-nowrap">{formatCurrency(item.unitPrice, invoice.currency)}</div>
                    <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.total, invoice.currency)}</div>
                  </div>
                ))}

                {documentType === 'order' && order && order.items.map((item, idx) => (
                  <div key={item.id || idx} className="py-3 flex items-center text-xs text-slate-800 first:pt-0 last:pb-0">
                    <div className="flex-1 text-left pr-4">
                      <p className="text-slate-900 font-semibold">{item.productName}</p>
                      {item.unit && <p className="text-[11px] text-slate-500 mt-0.5">Unit: {item.unit}</p>}
                    </div>
                    <div className="w-16 shrink-0 text-center font-mono text-slate-700">{item.quantity}</div>
                    <div className="w-28 shrink-0 text-right font-mono text-slate-700 whitespace-nowrap">{formatCurrency(item.unitPrice, order.currency)}</div>
                    <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(item.total, order.currency)}</div>
                  </div>
                ))}

                {documentType === 'receipt' && payment && (
                  <>
                    <div className="py-3.5 flex items-center text-xs text-slate-800 first:pt-0">
                      <div className="flex-1 text-left pr-4">
                        <p className="text-slate-900 font-bold text-sm">
                          {payment.invoiceNumber ? `Official Payment for Invoice #${payment.invoiceNumber}` : 'Account Balance Settlement / Payment Received'}
                        </p>
                        {payment.referenceNumber && (
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">Transaction Reference: {payment.referenceNumber}</p>
                        )}
                      </div>
                      <div className="w-16 shrink-0 text-center font-mono text-slate-700">1</div>
                      <div className="w-28 shrink-0 text-right font-mono text-slate-700 whitespace-nowrap">{formatCurrency(payment.amount, payment.currency)}</div>
                      <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">{formatCurrency(payment.amount, payment.currency)}</div>
                    </div>

                    {linkedInvoice && (
                      <div className="py-3 flex items-center text-xs text-slate-700 bg-slate-50/70 -mx-6 px-6 border-t border-slate-100">
                        <div className="flex-1 text-left pr-4">
                          <p className="font-semibold text-slate-800">Invoice #{linkedInvoice.invoiceNumber} Balance Status</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Total Billed: {formatCurrency(linkedInvoice.totalAmount, linkedInvoice.currency)} · Cumulative Paid: {formatCurrency(linkedInvoice.paidAmount, linkedInvoice.currency)}
                          </p>
                        </div>
                        <div className="w-16 shrink-0 text-center font-mono text-slate-400">-</div>
                        <div className="w-28 shrink-0 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Balance Due:</div>
                        <div className={`w-28 shrink-0 text-right font-mono font-bold whitespace-nowrap ${linkedInvoice.balanceDue > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'}`}>
                          {formatCurrency(linkedInvoice.balanceDue, linkedInvoice.currency)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {documentType === 'statement' && customerInvoices.map(inv => (
                  <div key={inv.id} className="py-3 flex items-center text-xs text-slate-800 first:pt-0 last:pb-0">
                    <div className="flex-1 text-left pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-900 font-bold font-mono text-sm">#{inv.invoiceNumber}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inv.balanceDue === 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inv.paidAmount > 0
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-rose-100 text-rose-800 border border-rose-200'
                        }`}>
                          {inv.balanceDue === 0 ? 'Fully Paid' : inv.paidAmount > 0 ? 'Partially Paid' : 'Unpaid'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 font-medium">{formatInvoiceSummary(inv)}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Issued: {formatDisplayDate(inv.issueDate)}
                        {inv.dueDate ? ` · Due: ${formatDisplayDate(inv.dueDate)}` : ''}
                      </p>
                    </div>
                    <div className="w-28 shrink-0 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(inv.totalAmount, inv.currency)}
                    </div>
                    <div className="w-28 shrink-0 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(inv.paidAmount, inv.currency)}
                    </div>
                    <div className={`w-28 shrink-0 text-right font-mono font-bold whitespace-nowrap ${
                      inv.balanceDue > 0 ? 'text-rose-700 font-black' : 'text-emerald-700'
                    }`}>
                      {formatCurrency(inv.balanceDue, inv.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes & Summary Totals */}
            <div className="grid grid-cols-2 gap-8 mt-6 items-start">
              <div className="space-y-1.5">
                <p className="text-xs font-bold tracking-widest text-[#0A2635] uppercase">NOTES:</p>
                <p className="text-xs text-slate-600 leading-relaxed">{notesText}</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100 text-xs space-y-2.5">
                {documentType === 'statement' ? (
                  <>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">TOTAL AMOUNT INVOICED</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(statementTotals.totalInvoiced, currency)}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-emerald-700">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">TOTAL AMOUNT PAID</span>
                      <span className="font-mono font-bold text-emerald-700 text-sm">
                        {formatCurrency(statementTotals.totalPaid, currency)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                      <span className="uppercase tracking-wider text-[#0A2635]">TOTAL OUTSTANDING BALANCE</span>
                      <span className={`font-mono text-base font-black ${
                        statementTotals.totalBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                      }`}>
                        {formatCurrency(statementTotals.totalBalance, currency)}
                      </span>
                    </div>

                    {statementTotals.totalBalance === 0 ? (
                      <div className="flex items-center justify-end gap-1.5 text-[11px] font-bold text-emerald-700 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ALL INVOICES FULLY SETTLED</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5 text-[11px] font-semibold text-rose-700 pt-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>PAYMENT DUE</span>
                      </div>
                    )}
                  </>
                ) : documentType === 'receipt' && payment ? (
                  <>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">AMOUNT RECEIVED</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(payment.amount, currency)}</span>
                    </div>

                    {linkedInvoice && (
                      <>
                        <div className="flex justify-between items-center text-slate-600 pt-2 border-t border-slate-100">
                          <span className="font-medium uppercase tracking-wider text-[11px]">INVOICE TOTAL</span>
                          <span className="font-mono">{formatCurrency(linkedInvoice.totalAmount, linkedInvoice.currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-emerald-700">
                          <span className="font-medium uppercase tracking-wider text-[11px]">TOTAL PAID TO DATE</span>
                          <span className="font-mono font-semibold">{formatCurrency(linkedInvoice.paidAmount, linkedInvoice.currency)}</span>
                        </div>
                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs font-bold">
                          <span className="uppercase tracking-wider text-[#0A2635]">REMAINING INVOICE BALANCE</span>
                          <span className={`font-mono text-sm font-black ${linkedInvoice.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                            {formatCurrency(linkedInvoice.balanceDue, linkedInvoice.currency)}
                          </span>
                        </div>
                        {linkedInvoice.balanceDue === 0 && (
                          <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>INVOICE FULLY PAID</span>
                          </div>
                        )}
                      </>
                    )}

                    {customerDebt && (!linkedInvoice || customerDebt.balanceDue !== linkedInvoice.balanceDue) && (
                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs">
                        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-600">CUSTOMER TOTAL BALANCE</span>
                        <span className={`font-mono font-bold ${customerDebt.balanceDue > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {formatCurrency(customerDebt.balanceDue, currency)}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold uppercase tracking-wider text-[11px]">SUB TOTAL</span>
                      <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
                    </div>

                    {discountAmount > 0 && (
                      <div className="flex justify-between items-center text-emerald-700">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">
                          DISCOUNT {discountPercent ? `(${discountPercent}%)` : ''}
                        </span>
                        <span className="font-mono">- {formatCurrency(discountAmount, currency)}</span>
                      </div>
                    )}

                    {taxAmount > 0 && (
                      <div className="flex justify-between items-center text-slate-700">
                        <span className="font-semibold uppercase tracking-wider text-[11px]">TAX ({taxPercent}%)</span>
                        <span className="font-mono">{formatCurrency(taxAmount, currency)}</span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-[#0A2635]">
                      <span className="uppercase tracking-wider">GRAND TOTAL</span>
                      <span className="font-mono text-base">{formatCurrency(grandTotal, currency)}</span>
                    </div>

                    {documentType === 'invoice' && invoice && invoice.paidAmount > 0 && (
                      <>
                        <div className="flex justify-between items-center text-emerald-700 pt-1 text-xs">
                          <span className="font-semibold uppercase tracking-wider text-[11px]">PAID TO DATE</span>
                          <span className="font-mono">{formatCurrency(invoice.paidAmount, currency)}</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-700 pt-1 border-t border-slate-200 font-bold text-sm">
                          <span className="uppercase tracking-wider">BALANCE DUE</span>
                          <span className="font-mono font-black">{formatCurrency(invoice.balanceDue, currency)}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Footer Pill */}
          <div className="mt-10 bg-gradient-to-r from-[#09323B] via-[#0E4956] to-[#09323B] text-white rounded-2xl py-3.5 px-6 shadow-md flex flex-row items-center justify-between gap-4 text-xs font-medium whitespace-nowrap">
            <div className="flex items-center gap-2 shrink-0">
              <Globe className="w-3.5 h-3.5 text-[#5CBDB9]" />
              <span>nextone.ug</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Phone className="w-3.5 h-3.5 text-[#5CBDB9]" />
              <span>{companyPhone}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Mail className="w-3.5 h-3.5 text-[#5CBDB9]" />
              <span>{companyEmail}</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
