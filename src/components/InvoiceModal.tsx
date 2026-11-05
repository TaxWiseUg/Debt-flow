import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Invoice, InvoiceItem, ClientOrder } from '../types';
import { useLedger } from '../context/LedgerContext';
import {
  X,
  FileText,
  Calendar,
  User,
  Plus,
  Trash2,
  UserPlus,
  Package,
  Layers,
  ChevronDown,
} from 'lucide-react';
import {
  formatCurrency,
  generateInvoiceNumber,
  getDueDateDefault,
  getTodayDateString,
} from '../utils/formatters';
import { MultiItemSelectorModal } from './MultiItemSelectorModal';
import { BottomSheetPicker, PickerOption } from './BottomSheetPicker';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceToEdit?: Invoice | null;
  initialOrder?: ClientOrder | null;
  onOpenNewCustomer: () => void;
  onInvoiceSaved?: (invoice: Invoice) => void;
  preselectedCustomerId?: string;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  invoiceToEdit,
  initialOrder,
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
  } = useLedger();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [taxPercent, setTaxPercent] = useState<number | ''>('');
  const [discountPercent, setDiscountPercent] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [errors, setErrors] = useState<{ customer?: string; items?: string }>({});
  const [showMultiSelector, setShowMultiSelector] = useState(false);

  // Bottom slide-up picker states
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [activeItemIndexForCatalog, setActiveItemIndexForCatalog] = useState<number | null>(null);

  // Reset or load data when modal opens - strictly avoid pre-filling inputs
  useEffect(() => {
    if (!isOpen) return;

    if (invoiceToEdit) {
      setSelectedCustomerId(invoiceToEdit.customerId);
      setIssueDate(invoiceToEdit.issueDate);
      setDueDate(invoiceToEdit.dueDate);
      setInvoiceNumber(invoiceToEdit.invoiceNumber);
      setItems(invoiceToEdit.items.map(it => ({ ...it })));
      setTaxPercent(invoiceToEdit.taxPercent || '');
      const pct = invoiceToEdit.discountPercent !== undefined
        ? invoiceToEdit.discountPercent
        : (invoiceToEdit.subtotal > 0 && invoiceToEdit.discountAmount > 0
            ? Math.round((invoiceToEdit.discountAmount / invoiceToEdit.subtotal) * 100)
            : '');
      setDiscountPercent(pct);
      setNotes(invoiceToEdit.notes || '');
      setPaymentInstructions(invoiceToEdit.paymentInstructions || '');
    } else if (initialOrder) {
      // Pre-fill from order to convert into invoice
      setSelectedCustomerId(initialOrder.customerId);
      setIssueDate(getTodayDateString());
      setDueDate(initialOrder.deliveryDate || getDueDateDefault(14));
      setInvoiceNumber(generateInvoiceNumber(invoices.length));
      setItems(
        initialOrder.items.map(it => ({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          unitPrice: it.unitPrice,
          discountPercent: 0,
          total: it.total,
        }))
      );
      setTaxPercent(initialOrder.taxPercent || '');
      const pct = initialOrder.discountPercent !== undefined
        ? initialOrder.discountPercent
        : (initialOrder.subtotal > 0 && initialOrder.discountAmount > 0
            ? Math.round((initialOrder.discountAmount / initialOrder.subtotal) * 100)
            : '');
      setDiscountPercent(pct);
      setNotes(
        initialOrder.notes
          ? `Generated from Order #${initialOrder.orderNumber}. ${initialOrder.notes}`
          : `Generated from Order #${initialOrder.orderNumber}`
      );
      setPaymentInstructions('');
    } else {
      // Clean, un-prefilled initial state
      setSelectedCustomerId(preselectedCustomerId || '');
      setIssueDate('');
      setDueDate('');
      setInvoiceNumber(generateInvoiceNumber(invoices.length));
      setTaxPercent('');
      setDiscountPercent('');
      setNotes('');
      setPaymentInstructions('');

      // Start with 1 empty line item - no pre-filled quantity
      setItems([
        {
          id: `item-${Date.now()}-1`,
          productId: '',
          productName: '',
          quantity: 0,
          unit: 'pcs',
          unitPrice: 0,
          total: 0,
        },
      ]);
    }
    setErrors({});
  }, [isOpen, invoiceToEdit, initialOrder, preselectedCustomerId]);

  const customerOptions: PickerOption[] = useMemo(() => {
    return customers.map(c => ({
      id: c.id,
      label: c.name,
      subtitle: [c.companyName, c.phone].filter(Boolean).join(' · '),
    }));
  }, [customers]);

  const productOptions: PickerOption[] = useMemo(() => {
    return products.map(p => ({
      id: p.id,
      label: p.name,
      subtitle: `${formatCurrency(p.unitPrice, activeCurrency)} / ${p.unit}`,
    }));
  }, [products, activeCurrency]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleBatchAddItems = (
    selectedItems: Array<{ productId: string; productName: string; unit: string; unitPrice: number; quantity: number; total: number }>
  ) => {
    const formatted: InvoiceItem[] = selectedItems.map(s => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      productId: s.productId,
      productName: s.productName,
      unit: s.unit,
      unitPrice: s.unitPrice,
      quantity: s.quantity,
      discountPercent: 0,
      total: s.total,
    }));

    setItems(prev => {
      const nonEmpties = prev.filter(it => it.productName.trim() !== '' || it.unitPrice > 0);
      return [...nonEmpties, ...formatted];
    });
  };

  if (!isOpen) return null;

  // Line item handlers
  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      productId: '',
      productName: '',
      quantity: 0,
      unit: 'pcs',
      unitPrice: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleProductSelect = (index: number, productId: string) => {
    if (!productId) {
      setItems(prev => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          productId: '',
        };
        return updated;
      });
      return;
    }

    const selectedProd = products.find(p => p.id === productId);
    if (!selectedProd) return;

    setItems(prev => {
      const updated = [...prev];
      const current = updated[index];
      const effectiveQty = current.quantity > 0 ? current.quantity : 1;
      const unitPrice = selectedProd.unitPrice;
      const total = effectiveQty * unitPrice;
      updated[index] = {
        ...current,
        productId: selectedProd.id,
        productName: selectedProd.name,
        unit: selectedProd.unit || 'pcs',
        quantity: current.quantity,
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
      
      const qty = field === 'quantity' ? (value === '' ? 0 : Number(value)) : current.quantity;
      const price = field === 'unitPrice' ? (value === '' ? 0 : Number(value)) : current.unitPrice;
      current.quantity = qty;
      current.unitPrice = price;
      const effectiveQty = qty > 0 ? qty : 1;
      current.total = effectiveQty * price;

      updated[index] = current;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // Clear the single line item instead of deleting
      setItems([
        {
          id: `item-${Date.now()}-1`,
          productId: '',
          productName: '',
          quantity: 0,
          unit: 'pcs',
          unitPrice: 0,
          total: 0,
        },
      ]);
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations with effective quantity fallback to 1
  const subtotal = items.reduce((acc, it) => {
    const qty = it.quantity > 0 ? it.quantity : 1;
    return acc + (qty * (it.unitPrice || 0));
  }, 0);
  const taxPctNum = typeof taxPercent === 'number' ? taxPercent : 0;
  const taxAmount = (subtotal * taxPctNum) / 100;
  const discountPctNum = typeof discountPercent === 'number' ? discountPercent : 0;
  const discountNum = Math.round((subtotal * discountPctNum) / 100);
  const grandTotal = Math.max(0, subtotal + taxAmount - discountNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { customer?: string; items?: string } = {};

    if (!selectedCustomerId) {
      newErrors.customer = 'Please select a customer';
    }

    const validItems = items
      .filter(it => it.productName.trim())
      .map(it => {
        const qty = it.quantity > 0 ? it.quantity : 1;
        return {
          ...it,
          quantity: qty,
          total: qty * (it.unitPrice || 0),
        };
      });

    if (validItems.length === 0) {
      newErrors.items = 'Please specify at least one item with a name or description';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const cust = customers.find(c => c.id === selectedCustomerId);

    const payload = {
      invoiceNumber: invoiceNumber || generateInvoiceNumber(invoices.length),
      ...(initialOrder ? { orderId: initialOrder.id, orderNumber: initialOrder.orderNumber } : {}),
      ...(!initialOrder && invoiceToEdit?.orderId ? { orderId: invoiceToEdit.orderId, orderNumber: invoiceToEdit.orderNumber } : {}),
      customerId: selectedCustomerId,
      customerName: cust ? cust.name : 'Unknown Customer',
      ...(cust?.phone ? { customerPhone: cust.phone } : {}),
      ...(cust?.email ? { customerEmail: cust.email } : {}),
      ...(cust?.address ? { customerAddress: cust.address } : {}),
      currency: activeCurrency,
      issueDate: issueDate || getTodayDateString(),
      dueDate: dueDate || getDueDateDefault(14),
      items: validItems,
      subtotal,
      taxPercent: taxPctNum,
      taxAmount,
      discountPercent: discountPctNum,
      discountAmount: discountNum,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl liquid-glass rounded-t-3xl sm:rounded-3xl shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden my-0 sm:my-2 max-h-[96vh] flex flex-col animate-slide-up sm:animate-modal-pop">
        {/* Header - Compact */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-white/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                {invoiceToEdit ? `Edit Invoice: ${invoiceToEdit.invoiceNumber}` : 'Create New Invoice'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Billing & debt ledger entry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Scrollable with zero horizontal scroll */}
        <form onSubmit={handleSubmit} className="p-3 sm:p-5 space-y-4 overflow-y-auto overflow-x-hidden grow">
          {/* Client & Date Details */}
          <div className="space-y-3 p-3.5 rounded-xl liquid-glass-subtle border border-slate-200/70 dark:border-slate-800/70">
            {/* Customer Select */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Customer *
                </label>
                <button
                  type="button"
                  onClick={onOpenNewCustomer}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ New Client</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(true)}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl border text-left ${
                  errors.customer
                    ? 'border-rose-500 ring-2 ring-rose-500/20'
                    : 'border-slate-300/80 dark:border-slate-700'
                } bg-white dark:bg-slate-900 text-slate-900 dark:text-white hover:border-indigo-500 transition-colors`}
              >
                <div className="flex items-center gap-2 truncate">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className={selectedCustomer ? 'font-medium truncate' : 'text-slate-400'}>
                    {selectedCustomer
                      ? `${selectedCustomer.name}${selectedCustomer.companyName ? ` (${selectedCustomer.companyName})` : ''}`
                      : 'Select a customer...'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
              {errors.customer && (
                <p className="text-xs text-rose-500 mt-1 font-medium">{errors.customer}</p>
              )}
              {selectedCustomer && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 px-1 truncate">
                  📞 {selectedCustomer.phone || 'No phone'} {selectedCustomer.address ? `• 📍 ${selectedCustomer.address}` : ''}
                </p>
              )}
            </div>

            {/* Invoice Ref & Dates (dates flexed on the same line) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-0001"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 sm:col-span-2">
                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate">
                    Issue Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1 truncate">
                    Due Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Section - Mobile Trimmed Without Horizontal Scrolling */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Invoice Items ({items.length})
              </h3>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowMultiSelector(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Batch Pick</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>
            </div>

            {errors.items && (
              <p className="text-xs text-rose-500 font-medium bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
                {errors.items}
              </p>
            )}

            {/* Trimmed Mobile-Friendly Cards */}
            <div className="space-y-2.5">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-800 space-y-2 shadow-xs transition-all"
                >
                  {/* Item Description with integrated Catalog button & delete */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                      #{index + 1}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                        placeholder="Item name / specifications..."
                        className="w-full pl-2.5 pr-20 py-1.5 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      {products.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveItemIndexForCatalog(index)}
                          className="absolute right-1.5 top-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-[10px] font-semibold flex items-center gap-1 border border-indigo-200/50 dark:border-indigo-800/50"
                        >
                          <Package className="w-3 h-3" />
                          <span>Catalog</span>
                        </button>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Numbers Row: Qty, Unit, Unit Price, Total - Fits 100% on Mobile */}
                  <div className="grid grid-cols-12 gap-2 items-center pt-1">
                    {/* Qty */}
                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-400 mb-0.5">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={!item.quantity ? '' : item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value === '' ? 0 : Number(e.target.value))}
                        placeholder="1"
                        className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Unit */}
                    <div className="col-span-3">
                      <label className="block text-[10px] text-slate-400 mb-0.5">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        placeholder="pcs"
                        className="w-full px-2 py-1 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Unit Price */}
                    <div className="col-span-6">
                      <label className="block text-[10px] text-slate-400 mb-0.5">
                        Unit Price ({activeCurrency})
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice === 0 ? '' : item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        placeholder="0"
                        className="w-full px-2 py-1 text-xs font-mono font-bold rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Clean Item Total Bar */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Item Total:
                    </span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {formatCurrency(item.total, activeCurrency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Notes & Payment details - Clean, un-prefilled */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Payment Details / Instructions (Optional)
              </label>
              <textarea
                rows={2}
                value={paymentInstructions}
                onChange={(e) => setPaymentInstructions(e.target.value)}
                placeholder="e.g. MTN MoMo Pay: 894120 or Bank Acc details..."
                className="w-full p-2 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Terms & Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. 50% deposit on order, balance on delivery..."
                className="w-full p-2 text-xs rounded-lg border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Financial Totals Card - Trimmed */}
          <div className="p-3.5 rounded-xl liquid-glass-subtle border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Subtotal ({items.length} item{items.length !== 1 ? 's' : ''}):</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                {formatCurrency(subtotal, activeCurrency)}
              </span>
            </div>

            {/* Optional Tax & Discount in clean compact rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <span className="text-[11px] text-slate-500">Tax/VAT (%):</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0"
                  className="w-16 px-2 py-1 text-xs font-mono rounded border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] text-slate-500 whitespace-nowrap">Discount (%):</span>
                  {discountNum > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono truncate">
                      (-{formatCurrency(discountNum, activeCurrency)})
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value === '' ? '' : Math.max(0, Math.min(100, Number(e.target.value))))}
                  placeholder="0"
                  className="w-16 px-2 py-1 text-xs font-mono rounded border border-slate-300/80 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-right"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                Total Debt to Record:
              </span>
              <span className="font-mono font-extrabold text-base sm:text-lg text-indigo-600 dark:text-indigo-400">
                {formatCurrency(grandTotal, activeCurrency)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-sm transition-colors"
            >
              {invoiceToEdit ? 'Save Changes' : 'Issue Invoice'}
            </button>
          </div>
        </form>
      </div>

      {/* Multi-Item Catalog Selector */}
      <MultiItemSelectorModal
        isOpen={showMultiSelector}
        onClose={() => setShowMultiSelector(false)}
        products={products}
        onAddItems={handleBatchAddItems}
      />

      {/* Slide-Up Bottom Sheet: Customer Picker */}
      <BottomSheetPicker
        isOpen={showCustomerPicker}
        onClose={() => setShowCustomerPicker(false)}
        title="Select Customer"
        options={customerOptions}
        selectedId={selectedCustomerId}
        onSelect={(id) => setSelectedCustomerId(id)}
        searchPlaceholder="Search client by name, company, or phone..."
      />

      {/* Slide-Up Bottom Sheet: Product Catalog */}
      <BottomSheetPicker
        isOpen={activeItemIndexForCatalog !== null}
        onClose={() => setActiveItemIndexForCatalog(null)}
        title="Choose Product from Catalog"
        options={productOptions}
        onSelect={(prodId) => {
          if (activeItemIndexForCatalog !== null) {
            handleProductSelect(activeItemIndexForCatalog, prodId);
          }
        }}
        searchPlaceholder="Search catalog items..."
      />
    </div>
  );
};
