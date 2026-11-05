import React, { useState, useMemo } from 'react';
import { Search, X, Check, Plus, Minus, Layers } from 'lucide-react';
import { Product } from '../types';
import { formatCurrency } from '../utils/formatters';

interface MultiItemSelection {
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
}

interface MultiItemSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onAddItems: (items: Array<{ productId: string; productName: string; unit: string; unitPrice: number; quantity: number; total: number }>) => void;
}

export const MultiItemSelectorModal: React.FC<MultiItemSelectorModalProps> = ({
  isOpen,
  onClose,
  products,
  onAddItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => {
      if (p.category) cats.add(p.category);
    });
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, selectedCategory]);

  const selectedList = useMemo(() => {
    return Object.entries(quantities)
      .filter(([_, qty]) => qty > 0)
      .map(([prodId, qty]) => {
        const prod = products.find(p => p.id === prodId);
        return {
          productId: prodId,
          productName: prod?.name || 'Custom Product',
          unit: prod?.unit || 'pcs',
          unitPrice: prod?.unitPrice || 0,
          quantity: qty,
          total: (prod?.unitPrice || 0) * qty,
        };
      });
  }, [quantities, products]);

  const totalSelectedSum = useMemo(() => {
    return selectedList.reduce((acc, it) => acc + it.total, 0);
  }, [selectedList]);

  if (!isOpen) return null;

  const handleQtyChange = (productId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const handleSetDirectQty = (productId: string, val: string) => {
    const num = parseInt(val, 10);
    setQuantities(prev => {
      if (isNaN(num) || num <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: num };
    });
  };

  const handleConfirm = () => {
    if (selectedList.length === 0) return;
    onAddItems(selectedList);
    setQuantities({});
    setSearchTerm('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up sm:animate-modal-pop"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Batch Add Catalog Items</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Select multiple items and quantities at once</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          {/* Categories */}
          {categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat === 'all' ? 'All Items' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 dark:divide-slate-800/60 space-y-2">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No catalog products match your search.</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const qty = quantities[product.id] || 0;
              const isSelected = qty > 0;

              return (
                <div
                  key={product.id}
                  className={`pt-2 pb-2 first:pt-0 flex items-center justify-between gap-3 p-2.5 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/50'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {product.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
                        {product.unit}
                      </span>
                    </div>
                    <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                      {formatCurrency(product.unitPrice)}
                      {isSelected && (
                        <span className="ml-2 font-semibold text-slate-900 dark:text-slate-100">
                          (Subtotal: {formatCurrency(product.unitPrice * qty)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleQtyChange(product.id, 1)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg shadow-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.id, -1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => handleSetDirectQty(product.id, e.target.value)}
                          className="w-10 text-center font-bold text-xs bg-transparent text-slate-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQtyChange(product.id, 1)}
                          className="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-slate-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer summary & confirm */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Selected: <span className="font-bold text-slate-900 dark:text-white">{selectedList.length} items</span>
            </div>
            <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              {formatCurrency(totalSelectedSum)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedList.length === 0}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" />
              Add to Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
