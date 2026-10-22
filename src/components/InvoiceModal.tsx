import React, { useState, useEffect } from 'react';
import { Customer, Invoice, InvoiceItem } from '../types';
import { useLedger } from '../context/LedgerContext';
import {
  X,
  FileText,
  Calendar,
  User,
  Plus,
  Trash2,
  DollarSign,
  UserPlus,
} from 'lucide-react';
import {
  formatCurrency,
  generateInvoiceNumber,
  getDueDateDefault,
  getTodayDateString,
} from '../utils/formatters';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: Invoice | null;
  onOpenNewCustomer: () => void;
  onInvoiceSaved?: (invoice: Invoice) => void;
  preselectedCustomerId?: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceToEdit,
  onOpenNewCustomer,
  onInvoiceSaved,
  preselectedCustomerId,
}) => {
  const {
    customers,
    products,
    invoices,
    activeCurrency,
    addInvoice,
    updateInvoice,
    businessProfile,
  } = useLedger();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState(getTodayDateString());
  const [dueDate, setDueDate] = useState(getDueDateDefault(14));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [errors, setErrors] = useState<{ customer?: string; items?: string }>({});

  // Reset or load data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceToEdit) {
      setSelectedCustomerId(invoiceToEdit.customerId);
      setIssueDate(invoiceToEdit.issueDate);
      setDueDate(invoiceToEdit.dueDate);
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setItems(invoiceToEdit.items.map(it => ({ ...it })));
      setTaxPercent(invoiceToEdit.taxPercent || 0);
      setDiscountAmount(invoiceToEdit.discountAmount || 0);
      setNotes(invoiceToEdit.notes || '');
      setPaymentInstructions(invoiceToEdit.paymentInstructions || '');
    } else {
      setSelectedCustomerId(preselectedCustomerId || (customers[0]?.id || ''));
      setIssueDate(getTodayDateString());
      setDueDate(getDueDateDefault(14));
      setInvoiceNumber(generateInvoiceNumber(invoices.length));
      setTaxPercent(0);
      setDiscountAmount(0);
      setNotes('Payment due upon receipt or within net agreed terms.');
      setPaymentInstructions(
        businessProfile.mobileMoneyMerchant
          ? `${businessProfile.mobileMoneyMerchant} or ${businessProfile.bankName} Acc: ${businessProfile.bankAccount}`
          : 'Payment via Mobile Money or Bank Wire.'
      );

      // Start with 1 blank or first product item
      if (products.length > 0) {
        const p = products[0];
        setItems([
          {
            id: `item-${Date.now()}-1`,
            productId: p.id,
            productName: p.name,
            quantity: 1,
            unit: p.unit,
            unitPrice: p.unitPrice,
            total: p.unitPrice,
          },
        ]);
      } else {
        setItems([
          {
            id: `item-${Date.now()}-1`,
            productId: '',
            productName: '',
            quantity: 1,
            unit: 'pcs',
            unitPrice: 0,
            total: 0,
          },
        ]);
      }
    }
    setErrors({});
  }, [isOpen, invoiceToEdit, preselectedCustomerId]);

  if (!isOpen) return null;

  // Selected customer details
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Line item handlers
  const handleAddItem = () => {
    const defaultProduct = products[0];
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: defaultProduct ? defaultProduct.id : '',
      productName: defaultProduct ? defaultProduct.name : '',
      quantity: 1,
      unit: defaultProduct ? defaultProduct.unit : 'pcs',
      unitPrice: defaultProduct ? defaultProduct.unitPrice : 0,
      total: defaultProduct ? defaultProduct.unitPrice : 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const selectedProd = products.find(p => p.id === productId);
    if (!selectedProd) return;

    setItems(prev => {
      const updated = [...prev];
      const current = updated[index];
      const unitPrice = selectedProd.unitPrice;
      const total = current.quantity * unitPrice;
      updated[index] = {
        ...current,
        productId: selectedProd.id,
        productName: selectedProd.name,
        unit: selectedProd.unit,
        unitPrice,
        total,
      };
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const current = { ...updated[index], [field]: value };
      
      const qty = field === 'quantity' ? Number(value) || 0 : current.quantity;
      const price = field === 'unitPrice' ? Number(value) || 0 : current.unitPrice;
      current.quantity = qty;
      current.unitPrice = price;
      current.total = qty * price;

      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('An invoice must have at least one line item.');
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = items.reduce((acc, it) => acc + (it.total || 0), 0);
  const taxAmount = (subtotal * (Number(taxPercent) || 0)) / 100;
  const grandTotal = Math.max(0, subtotal + taxAmount - (Number(discountAmount) || 0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { customer?: string; items?: string } = {};

    if (!selectedCustomerId) {
      newErrors.customer = 'Please select a customer';
    }

    const validItems = items.filter(it => it.productName.trim() && it.quantity > 0 && it.unitPrice >= 0);
    if (validItems.length === 0) {
      newErrors.items = 'Please specify at least one valid line item with quantity and unit price';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const cust = customers.find(c => c.id === selectedCustomerId);

    const payload = {
      invoiceNumber: invoiceNumber || generateInvoiceNumber(invoices.length),
      customerId: selectedCustomerId,
      customerName: cust ? cust.name : 'Unknown Customer',
      ...(cust?.phone ? { customerPhone: cust.phone } : {}),
      ...(cust?.email ? { customerEmail: cust.email } : {}),
      ...(cust?.address ? { customerAddress: cust.address } : {}),
      currency: activeCurrency,
      issueDate,
      dueDate,
      items: validItems,
      subtotal,
      taxPercent: Number(taxPercent) || 0,
      taxAmount,
      discountAmount: Number(discountAmount) || 0,
      totalAmount: grandTotal,
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(paymentInstructions.trim() ? { paymentInstructions: paymentInstructions.trim() } : {}),
    };

    if (invoiceToEdit) {
      await updateInvoice(invoiceToEdit.id, payload);
      if (onInvoiceSaved) {
        onInvoiceSaved({ ...invoiceToEdit, ...payload });
      }
    } else {
      const created = await addInvoice(payload);
      if (onInvoiceSaved) {
        onInvoiceSaved(created);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/50 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl liquid-glass rounded-2xl shadow-2xl border border-white/30 dark:border-white/10 overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-glass-subtle text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                {invoiceToEdit ? `Edit Invoice: ${invoiceToEdit.invoiceNumber}` : 'Create New Invoice'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snapshots catalog unit prices at time of billing
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

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto grow">
          {/* Top row: Customer, Invoice #, Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
            {/* Customer Select */}
            <div className="md:col-span-1">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bill To Customer *
                </label>
                <button
                  type="button"
                  onClick={onOpenNewCustomer}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ New</span>
                </button>
              </div>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                    errors.customer
                      ? 'border-rose-500'
                      : 'border-slate-300 dark:border-slate-700'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  <option value="">Select a customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              {errors.customer && (
                <p className="text-xs text-rose-500 mt-1">{errors.customer}</p>
              )}
              {selectedCustomer && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Phone: {selectedCustomer.phone} {selectedCustomer.address ? `· ${selectedCustomer.address}` : ''}
                </p>
              )}
            </div>

            {/* Invoice Reference Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Dates: Issue & Due */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Line Items & Unit Prices ({activeCurrency})
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            {errors.items && (
              <p className="text-xs text-rose-500 mb-2 font-medium">{errors.items}</p>
            )}

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-3 w-[36%]">Item / Catalog Preset</th>
                      <th className="py-2.5 px-3 w-[14%]">Quantity</th>
                      <th className="py-2.5 px-3 w-[12%]">Unit</th>
                      <th className="py-2.5 px-3 w-[18%]">Unit Price ({activeCurrency})</th>
                      <th className="py-2.5 px-3 w-[15%] text-right">Total</th>
                      <th className="py-2.5 px-2 w-[5%] text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        {/* Item selector / custom name */}
                        <td className="p-2.5">
                          <div className="space-y-1.5">
                            <select
                              value={item.productId || ''}
                              onChange={(e) => handleProductSelect(index, e.target.value)}
                              className="w-full p-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                              <option value="">-- Choose from Catalog or Type Below --</option>
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({formatCurrency(p.unitPrice, activeCurrency)} / {p.unit})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              value={item.productName}
                              onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                              placeholder="Item description or custom title..."
                              className="w-full p-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full p-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </td>

                        {/* Unit */}
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                            placeholder="pcs"
                            className="w-full p-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </td>

                        {/* Unit Price (Editable snapshot) */}
                        <td className="p-2.5">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                            className="w-full p-1.5 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </td>

                        {/* Line Total */}
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(item.total, activeCurrency)}
                        </td>

                        {/* Remove Action */}
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                            title="Remove Line"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom section: Notes, instructions & Totals summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Payment Instructions & Accounts
                </label>
                <textarea
                  rows={2}
                  value={paymentInstructions}
                  onChange={(e) => setPaymentInstructions(e.target.value)}
                  placeholder="e.g. MTN MoMo Pay Merchant 894120 or Stanbic Bank Acc 9030018492041"
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Invoice Notes & Terms
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Goods once sold are not returnable without inspection. Thank you for your business."
                  className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                />
              </div>
            </div>

            {/* Financial Totals Breakdown */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Subtotal ({items.length} items):</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {formatCurrency(subtotal, activeCurrency)}
                </span>
              </div>

              {/* Tax / VAT */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Tax / VAT (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Number(e.target.value))}
                    className="w-14 p-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatCurrency(taxAmount, activeCurrency)}
                </span>
              </div>

              {/* Discount Amount */}
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                  <span>Discount ({activeCurrency}):</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                    className="w-24 p-1 text-xs font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  - {formatCurrency(discountAmount || 0, activeCurrency)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900 dark:text-white">
                  Total Invoiced Debt:
                </span>
                <span className="font-mono font-bold text-base text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(grandTotal, activeCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-colors"
            >
              {invoiceToEdit ? 'Save Changes' : 'Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
