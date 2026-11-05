import React, { useState, useRef, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { AgentMessage, AgentAction } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  X,
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Package,
  FileSpreadsheet,
  FileText,
  RotateCcw,
  Loader2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface AgentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenOrderModal?: () => void;
  onOpenInvoiceModal?: () => void;
}

export const AgentDrawer: React.FC<AgentDrawerProps> = ({
  isOpen,
  onClose,
  onOpenOrderModal,
  onOpenInvoiceModal,
}) => {
  const {
    products,
    customers,
    invoices,
    orders,
    payments,
    profitSummary,
    businessProfile,
    activeCurrency,
    addProduct,
    addOrder,
    addInvoice,
  } = useLedger();

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome_1',
      role: 'assistant',
      content: `Hello! I am your **NexTone Autonomous Operations & Profit Copilot**.
I have real-time access to your catalog (${products.length} items), customer debt ledgers, orders, and realized cash margins.

I can:
- **Add products to the catalog** with selling rates and production costs
- **Calculate pricing** and recommend target margins for custom printing
- **Decide on discounts** by checking client debt history and cash profit thresholds
- **Draft orders & invoices** autonomously`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // Execute agent actions directly in real time
  const handleExecuteAction = async (action: AgentAction, msgId: string) => {
    try {
      if (action.type === 'add_to_catalog') {
        const payload = action.payload;
        await addProduct({
          name: payload.name,
          sku: payload.sku || `SKU-${Date.now().toString().slice(-5)}`,
          category: payload.category || 'General Items',
          unit: payload.unit || 'pcs',
          unitPrice: Number(payload.unitPrice) || 0,
          costPrice: Number(payload.costPrice) || 0,
          description: payload.description || '',
        });

        // Update action status to executed
        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  actions: m.actions?.map(a =>
                    a.id === action.id
                      ? { ...a, status: 'executed', resultMessage: `Added to Catalog: ${payload.name} (${formatCurrency(payload.unitPrice, activeCurrency)})` }
                      : a
                  ),
                }
              : m
          )
        );
      } else if (action.type === 'create_order') {
        const payload = action.payload;
        let matchedCustomer = customers.find(c => c.id === payload.customerId || c.name.toLowerCase() === payload.customerName?.toLowerCase());
        
        await addOrder({
          orderNumber: `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`,
          customerId: matchedCustomer ? matchedCustomer.id : '',
          customerName: matchedCustomer ? matchedCustomer.name : (payload.customerName || 'Walk-in Client'),
          customerPhone: matchedCustomer?.phone,
          customerEmail: matchedCustomer?.email,
          customerAddress: matchedCustomer?.address,
          currency: 'UGX',
          orderDate: new Date().toISOString().split('T')[0],
          deliveryDate: payload.deliveryDate,
          items: (payload.items || []).map((it: any, idx: number) => ({
            id: `item_${Date.now()}_${idx}`,
            productId: '',
            productName: it.productName,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pcs',
            unitPrice: Number(it.unitPrice) || 0,
            costPrice: Number(it.costPrice) || 0,
            total: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
          })),
          subtotal: (payload.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0),
          taxPercent: 0,
          taxAmount: 0,
          discountPercent: payload.discountPercent || 0,
          discountAmount: Math.round(((payload.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0) * (payload.discountPercent || 0)) / 100),
          totalAmount: Math.round(
            (payload.items || []).reduce((sum: number, it: any) => sum + (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0), 0) * (1 - (payload.discountPercent || 0) / 100)
          ),
          status: 'pending',
          notes: payload.notes || 'Created autonomously by NexTone Copilot',
        });

        setMessages(prev =>
          prev.map(m =>
            m.id === msgId
              ? {
                  ...m,
                  actions: m.actions?.map(a =>
                    a.id === action.id
                      ? { ...a, status: 'executed', resultMessage: `Order created for ${payload.customerName}` }
                      : a
                  ),
                }
              : m
          )
        );
      }
    } catch (err) {
      console.error('Action execution failed', err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    const userMessage: AgentMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          message: query,
          conversation: newHistory.map(m => ({ role: m.role, content: m.content })),
          activeContext: {
            products,
            customers,
            invoices,
            orders,
            payments,
            profitSummary,
            businessProfile,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Agent error: ${response.statusText}`);
      }

      const data = await response.json();

      const assistantMessage: AgentMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Action complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actions: data.actions || [],
      };

      setMessages(prev => [...prev, assistantMessage]);

      // If the agent returned an add_to_catalog action and requested full auto, execute it immediately
      if (data.actions && data.actions.length > 0) {
        for (const act of data.actions) {
          if (act.type === 'add_to_catalog') {
            await handleExecuteAction(act, assistantMessage.id);
          }
        }
      }
    } catch (err: any) {
      const errorMessage: AgentMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err.message || 'Unable to connect to NexTone Copilot. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `reset_${Date.now()}`,
        role: 'assistant',
        content: 'Session reset. What operations, pricing, or debt calculations would you like to review?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Drawer Container */}
      <div
        className="relative z-10 w-full sm:max-w-md md:max-w-lg bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shadow-2xl animate-slide-up sm:animate-slide-right overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">NexTone Copilot</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Full Auto
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Realized Cash Profit: {formatCurrency(profitSummary.realizedCashProfit || 0, activeCurrency)} ({profitSummary.realizedMarginPercent || 0}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Reset conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close copilot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Realized Profit Health Ribbon */}
        <div className="px-4 py-2 bg-indigo-50/60 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Cash Profit: <strong>{formatCurrency(profitSummary.realizedCashProfit || 0, activeCurrency)}</strong></span>
          </div>
          <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Debt Locked: <strong>{formatCurrency(profitSummary.lockedProfitInReceivables || 0, activeCurrency)}</strong></span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-xs font-medium'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-xs border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-line space-y-1">
                  {msg.content}
                </div>

                {/* Render Executed / Pending Actions */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="mt-3 space-y-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
                    {msg.actions.map(act => (
                      <div
                        key={act.id}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {act.type === 'add_to_catalog' && <Package className="w-3.5 h-3.5 text-indigo-500" />}
                            {act.type === 'create_order' && <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
                            {act.type === 'issue_invoice' && <FileText className="w-3.5 h-3.5 text-blue-500" />}
                            {act.type === 'evaluate_discount' && <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />}
                            {act.title}
                          </span>
                          {act.status === 'executed' ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                              <CheckCircle className="w-3 h-3" /> Auto-Executed
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleExecuteAction(act, msg.id)}
                              className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 transition-colors"
                            >
                              Execute
                            </button>
                          )}
                        </div>

                        {act.resultMessage && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                            {act.resultMessage}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1 text-right ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500 dark:text-slate-400 italic py-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span>Analyzing margins and calculating decision...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Action Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
          {[
            'Add Roll-up Banner to catalog at 120,000 UGX (cost 65,000)',
            'Can I give a 10% discount on a 2M UGX order?',
            'What is our realized cash profit vs unpaid debt?',
            'Draft a job order for 100 Branded T-Shirts',
          ].map((prompt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-500 dark:hover:border-indigo-400 text-[11px] whitespace-nowrap transition-colors"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask pricing, request catalog item, or check profit..."
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white disabled:opacity-40 transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
