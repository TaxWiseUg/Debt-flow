import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { useLedger } from '../context/LedgerContext';
import { Product } from '../types';
import {
  Package,
  Search,
  Plus,
  Edit2,
  Trash2,
  Tag,
  Layers,
  DollarSign,
  Download,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

interface ProductsViewProps {
  onOpenNewProduct: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  onOpenNewProduct,
  onEditProduct,
}) => {
  const { products, deleteProduct, activeCurrency } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Categories list
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'all' || p.category === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Export price list CSV
  const handleExportPriceList = () => {
    if (filteredProducts.length === 0) return;
    const headers = ['SKU', 'Item Name', 'Category', 'Unit', 'Unit Price', 'Description'];
    const rows = filteredProducts.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category.replace(/"/g, '""')}"`,
      p.unit,
      p.unitPrice,
      `"${(p.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `LedgerFlow_PriceList_${new Date().toISOString().split('T')[0]}.csv`);
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
            Unit Price Catalog & Inventory Items
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Define standard unit prices and measurements for instant one-click invoicing
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPriceList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 liquid-glass-subtle hover:bg-white/80 dark:hover:bg-slate-800 rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Price List</span>
          </button>

          <button
            onClick={onOpenNewProduct}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item to Catalog</span>
          </button>
        </div>
      </div>

      {/* Catalog Metric Strip with Liquid Glass */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 sm:p-6 rounded-2xl liquid-glass shadow-xs text-xs">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Total Items in Catalog:</span>
          <p className="font-mono text-lg font-bold text-slate-900 dark:text-white mt-1">
            {products.length} products & services
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Product Categories:</span>
          <p className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {categories.length - 1} active groups
          </p>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Snapshot Integrity:</span>
          <p className="text-slate-700 dark:text-slate-300 mt-1 font-medium">
            Historical invoices preserve sale-date pricing
          </p>
        </div>
      </div>

      {/* Search and Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative grow">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog by product name, SKU code, or specifications..."
            className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          />
        </div>

        <div className="sm:w-64 shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs rounded-xl liquid-glass-input text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Catalog Table */}
      <div className="rounded-2xl overflow-hidden liquid-glass shadow-xs">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <p className="font-medium text-sm text-slate-700 dark:text-slate-300">No items found in catalog</p>
            <p>Add a product or service with its unit price to start billing fast.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3.5 w-28">SKU Code</th>
                  <th className="py-3 px-3.5">Product / Service Name</th>
                  <th className="py-3 px-3.5">Category</th>
                  <th className="py-3 px-3.5 text-center">Unit</th>
                  <th className="py-3 px-3.5 text-right">Standard Unit Price</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.map((prod) => (
                  <tr
                    key={prod.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* SKU */}
                    <td className="py-3 px-3.5 font-mono font-medium text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {prod.sku}
                    </td>

                    {/* Name & Description */}
                    <td className="py-3 px-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {prod.name}
                      </div>
                      {prod.description && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                          {prod.description}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      {prod.category}
                    </td>

                    {/* Unit */}
                    <td className="py-3 px-3.5 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {prod.unit}
                    </td>

                    {/* Unit Price */}
                    <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(prod.unitPrice, activeCurrency)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditProduct(prod)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Edit Product & Unit Price"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete product ${prod.name} from catalog?`)) {
                              deleteProduct(prod.id);
                            }
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          title="Delete Product"
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
