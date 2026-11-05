import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  User,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  FileCheck2,
  ChevronDown,
  Package,
} from 'lucide-react';
import { Customer, Product, ClientOrder, OrderItem, OrderStatus } from '../types';
import { formatCurrency, generateOrderNumber, getTodayDateString } from '../utils/formatters';
import { MultiItemSelectorModal } from './MultiItemSelectorModal';
import { BottomSheetPicker, PickerOption } from './BottomSheetPicker';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (orderData: Omit<ClientOrder, 'id' | 'createdAt'>) => Promise<void>;
  customers: Customer[];
  products: Product[];
  orderToEdit?: ClientOrder | null;
  existingOrderCount: number;
  onOpenCustomerModal?: () => void;
}

export const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  customers,
  products,
  orderToEdit,
  existingOrderCount,
  onOpenCustomerModal,
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState<OrderStatus>('pending');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMultiSelector, setShowMultiSelector] = useState(false);

  // Bottom slide up picker states (mobile & uncrowded UX)
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [activeItemIndexForCatalog, setActiveItemIndexForCatalog] = useState<number | null>(null);

  // Initialize or reset form (no pre-filled customer or dummy rows!)
  useEffect(() => {
    if (orderToEdit) {
      setOrderNumber(orderToEdit.orderNumber);
      setCustomerId(orderToEdit.customerId);
      setOrderDate(orderToEdit.orderDate);
      setDeliveryDate(orderToEdit.deliveryDate || '');
      setStatus(orderToEdit.status);
      setItems(orderToEdit.items || []);
      setTaxPercent(orderToEdit.taxPercent || 0);
      const computedPct = orderToEdit.discountPercent !== undefined
        ? orderToEdit.discountPercent
        : (orderToEdit.subtotal > 0 && orderToEdit.discountAmount > 0
            ? Math.round((orderToEdit.discountAmount / orderToEdit.subtotal) * 100)
            : 0);
      setDiscountPercent(computedPct);
      setNotes(orderToEdit.notes || '');
    } else {
      setOrderNumber(generateOrderNumber(existingOrderCount));
      setCustomerId('');
      setOrderDate('');
      setDeliveryDate('');
      setStatus('pending');
      setItems([]);
      setTaxPercent(0);
      setDiscountPercent(0);
      setNotes('');
    }
    setError(null);
  }, [orderToEdit, existingOrderCount, isOpen]);

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
      subtitle: `${formatCurrency(p.unitPrice)} / ${p.unit}`,
    }));
  }, [products]);

  const statusOptions: PickerOption[] = [
    { id: 'pending', label: 'Pending Confirmation', badge: 'Pending' },
    { id: 'in_progress', label: 'In Production / Processing', badge: 'In Progress' },
    { id: 'ready', label: 'Ready for Pickup / Dispatch', badge: 'Ready' },
    { id: 'delivered', label: 'Delivered / Completed', badge: 'Delivered' },
    { id: 'invoiced', label: 'Invoiced', badge: 'Invoiced' },
    { id: 'cancelled', label: 'Cancelled', badge: 'Cancelled' },
  ];

  const selectedCustomer = customers.find(c => c.id === customerId);
  const currentStatusObj = statusOptions.find(s => s.id === status);

  if (!isOpen) return null;

  // Add individual custom line item
  const handleAddItemRow = () => {
    const newItem: OrderItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: '',
      productName: '',
      unit: 'pcs',
      unitPrice: 0,
      quantity: 0,
      total: 0,
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleUpdateItem = (index: number, updates: Partial<OrderItem>) => {
    setItems(prev => {
      const next = [...prev];
      const item = { ...next[index], ...updates };
      // Recalculate line total using effective quantity (placeholder 1 if not entered)
      const effectiveQty = item.quantity > 0 ? item.quantity : 1;
      item.total = Math.max(0, effectiveQty * (item.unitPrice || 0));
      next[index] = item;
      return next;
    });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    setItems(prev => {
      const next = [...prev];
      const current = next[index];
      const effectiveQty = current.quantity > 0 ? current.quantity : 1;
      const item = {
        ...current,
        productId: prod.id,
        productName: prod.name,
        unit: prod.unit,
        unitPrice: prod.unitPrice,
        total: Math.max(0, effectiveQty * prod.unitPrice),
      };
      next[index] = item;
      return next;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Batch insert items from MultiItemSelectorModal
  const handleBatchAddItems = (selectedItems: Array<{ productId: string; productName: string; unit: string; unitPrice: number; quantity: number; total: number }>) => {
    const formatted: OrderItem[] = selectedItems.map(s => ({
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productId: s.productId,
      productName: s.productName,
      unit: s.unit,
      unitPrice: s.unitPrice,
      quantity: s.quantity,
      total: s.total,
    }));
    setItems(prev => [...prev, ...formatted]);
  };

  // Totals
  const subtotal = items.reduce((sum, it) => {
    const qty = it.quantity > 0 ? it.quantity : 1;
    return sum + (qty * (it.unitPrice || 0));
  }, 0);
  const taxAmount = Math.round((subtotal * (taxPercent || 0)) / 100);
  const discountAmount = Math.round((subtotal * (discountPercent || 0)) / 100);
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer for this order.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one line item to the order.');
      return;
    }

    const invalidItem = items.find(it => !it.productName.trim());
    if (invalidItem) {
      setError('Each item must have a name / specification.');
      return;
    }

    const finalizedItems: OrderItem[] = items.map(it => {
      const qty = it.quantity > 0 ? it.quantity : 1;
      return {
        ...it,
        quantity: qty,
        total: qty * (it.unitPrice || 0),
      };
    });

    const selectedCust = customers.find(c => c.id === customerId);

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave({
        orderNumber: orderNumber || generateOrderNumber(existingOrderCount),
        customerId,
        customerName: selectedCust?.name || 'Unknown Client',
        customerPhone: selectedCust?.phone,
        customerEmail: selectedCust?.email,
        customerAddress: selectedCust?.address,
        currency: 'UGX',
        orderDate: orderDate || getTodayDateString(),
        deliveryDate: deliveryDate || undefined,
        items: finalizedItems,
        subtotal,
        taxPercent,
        taxAmount,
        discountPercent,
        discountAmount,
        totalAmount,
        status,
        notes: notes.trim() || undefined,
        linkedInvoiceId: orderToEdit?.linkedInvoiceId,
        linkedInvoiceNumber: orderToEdit?.linkedInvoiceNumber,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save order';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div 
          className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up sm:animate-modal-pop"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {orderToEdit ? 'Edit Client Order' : 'Create New Client Order'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">NexTone job order & production tracking</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Top Row: Order Number, Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Production Status
                </label>
                <button
                  type="button"
                  onClick={() => setShowStatusPicker(true)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-left flex items-center justify-between text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span className="truncate">{currentStatusObj?.label || 'Pending Confirmation'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              </div>
            </div>

            {/* Customer Selector - Slide-up sheet trigger */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-500" />
                  Client / Customer *
                </label>
                {onOpenCustomerModal && (
                  <button
                    type="button"
                    onClick={onOpenCustomerModal}
                    className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    + New Customer
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerPicker(true)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-left flex items-center justify-between text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <div className="min-w-0 pr-2">
                  {selectedCustomer ? (
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-900 dark:text-white">{selectedCustomer.name}</span>
                      {(selectedCustomer.companyName || selectedCustomer.phone) && (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
                          · {[selectedCustomer.companyName, selectedCustomer.phone].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">Select Client / Customer...</span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Dates: Order Date & Target Delivery (flexed on the same line) */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 truncate">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Order Date</span>
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
                />
              </div>

              <div className="min-w-0">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1 truncate">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Delivery Date</span>
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 sm:px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
                  placeholder="Delivery deadline"
                />
              </div>
            </div>

            {/* Line Items Section (Trimmed for mobile, zero horizontal scroll!) */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Order Items ({items.length})
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Specifications & quantities</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMultiSelector(true)}
                    className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-xs font-semibold flex items-center gap-1 border border-indigo-200/60 dark:border-indigo-800/60 transition-colors"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    Batch Catalog Pick
                  </button>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Row
                  </button>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No items added yet. Click <span className="font-semibold text-indigo-600 dark:text-indigo-400">Batch Catalog Pick</span> to select multiple products or <span className="font-semibold text-slate-700 dark:text-slate-300">Add Row</span> for custom item.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 space-y-2"
                    >
                      {/* Item row 1: Clean unified item input with Quick Catalog Picker */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="text"
                            placeholder="Type item description or choose catalog..."
                            value={item.productName}
                            onChange={(e) => handleUpdateItem(index, { productName: e.target.value })}
                            className="w-full pl-3 pr-20 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            required
                          />
                          {products.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setActiveItemIndexForCatalog(index)}
                              className="absolute right-1.5 top-1.5 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 text-[11px] font-semibold flex items-center gap-1 border border-indigo-200/50 dark:border-indigo-800/50"
                            >
                              <Package className="w-3 h-3" />
                              <span>Catalog</span>
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Item row 2: Qty, Unit, Unit Price, Total with placeholders */}
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Qty</label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={!item.quantity ? '' : item.quantity}
                            onChange={(e) => handleUpdateItem(index, { quantity: e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0) })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Unit</label>
                          <input
                            type="text"
                            placeholder="pcs"
                            value={item.unit}
                            onChange={(e) => handleUpdateItem(index, { unit: e.target.value })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Rate (UGX)</label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.unitPrice === 0 ? '' : item.unitPrice}
                            onChange={(e) => handleUpdateItem(index, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Total</label>
                          <div className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                            {formatCurrency(item.total)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Calculations & Discounts */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Production / Delivery Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special printing specs, finishes, delivery instructions..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-400">Tax/VAT (%):</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={taxPercent === 0 ? '' : taxPercent}
                    onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-16 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap">Discount (%):</span>
                    {discountAmount > 0 && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium truncate">
                        (-{formatCurrency(discountAmount)})
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="any"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-16 px-2 py-0.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-right font-mono text-xs text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm">
                  <span className="text-slate-900 dark:text-white">Order Total:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            </div>

            {/* Submit Footer */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
              >
                <FileCheck2 className="w-4 h-4" />
                {isSubmitting ? 'Saving Order...' : orderToEdit ? 'Update Order' : 'Save Client Order'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Slide-Up Bottom Sheet: Customer Picker */}
      <BottomSheetPicker
        isOpen={showCustomerPicker}
        onClose={() => setShowCustomerPicker(false)}
        title="Select Client / Customer"
        options={customerOptions}
        selectedId={customerId}
        onSelect={(id) => setCustomerId(id)}
        searchPlaceholder="Search client by name, company, or phone..."
      />

      {/* Slide-Up Bottom Sheet: Production Status */}
      <BottomSheetPicker
        isOpen={showStatusPicker}
        onClose={() => setShowStatusPicker(false)}
        title="Update Production Status"
        options={statusOptions}
        selectedId={status}
        onSelect={(id) => setStatus(id as OrderStatus)}
        searchable={false}
      />

      {/* Slide-Up Bottom Sheet: Product Catalog */}
      <BottomSheetPicker
        isOpen={activeItemIndexForCatalog !== null}
        onClose={() => setActiveItemIndexForCatalog(null)}
        title="Choose Product from Catalog"
        options={productOptions}
        onSelect={(prodId) => {
          if (activeItemIndexForCatalog !== null) {
            handleSelectProduct(activeItemIndexForCatalog, prodId);
          }
        }}
        searchPlaceholder="Search catalog items..."
      />

      {/* Batch Catalog Items Selector Modal */}
      <MultiItemSelectorModal
        isOpen={showMultiSelector}
        onClose={() => setShowMultiSelector(false)}
        products={products}
        onAddItems={handleBatchAddItems}
      />
    </>
  );
};
