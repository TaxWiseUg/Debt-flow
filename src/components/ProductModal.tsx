import React, { useState, useEffect } from 'react';
import { Product } from '../types';
import { X, Package, Tag, Layers, DollarSign } from 'lucide-react';
import { useLedger } from '../context/LedgerContext';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
  onProductCreated?: (created: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  productToEdit,
  onProductCreated,
}) => {
  const { addProduct, updateProduct, activeCurrency } = useLedger();

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    unit: 'pcs',
    unitPrice: '',
    description: '',
  });

  const [errors, setErrors] = useState<{ name?: string; unitPrice?: string }>({});

  const commonUnits = ['pcs', 'box', 'pack', 'sheet', 'roll', 'meters', 'sets', 'hours', 'sqm'];
  const commonCategories = [
    'Banners & Signage',
    'Apparels & Merchandise',
    'Paper Printing',
    'Large Format Printing',
    'Promotional Items',
    'Corporate ID',
    'Packaging & Labels',
    'Graphic Design & Artwork',
  ];

  useEffect(() => {
    if (productToEdit) {
      setFormData({
        name: productToEdit.name || '',
        sku: productToEdit.sku || '',
        category: productToEdit.category || '',
        unit: productToEdit.unit || 'pcs',
        unitPrice: String(productToEdit.unitPrice || ''),
        description: productToEdit.description || '',
      });
    } else {
      setFormData({
        name: '',
        sku: '',
        category: '',
        unit: 'pcs',
        unitPrice: '',
        description: '',
      });
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; unitPrice?: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Item / Product name is required';
    }
    if (!formData.unitPrice || parseFloat(formData.unitPrice) <= 0) {
      newErrors.unitPrice = 'Valid unit price is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || `SKU-${Date.now().toString().slice(-5)}`,
      category: formData.category.trim() || 'General Items',
      unit: formData.unit.trim() || 'pcs',
      unitPrice: parseFloat(formData.unitPrice),
      ...(formData.description.trim() ? { description: formData.description.trim() } : {}),
    };

    if (productToEdit) {
      await updateProduct(productToEdit.id, payload);
    } else {
      const created = await addProduct(payload);
      if (onProductCreated) {
        onProductCreated(created);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/50 backdrop-blur-md overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-lg liquid-glass rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden my-0 sm:my-8 border border-white/30 dark:border-white/10 animate-slide-up sm:animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {productToEdit ? 'Edit Product & Unit Price' : 'Add Item to Catalog'}
            </h2>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item / Product Name *
            </label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Roll-up Banner (85x200cm)"
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                  errors.name
                    ? 'border-rose-500 focus:ring-rose-500'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SKU / Item Code
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="e.g. BNR-ROLL-01"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  list="category-options"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Select or type..."
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="category-options">
                  {commonCategories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Default Unit Price ({activeCurrency}) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.unitPrice}
                  onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                  placeholder="e.g. 38500"
                  className={`w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border ${
                    errors.unitPrice
                      ? 'border-rose-500 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
                />
              </div>
              {errors.unitPrice && <p className="text-xs text-rose-500 mt-1">{errors.unitPrice}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {commonUnits.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Specifications & Item Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g. Aluminium cassette stand with anti-curl PVC graphic print."
              className="w-full p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {productToEdit && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              Note: Updating this catalog price affects future invoices only. Existing issued invoices preserve their original snapshot price.
            </div>
          )}

          {/* Footer Actions */}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-colors"
            >
              {productToEdit ? 'Update Price' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
