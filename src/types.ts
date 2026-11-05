export type CurrencyCode = 'UGX';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  decimals: number;
  position: 'prefix' | 'suffix';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  companyName?: string;
  taxId?: string;
  notes?: string;
  creditLimit?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string; // 'pcs', 'box', 'pack', 'sheet', 'roll', 'meters', 'sets', 'hours', 'sqm'
  unitPrice: number;
  costPrice?: number; // Production / material cost basis
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number; // Snapshot unit price at sale
  costPrice?: number; // Cost basis per unit
  discountPercent?: number;
  total: number; // calculated line total
}

export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'delivered' | 'invoiced' | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  costPrice?: number; // Cost basis per unit
  total: number;
}

export interface ClientOrder {
  id: string;
  orderNumber: string; // e.g. "ORD-2026-0001"
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  currency: CurrencyCode;
  orderDate: string; // YYYY-MM-DD
  deliveryDate?: string; // YYYY-MM-DD
  items: OrderItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountPercent?: number;
  discountAmount: number;
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  linkedInvoiceId?: string;
  linkedInvoiceNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  orderId?: string;
  orderNumber?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  currency: CurrencyCode;
  issueDate: string; // YYYY-MM-DD
  dueDate: string;   // YYYY-MM-DD
  items: InvoiceItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountPercent?: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  totalCost?: number; // Estimated or itemized COGS
  status: InvoiceStatus;
  notes?: string;
  paymentInstructions?: string;
  createdAt: string;
}

export type PaymentMethod = 'mobile_money' | 'cash' | 'bank_transfer' | 'card' | 'cheque';

export interface Payment {
  id: string;
  receiptNumber: string; // e.g. "REC-2026-001"
  customerId: string;
  customerName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount: number;
  currency: CurrencyCode;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // MTN MoMo TID, Airtel Ref, Bank Wire Ref
  mobileMoneyNetwork?: 'MTN' | 'Airtel' | 'M-Pesa' | 'Other';
  notes?: string;
  createdAt: string;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  taxNumber?: string;
  defaultCurrency: CurrencyCode;
  bankName?: string;
  bankAccount?: string;
  bankSwift?: string;
  mobileMoneyMerchant?: string;
  mobileMoneyNumber?: string;
  notes?: string;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'invoice' | 'payment';
  reference: string;
  description: string;
  debit: number;  // Invoiced amount increases customer debt
  credit: number; // Payment decreases customer debt
  runningBalance: number;
  currency: CurrencyCode;
}

export interface DebtAgingSummary {
  current: number; // Not yet due
  days1to30: number; // 1-30 days overdue
  days31to60: number; // 31-60 days overdue
  daysOver60: number; // 60+ days overdue
  totalOverdue: number;
}

export interface InvoiceProfitMetrics {
  totalCost: number;
  totalBilled: number;
  paidAmount: number;
  invoicedProfit: number;
  realizedProfit: number;
  lockedProfit: number;
  marginPercent: number;
  paidRatio: number;
}

export interface BusinessProfitSummary {
  totalRevenueBilled: number;
  totalCashCollected: number;
  totalProductionCost: number;
  invoicedGrossProfit: number;
  realizedCashProfit: number;
  lockedProfitInReceivables: number;
  realizedMarginPercent: number;
}

export type AgentRole = 'user' | 'assistant' | 'system';

export interface AgentAction {
  id: string;
  type: 'add_to_catalog' | 'create_order' | 'issue_invoice' | 'record_payment' | 'evaluate_discount';
  status: 'pending' | 'executed' | 'cancelled';
  title: string;
  payload: any;
  resultMessage?: string;
}

export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: string;
  actions?: AgentAction[];
  profitInsight?: {
    projectedMargin: number;
    realizedCashMargin?: number;
    decisionRecommendation?: string;
  };
}

