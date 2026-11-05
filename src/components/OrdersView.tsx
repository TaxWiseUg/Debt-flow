import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Printer,
  FileCheck2,
  Edit,
  Trash2,
  Clock,
  CheckCircle2,
  Truck,
  ArrowRight,
  Filter,
  AlertCircle,
  Package,
  Download,
} from 'lucide-react';
import { useLedger } from '../context/LedgerContext';
import { ClientOrder, OrderStatus } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

interface OrdersViewProps {
  onNewOrder: () => void;
  onEditOrder: (order: ClientOrder) => void;
  onPrintOrder: (order: ClientOrder) => void;
  onConvertOrderToInvoice: (order: ClientOrder) => void;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onNewOrder,
  onEditOrder,
  onPrintOrder,
  onConvertOrderToInvoice,
}) => {
  const { orders, updateOrder, deleteOrder, activeCurrency } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatusTab, setActiveStatusTab] = useState<'all' | OrderStatus>('all');
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch =
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.items.some(it => it.productName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        activeStatusTab === 'all' || order.status === activeStatusTab;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, activeStatusTab]);

  // Status metrics
  const stats = useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      inProgress: orders.filter(o => o.status === 'in_progress').length,
      ready: orders.filter(o => o.status === 'ready').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      invoiced: orders.filter(o => o.status === 'invoiced').length,
      totalValue: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
    };
  }, [orders]);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    await updateOrder(orderId, { status: newStatus });
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;
    await deleteOrder(orderToDelete);
    setOrderToDelete(null);
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Package className="w-3 h-3" />
            In Production
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Ready
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
            <Truck className="w-3 h-3" />
            Delivered
          </span>
        );
      case 'invoiced':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <FileCheck2 className="w-3 h-3" />
            Invoiced
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Client Orders
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            NexTone job ticketing, custom print orders & fulfillment
          </p>
        </div>

        <button
          onClick={onNewOrder}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Client Order</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Total Active Orders</div>
          <div className="text-lg font-black text-slate-900 dark:text-white">{stats.total}</div>
          <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium truncate">
            {formatCurrency(stats.totalValue, activeCurrency)}
          </div>
        </div>

        <div className="p-3 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">In Production</div>
          <div className="text-lg font-black text-slate-900 dark:text-white">{stats.inProgress}</div>
          <div className="text-[10px] text-slate-400">Under processing</div>
        </div>

        <div className="p-3 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Ready for Dispatch</div>
          <div className="text-lg font-black text-slate-900 dark:text-white">{stats.ready}</div>
          <div className="text-[10px] text-slate-400">Awaiting delivery</div>
        </div>

        <div className="p-3 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 space-y-1">
          <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">Billed / Invoiced</div>
          <div className="text-lg font-black text-slate-900 dark:text-white">{stats.invoiced}</div>
          <div className="text-[10px] text-slate-400">Converted to invoice</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search orders by number, client name, or product..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white placeholder-slate-400"
          />
        </div>

        {/* Status Tab Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 text-xs">
          {(
            [
              { key: 'all', label: 'All Orders' },
              { key: 'pending', label: 'Pending' },
              { key: 'in_progress', label: 'In Production' },
              { key: 'ready', label: 'Ready' },
              { key: 'delivered', label: 'Delivered' },
              { key: 'invoiced', label: 'Invoiced' },
              { key: 'cancelled', label: 'Cancelled' },
            ] as const
          ).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveStatusTab(tab.key)}
              className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeStatusTab === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List (Trimmed cards for mobile, zero horizontal scrolling) */}
      {filteredOrders.length === 0 ? (
        <div className="p-10 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Client Orders Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {searchQuery || activeStatusTab !== 'all'
                ? 'Try adjusting your search query or status filter.'
                : 'Create your first production order to track specifications and easily convert to invoices.'}
            </p>
          </div>
          {!searchQuery && activeStatusTab === 'all' && (
            <button
              onClick={onNewOrder}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <div
              key={order.id}
              className="p-4 rounded-2xl liquid-glass border border-white/40 dark:border-white/10 space-y-3 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-700/60 transition-all"
            >
              {/* Top Row: Order Number, Status, Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                      {order.orderNumber}
                    </span>
                    {getStatusBadge(order.status)}
                    {order.linkedInvoiceNumber && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        Invoice: {order.linkedInvoiceNumber}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {order.customerName}
                  </h3>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400">Order Total</div>
                  <div className="text-sm font-mono font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(order.totalAmount, order.currency)}
                  </div>
                </div>
              </div>

              {/* Order Items Summary (Trimmed) */}
              <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 text-xs space-y-1">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Ordered Items ({order.items.length})
                </div>
                {order.items.map((it, idx) => (
                  <div key={it.id || idx} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 truncate">
                      {it.quantity}x {it.productName} <span className="text-slate-400 text-[10px]">({it.unit})</span>
                    </span>
                    <span className="font-mono text-slate-600 dark:text-slate-400 shrink-0">
                      {formatCurrency(it.total, order.currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Dates & Notes */}
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
                <div>
                  Ordered: <span className="text-slate-700 dark:text-slate-300 font-medium">{formatDate(order.orderDate)}</span>
                  {order.deliveryDate && (
                    <span className="ml-2">
                      Target: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{formatDate(order.deliveryDate)}</span>
                    </span>
                  )}
                </div>

                {/* Quick Status Dropdown */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Status:</span>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Production</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="invoiced">Invoiced</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {order.notes && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/50">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Notes:</span> {order.notes}
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPrintOrder(order)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors"
                    title="Download Quotation in PDF or PNG format"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Download (PDF & PNG)</span>
                  </button>

                  {order.status !== 'invoiced' && (
                    <button
                      onClick={() => onConvertOrderToInvoice(order)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-colors"
                      title="Convert this order directly into an issued invoice"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Convert to Invoice</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditOrder(order)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Edit Order"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOrderToDelete(order.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Delete Order"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delete Order?</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to delete this client order? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
