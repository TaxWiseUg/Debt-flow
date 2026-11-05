import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { sanitizeForFirestore } from '../utils/sanitize';
import {
  BusinessProfile,
  CurrencyCode,
  Customer,
  CustomerLedgerEntry,
  DebtAgingSummary,
  Invoice,
  Payment,
  Product,
  ClientOrder,
  InvoiceProfitMetrics,
  BusinessProfitSummary,
} from '../types';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
} from '../data/seedData';
import {
  calculateDaysOverdue,
  generateReceiptNumber,
  generateOrderNumber,
} from '../utils/formatters';

interface LedgerContextType {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
  orders: ClientOrder[];
  businessProfile: BusinessProfile;
  activeCurrency: CurrencyCode;
  theme: 'light' | 'dark';
  cloudStatus: 'connected' | 'syncing' | 'offline';

  // Theme & Currency
  toggleTheme: () => void;
  setActiveCurrency: (currency: CurrencyCode) => void;
  updateBusinessProfile: (updates: Partial<BusinessProfile>) => Promise<void>;

  // Customer Actions
  addCustomer: (data: Omit<Customer, 'id' | 'createdAt'>) => Promise<Customer>;
  updateCustomer: (id: string, updates: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomerBalance: (customerId: string) => { totalBilled: number; totalPaid: number; balanceDue: number };
  getCustomerLedger: (customerId: string) => CustomerLedgerEntry[];

  // Product Actions
  addProduct: (data: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Invoice Actions
  addInvoice: (data: Omit<Invoice, 'id' | 'createdAt' | 'paidAmount' | 'balanceDue' | 'status'>) => Promise<Invoice>;
  updateInvoice: (id: string, updates: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;

  // Payment Actions
  addPayment: (data: Omit<Payment, 'id' | 'createdAt' | 'receiptNumber'>) => Promise<Payment>;
  deletePayment: (id: string) => Promise<void>;

  // Order Actions
  addOrder: (data: Omit<ClientOrder, 'id' | 'createdAt'>) => Promise<ClientOrder>;
  updateOrder: (id: string, updates: Partial<ClientOrder>) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
  convertOrderToInvoice: (orderId: string, customDueDate?: string) => Promise<Invoice | null>;

  // Metrics & Summaries
  debtAging: DebtAgingSummary;
  profitSummary: BusinessProfitSummary;
  getInvoiceProfit: (invoice: Invoice) => InvoiceProfitMetrics;
  metrics: {
    totalDebt: number;
    totalBilled: number;
    totalCollectedThisMonth: number;
    overdueInvoicesCount: number;
    activeCustomersCount: number;
  };

  // Data Portability
  clearAllData: () => Promise<void>;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => Promise<boolean>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CUSTOMERS: 'ledgerflow_customers_v3',
  PRODUCTS: 'ledgerflow_products_v3',
  INVOICES: 'ledgerflow_invoices_v3',
  PAYMENTS: 'ledgerflow_payments_v3',
  ORDERS: 'ledgerflow_orders_v3',
  PROFILE: 'ledgerflow_profile_v3',
  CURRENCY: 'ledgerflow_currency_v3',
  THEME: 'ledgerflow_theme_v3',
};

// ── One-time migration helpers ─────────────────────────────────────────────

/**
 * Migrates old localStorage keys (v1/v2) to the current v3 keys.
 * Safe to call repeatedly — skips if the new key already has data.
 */
function migrateLocalStorage() {
  const keyMap: Record<string, string> = {
    ledgerflow_clean_customers_v2: STORAGE_KEYS.CUSTOMERS,
    ledgerflow_clean_products_v2: STORAGE_KEYS.PRODUCTS,
    ledgerflow_clean_invoices_v2: STORAGE_KEYS.INVOICES,
    ledgerflow_clean_payments_v2: STORAGE_KEYS.PAYMENTS,
    nextone_clean_orders_v2: STORAGE_KEYS.ORDERS,
    nextone_clean_profile_v2: STORAGE_KEYS.PROFILE,
    ledgerflow_clean_profile_v2: STORAGE_KEYS.PROFILE,
  };
  for (const [oldKey, newKey] of Object.entries(keyMap)) {
    if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
      localStorage.setItem(newKey, localStorage.getItem(oldKey)!);
    }
  }
}

/**
 * Migrates orders from the old single-document format (settings/orders_store)
 * into the proper `orders` collection. Runs once, then marks done in localStorage.
 */
async function migrateOrdersFromSingleDoc() {
  const FLAG = 'ledgerflow_orders_migrated_v3';
  if (localStorage.getItem(FLAG)) return;

  try {
    const oldRef = doc(db, 'settings', 'orders_store');
    const snap = await getDoc(oldRef);
    if (snap.exists()) {
      const data = snap.data();
      const list: ClientOrder[] = Array.isArray(data.list) ? data.list : [];
      if (list.length > 0) {
        await Promise.all(
          list.map(order =>
            setDoc(doc(db, 'orders', order.id), sanitizeForFirestore(order))
          )
        );
        console.info(`[migration] Moved ${list.length} orders from settings/orders_store → orders collection.`);
      }
    }
    localStorage.setItem(FLAG, '1');
  } catch (err) {
    console.warn('[migration] orders migration skipped (offline or already done):', err);
  }
}

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Run migrations once on mount
  useMemo(() => { migrateLocalStorage(); }, []);
  useEffect(() => { migrateOrdersFromSingleDoc(); }, []);

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  // ── Cloud status ───────────────────────────────────────────────────────────
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // ── Business Profile ───────────────────────────────────────────────────────
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_BUSINESS_PROFILE;
  });

  // ── Currency (UGX only for now) ────────────────────────────────────────────
  const activeCurrency: CurrencyCode = 'UGX';
  const setActiveCurrency = (_currency: CurrencyCode) => {};

  // ── Collections ───────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMERS) || '[]'); } catch { return INITIAL_CUSTOMERS; }
  });
  const [products, setProducts] = useState<Product[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRODUCTS) || '[]'); } catch { return INITIAL_PRODUCTS; }
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.INVOICES) || '[]'); } catch { return INITIAL_INVOICES; }
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.PAYMENTS) || '[]'); } catch { return INITIAL_PAYMENTS; }
  });
  const [orders, setOrders] = useState<ClientOrder[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEYS.ORDERS) || '[]'); } catch { return INITIAL_ORDERS || []; }
  });

  // ── Local storage mirrors ──────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(businessProfile)); }, [businessProfile]);

  // ── Firestore Real-Time Subscriptions ─────────────────────────────────────
  useEffect(() => {
    setCloudStatus('syncing');

    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const data: Customer[] = snapshot.docs.map(d => d.data() as Customer);
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCustomers(data);
        setCloudStatus('connected');
      },
      (error) => { handleFirestoreError(error, OperationType.LIST, 'customers'); setCloudStatus('offline'); }
    );

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const data: Product[] = snapshot.docs.map(d => d.data() as Product);
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProducts(data);
        setCloudStatus('connected');
      },
      (error) => { handleFirestoreError(error, OperationType.LIST, 'products'); setCloudStatus('offline'); }
    );

    const unsubInvoices = onSnapshot(
      collection(db, 'invoices'),
      (snapshot) => {
        const data: Invoice[] = snapshot.docs.map(d => d.data() as Invoice);
        data.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        setInvoices(data);
        setCloudStatus('connected');
      },
      (error) => { handleFirestoreError(error, OperationType.LIST, 'invoices'); setCloudStatus('offline'); }
    );

    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const data: Payment[] = snapshot.docs.map(d => d.data() as Payment);
        data.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        setPayments(data);
        setCloudStatus('connected');
      },
      (error) => { handleFirestoreError(error, OperationType.LIST, 'payments'); setCloudStatus('offline'); }
    );

    // Orders — now a proper collection (was a single document)
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        const data: ClientOrder[] = snapshot.docs.map(d => d.data() as ClientOrder);
        data.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
        setOrders(data);
        setCloudStatus('connected');
      },
      (error) => { handleFirestoreError(error, OperationType.LIST, 'orders'); setCloudStatus('offline'); }
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'profile'),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudProfile = docSnap.data() as BusinessProfile;
          setBusinessProfile(cloudProfile);
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(cloudProfile));
        }
        setCloudStatus('connected');
      },
      (error) => { handleFirestoreError(error, OperationType.GET, 'settings/profile'); }
    );

    return () => {
      unsubCustomers();
      unsubProducts();
      unsubInvoices();
      unsubPayments();
      unsubOrders();
      unsubSettings();
    };
  }, []);

  // ── Derived: invoices with refreshed status ────────────────────────────────
  const refreshedInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return invoices.map(inv => {
      const balanceDue = Math.max(0, inv.totalAmount - (inv.paidAmount || 0));
      let status = inv.status;
      if (balanceDue <= 0 && inv.totalAmount > 0) {
        status = 'paid';
      } else if (inv.paidAmount > 0) {
        status = inv.dueDate < today ? 'overdue' : 'partially_paid';
      } else {
        status = inv.dueDate < today ? 'overdue' : 'issued';
      }
      return { ...inv, balanceDue, status };
    });
  }, [invoices]);

  // ── Customer CRUD ──────────────────────────────────────────────────────────
  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: Customer = { ...data, id, createdAt: new Date().toISOString() };
    setCustomers(prev => [newCustomer, ...prev]);
    try {
      await setDoc(doc(db, 'customers', id), sanitizeForFirestore(newCustomer));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `customers/${id}`);
    }
    return newCustomer;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    const existing = customers.find(c => c.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    setCustomers(prev => prev.map(c => (c.id === id ? merged : c)));
    try {
      await setDoc(doc(db, 'customers', id), sanitizeForFirestore(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    try {
      await deleteDoc(doc(db, 'customers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  // ── Product CRUD ───────────────────────────────────────────────────────────
  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProduct: Product = { ...data, id, createdAt: new Date().toISOString() };
    setProducts(prev => [newProduct, ...prev]);
    try {
      await setDoc(doc(db, 'products', id), sanitizeForFirestore(newProduct));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `products/${id}`);
    }
    return newProduct;
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const existing = products.find(p => p.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    setProducts(prev => prev.map(p => (p.id === id ? merged : p)));
    try {
      await setDoc(doc(db, 'products', id), sanitizeForFirestore(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  // ── Invoice CRUD ───────────────────────────────────────────────────────────
  const addInvoice = async (
    data: Omit<Invoice, 'id' | 'createdAt' | 'paidAmount' | 'balanceDue' | 'status'>
  ): Promise<Invoice> => {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const today = new Date().toISOString().split('T')[0];
    const status = data.dueDate < today ? 'overdue' : 'issued';
    const newInvoice: Invoice = {
      ...data,
      id,
      paidAmount: 0,
      balanceDue: data.totalAmount,
      status,
      createdAt: new Date().toISOString(),
    };
    setInvoices(prev => [newInvoice, ...prev]);
    try {
      await setDoc(doc(db, 'invoices', id), sanitizeForFirestore(newInvoice));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `invoices/${id}`);
    }
    return newInvoice;
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    const existing = invoices.find(i => i.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates };
    const balanceDue = Math.max(0, merged.totalAmount - merged.paidAmount);
    const today = new Date().toISOString().split('T')[0];
    let status = merged.status;
    if (balanceDue <= 0 && merged.totalAmount > 0) {
      status = 'paid';
    } else if (merged.paidAmount > 0) {
      status = merged.dueDate < today ? 'overdue' : 'partially_paid';
    } else {
      status = merged.dueDate < today ? 'overdue' : 'issued';
    }
    const finalInv = { ...merged, balanceDue, status };
    setInvoices(prev => prev.map(inv => (inv.id === id ? finalInv : inv)));
    try {
      await setDoc(doc(db, 'invoices', id), sanitizeForFirestore(finalInv));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${id}`);
    }
  };

  const deleteInvoice = async (id: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== id));
    try {
      await deleteDoc(doc(db, 'invoices', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${id}`);
    }
  };

  // ── Payment CRUD ───────────────────────────────────────────────────────────
  // Uses a Firestore transaction so the invoice balance update is atomic.
  const addPayment = async (data: Omit<Payment, 'id' | 'createdAt' | 'receiptNumber'>): Promise<Payment> => {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const receiptNumber = generateReceiptNumber();

    const newPayment: Payment = { ...data, id, receiptNumber, createdAt: new Date().toISOString() };

    // Optimistic local update
    setPayments(prev => [newPayment, ...prev]);

    try {
      if (data.invoiceId) {
        // Atomic: write payment + update invoice balance in one transaction
        await runTransaction(db, async (tx) => {
          const invRef = doc(db, 'invoices', data.invoiceId!);
          const invSnap = await tx.get(invRef);

          tx.set(doc(db, 'payments', id), sanitizeForFirestore(newPayment));

          if (invSnap.exists()) {
            const inv = invSnap.data() as Invoice;
            const newPaidAmount = (inv.paidAmount || 0) + data.amount;
            const balanceDue = Math.max(0, inv.totalAmount - newPaidAmount);
            const today = new Date().toISOString().split('T')[0];
            let status: Invoice['status'] = balanceDue <= 0 ? 'paid' : inv.dueDate < today ? 'overdue' : 'partially_paid';
            tx.set(invRef, sanitizeForFirestore({ ...inv, paidAmount: newPaidAmount, balanceDue, status }));
          }
        });
      } else {
        await setDoc(doc(db, 'payments', id), sanitizeForFirestore(newPayment));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `payments/${id}`);
    }

    return newPayment;
  };

  const deletePayment = async (id: string) => {
    const payment = payments.find(p => p.id === id);
    if (!payment) return;
    setPayments(prev => prev.filter(p => p.id !== id));

    try {
      if (payment.invoiceId) {
        await runTransaction(db, async (tx) => {
          const invRef = doc(db, 'invoices', payment.invoiceId!);
          const invSnap = await tx.get(invRef);

          tx.delete(doc(db, 'payments', id));

          if (invSnap.exists()) {
            const inv = invSnap.data() as Invoice;
            const newPaidAmount = Math.max(0, (inv.paidAmount || 0) - payment.amount);
            const balanceDue = Math.max(0, inv.totalAmount - newPaidAmount);
            const today = new Date().toISOString().split('T')[0];
            let status: Invoice['status'] = 'issued';
            if (balanceDue <= 0 && inv.totalAmount > 0) status = 'paid';
            else if (newPaidAmount > 0) status = inv.dueDate < today ? 'overdue' : 'partially_paid';
            else status = inv.dueDate < today ? 'overdue' : 'issued';
            tx.set(invRef, sanitizeForFirestore({ ...inv, paidAmount: newPaidAmount, balanceDue, status }));
          }
        });
      } else {
        await deleteDoc(doc(db, 'payments', id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
    }
  };

  // ── Order CRUD — proper collection (not a single document) ─────────────────
  const addOrder = async (data: Omit<ClientOrder, 'id' | 'createdAt'>): Promise<ClientOrder> => {
    const id = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newOrder: ClientOrder = { ...data, id, createdAt: new Date().toISOString() };
    setOrders(prev => [newOrder, ...prev]);
    try {
      await setDoc(doc(db, 'orders', id), sanitizeForFirestore(newOrder));
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `orders/${id}`);
    }
    return newOrder;
  };

  const updateOrder = async (id: string, updates: Partial<ClientOrder>) => {
    const existing = orders.find(o => o.id === id);
    if (!existing) return;
    const merged = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    setOrders(prev => prev.map(o => (o.id === id ? merged : o)));
    try {
      await setDoc(doc(db, 'orders', id), sanitizeForFirestore(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${id}`);
    }
  };

  const deleteOrder = async (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
    try {
      await deleteDoc(doc(db, 'orders', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${id}`);
    }
  };

  const convertOrderToInvoice = async (orderId: string, customDueDate?: string): Promise<Invoice | null> => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const dueDate = customDueDate || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'paidAmount' | 'balanceDue' | 'status'> = {
      invoiceNumber: `INV-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      orderId: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      customerAddress: order.customerAddress,
      currency: order.currency,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate,
      items: order.items.map(it => ({
        id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productId: it.productId,
        productName: it.productName,
        quantity: it.quantity,
        unit: it.unit,
        unitPrice: it.unitPrice,
        discountPercent: 0,
        total: it.total,
      })),
      subtotal: order.subtotal,
      taxPercent: order.taxPercent,
      taxAmount: order.taxAmount,
      discountAmount: order.discountAmount,
      totalAmount: order.totalAmount,
      notes: order.notes
        ? `Generated from Order #${order.orderNumber}. ${order.notes}`
        : `Generated from Order #${order.orderNumber}`,
      paymentInstructions: businessProfile.notes,
    };

    const newInvoice = await addInvoice(invoiceData);
    await updateOrder(orderId, {
      status: 'invoiced',
      linkedInvoiceId: newInvoice.id,
      linkedInvoiceNumber: newInvoice.invoiceNumber,
    });
    return newInvoice;
  };

  // ── Ledger calculations ────────────────────────────────────────────────────
  const getCustomerBalance = (customerId: string) => {
    const custInvoices = refreshedInvoices.filter(i => i.customerId === customerId);
    const custPayments = payments.filter(p => p.customerId === customerId);
    const totalBilled = custInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = custPayments.reduce((sum, pay) => sum + pay.amount, 0);
    return { totalBilled, totalPaid, balanceDue: Math.max(0, totalBilled - totalPaid) };
  };

  const getCustomerLedger = (customerId: string): CustomerLedgerEntry[] => {
    const custInvoices = refreshedInvoices.filter(i => i.customerId === customerId);
    const custPayments = payments.filter(p => p.customerId === customerId);

    type RawEvent = {
      id: string; date: string; type: 'invoice' | 'payment';
      reference: string; description: string; debit: number; credit: number; currency: CurrencyCode;
    };

    const rawEvents: RawEvent[] = [
      ...custInvoices.map(inv => ({
        id: inv.id,
        date: inv.issueDate,
        type: 'invoice' as const,
        reference: inv.invoiceNumber,
        description: `Invoice: ${inv.items.map(it => `${it.productName} (${it.quantity} ${it.unit})`).join(', ')}`,
        debit: inv.totalAmount,
        credit: 0,
        currency: inv.currency,
      })),
      ...custPayments.map(pay => ({
        id: pay.id,
        date: pay.paymentDate,
        type: 'payment' as const,
        reference: pay.receiptNumber,
        description: `Payment (${pay.paymentMethod.replace('_', ' ').toUpperCase()})${pay.referenceNumber ? ` - Ref: ${pay.referenceNumber}` : ''}${pay.invoiceNumber ? ` for ${pay.invoiceNumber}` : ''}`,
        debit: 0,
        credit: pay.amount,
        currency: pay.currency,
      })),
    ];

    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return rawEvents.map(event => {
      running = running + event.debit - event.credit;
      return { ...event, runningBalance: running };
    });
  };

  // ── Debt Aging ─────────────────────────────────────────────────────────────
  const debtAging = useMemo<DebtAgingSummary>(() => {
    const summary: DebtAgingSummary = { current: 0, days1to30: 0, days31to60: 0, daysOver60: 0, totalOverdue: 0 };
    refreshedInvoices.forEach(inv => {
      if (inv.balanceDue <= 0) return;
      const daysOverdue = calculateDaysOverdue(inv.dueDate);
      if (daysOverdue === 0) summary.current += inv.balanceDue;
      else if (daysOverdue <= 30) { summary.days1to30 += inv.balanceDue; summary.totalOverdue += inv.balanceDue; }
      else if (daysOverdue <= 60) { summary.days31to60 += inv.balanceDue; summary.totalOverdue += inv.balanceDue; }
      else { summary.daysOver60 += inv.balanceDue; summary.totalOverdue += inv.balanceDue; }
    });
    return summary;
  }, [refreshedInvoices]);

  // ── Financial Metrics ──────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    const totalDebt = refreshedInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    const totalBilled = refreshedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const now = new Date();
    const totalCollectedThisMonth = payments
      .filter(p => { const d = new Date(p.paymentDate); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
      .reduce((sum, p) => sum + p.amount, 0);
    const overdueInvoicesCount = refreshedInvoices.filter(i => i.status === 'overdue' && i.balanceDue > 0).length;
    const activeCustomerIds = new Set([...refreshedInvoices.map(i => i.customerId), ...payments.map(p => p.customerId)]);
    return { totalDebt, totalBilled, totalCollectedThisMonth, overdueInvoicesCount, activeCustomersCount: activeCustomerIds.size };
  }, [refreshedInvoices, payments]);

  // ── Profit analytics ───────────────────────────────────────────────────────
  const getInvoiceProfit = (inv: Invoice): InvoiceProfitMetrics => {
    let totalCost = 0;
    if (typeof inv.totalCost === 'number' && inv.totalCost > 0) {
      totalCost = inv.totalCost;
    } else if (Array.isArray(inv.items) && inv.items.length > 0) {
      totalCost = inv.items.reduce((sum, item) => {
        const qty = item.quantity > 0 ? item.quantity : 1;
        if (typeof item.costPrice === 'number' && item.costPrice > 0) return sum + item.costPrice * qty;
        const catalogProd = products.find(p => p.id === item.productId || p.name.toLowerCase() === item.productName.toLowerCase());
        if (catalogProd?.costPrice && catalogProd.costPrice > 0) return sum + catalogProd.costPrice * qty;
        return sum + item.unitPrice * 0.5 * qty;
      }, 0);
    }

    const totalBilled = inv.totalAmount || 0;
    const paidAmount = inv.paidAmount || 0;
    const invoicedProfit = Math.max(0, totalBilled - totalCost);
    const paidRatio = totalBilled > 0 ? Math.min(1, Math.max(0, paidAmount / totalBilled)) : 0;
    const realizedProfit = Math.round(invoicedProfit * paidRatio);
    const lockedProfit = Math.max(0, invoicedProfit - realizedProfit);
    const marginPercent = totalBilled > 0 ? Math.round((invoicedProfit / totalBilled) * 100) : 0;

    return { totalCost, totalBilled, paidAmount, invoicedProfit, realizedProfit, lockedProfit, marginPercent, paidRatio };
  };

  const profitSummary = useMemo<BusinessProfitSummary>(() => {
    let totalRevenueBilled = 0, totalCashCollected = 0, totalProductionCost = 0;
    let invoicedGrossProfit = 0, realizedCashProfit = 0, lockedProfitInReceivables = 0;

    refreshedInvoices.forEach(inv => {
      const p = getInvoiceProfit(inv);
      totalRevenueBilled += p.totalBilled;
      totalCashCollected += p.paidAmount;
      totalProductionCost += p.totalCost;
      invoicedGrossProfit += p.invoicedProfit;
      realizedCashProfit += p.realizedProfit;
      lockedProfitInReceivables += p.lockedProfit;
    });

    const realizedMarginPercent = totalCashCollected > 0
      ? Math.round((realizedCashProfit / totalCashCollected) * 100)
      : (totalRevenueBilled > 0 ? Math.round((invoicedGrossProfit / totalRevenueBilled) * 100) : 0);

    return { totalRevenueBilled, totalCashCollected, totalProductionCost, invoicedGrossProfit, realizedCashProfit, lockedProfitInReceivables, realizedMarginPercent };
  }, [refreshedInvoices, products]);

  // ── Business profile ───────────────────────────────────────────────────────
  const updateBusinessProfile = async (updates: Partial<BusinessProfile>) => {
    const merged = { ...businessProfile, ...updates };
    setBusinessProfile(merged);
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(merged));
    try {
      await setDoc(doc(db, 'settings', 'profile'), sanitizeForFirestore(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/profile');
    }
  };

  // ── Data portability ───────────────────────────────────────────────────────
  const clearAllData = async () => {
    setCustomers([]); setProducts([]); setInvoices([]); setPayments([]); setOrders([]);
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    customers.forEach(c => deleteDoc(doc(db, 'customers', c.id)).catch(() => {}));
    products.forEach(p => deleteDoc(doc(db, 'products', p.id)).catch(() => {}));
    invoices.forEach(i => deleteDoc(doc(db, 'invoices', i.id)).catch(() => {}));
    payments.forEach(p => deleteDoc(doc(db, 'payments', p.id)).catch(() => {}));
    orders.forEach(o => deleteDoc(doc(db, 'orders', o.id)).catch(() => {}));
  };

  const exportDataJson = () => JSON.stringify(
    { exportedAt: new Date().toISOString(), businessProfile, activeCurrency, customers, products, orders, invoices: refreshedInvoices, payments },
    null, 2
  );

  const importDataJson = async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.customers && Array.isArray(parsed.customers)) {
        setCustomers(parsed.customers);
        for (const c of parsed.customers) await setDoc(doc(db, 'customers', c.id), sanitizeForFirestore(c));
      }
      if (parsed.products && Array.isArray(parsed.products)) {
        setProducts(parsed.products);
        for (const p of parsed.products) await setDoc(doc(db, 'products', p.id), sanitizeForFirestore(p));
      }
      if (parsed.orders && Array.isArray(parsed.orders)) {
        setOrders(parsed.orders);
        for (const o of parsed.orders) await setDoc(doc(db, 'orders', o.id), sanitizeForFirestore(o));
      }
      if (parsed.invoices && Array.isArray(parsed.invoices)) {
        setInvoices(parsed.invoices);
        for (const i of parsed.invoices) await setDoc(doc(db, 'invoices', i.id), sanitizeForFirestore(i));
      }
      if (parsed.payments && Array.isArray(parsed.payments)) {
        setPayments(parsed.payments);
        for (const p of parsed.payments) await setDoc(doc(db, 'payments', p.id), sanitizeForFirestore(p));
      }
      if (parsed.businessProfile) {
        setBusinessProfile(parsed.businessProfile);
        await setDoc(doc(db, 'settings', 'profile'), sanitizeForFirestore(parsed.businessProfile));
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <LedgerContext.Provider
      value={{
        customers, products, invoices: refreshedInvoices, payments, orders,
        businessProfile, activeCurrency, theme, cloudStatus,
        toggleTheme, setActiveCurrency, updateBusinessProfile,
        addCustomer, updateCustomer, deleteCustomer, getCustomerBalance, getCustomerLedger,
        addProduct, updateProduct, deleteProduct,
        addOrder, updateOrder, deleteOrder, convertOrderToInvoice,
        addInvoice, updateInvoice, deleteInvoice,
        addPayment, deletePayment,
        debtAging, metrics, profitSummary, getInvoiceProfit,
        clearAllData, exportDataJson, importDataJson,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) throw new Error('useLedger must be used within a LedgerProvider');
  return context;
};
