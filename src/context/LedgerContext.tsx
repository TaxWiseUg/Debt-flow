import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
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
} from '../types';
import {
  INITIAL_BUSINESS_PROFILE,
  INITIAL_CUSTOMERS,
  INITIAL_INVOICES,
  INITIAL_PAYMENTS,
  INITIAL_PRODUCTS,
} from '../data/seedData';
import {
  calculateDaysOverdue,
  generateReceiptNumber,
} from '../utils/formatters';

interface LedgerContextType {
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  payments: Payment[];
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
  
  // Metrics & Summaries
  debtAging: DebtAgingSummary;
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
  CUSTOMERS: 'ledgerflow_clean_customers_v2',
  PRODUCTS: 'ledgerflow_clean_products_v2',
  INVOICES: 'ledgerflow_clean_invoices_v2',
  PAYMENTS: 'ledgerflow_clean_payments_v2',
  PROFILE: 'ledgerflow_clean_profile_v2',
  CURRENCY: 'ledgerflow_currency_v2',
  THEME: 'ledgerflow_theme_v2',
};

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THEME);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Cloud Status
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Business Profile
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_BUSINESS_PROFILE;
  });

  // Active Currency (UGX alone)
  const activeCurrency: CurrencyCode = 'UGX';
  const setActiveCurrency = () => {};

  // State collections (start empty and pure)
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_CUSTOMERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PRODUCTS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_INVOICES;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return INITIAL_PAYMENTS;
  });

  // Local storage caching
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(businessProfile));
  }, [businessProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, activeCurrency);
  }, [activeCurrency]);

  // Firestore Real-Time Subscriptions
  useEffect(() => {
    setCloudStatus('syncing');

    // 1. Customers subscription
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        const cloudCustomers: Customer[] = [];
        snapshot.forEach((docSnap) => {
          cloudCustomers.push(docSnap.data() as Customer);
        });
        // Sort descending by createdAt
        cloudCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setCustomers(cloudCustomers);
        setCloudStatus('connected');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'customers');
        setCloudStatus('offline');
      }
    );

    // 2. Products subscription
    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const cloudProducts: Product[] = [];
        snapshot.forEach((docSnap) => {
          cloudProducts.push(docSnap.data() as Product);
        });
        cloudProducts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setProducts(cloudProducts);
        setCloudStatus('connected');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'products');
        setCloudStatus('offline');
      }
    );

    // 3. Invoices subscription
    const unsubInvoices = onSnapshot(
      collection(db, 'invoices'),
      (snapshot) => {
        const cloudInvoices: Invoice[] = [];
        snapshot.forEach((docSnap) => {
          cloudInvoices.push(docSnap.data() as Invoice);
        });
        cloudInvoices.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
        setInvoices(cloudInvoices);
        setCloudStatus('connected');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'invoices');
        setCloudStatus('offline');
      }
    );

    // 4. Payments subscription
    const unsubPayments = onSnapshot(
      collection(db, 'payments'),
      (snapshot) => {
        const cloudPayments: Payment[] = [];
        snapshot.forEach((docSnap) => {
          cloudPayments.push(docSnap.data() as Payment);
        });
        cloudPayments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        setPayments(cloudPayments);
        setCloudStatus('connected');
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
        setCloudStatus('offline');
      }
    );

    // 5. Settings profile subscription
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'profile'),
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudProfile = docSnap.data() as BusinessProfile;
          setBusinessProfile(cloudProfile);
          if (cloudProfile.defaultCurrency) {
            // Currency is fixed to UGX
          }
        }
        setCloudStatus('connected');
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/profile');
      }
    );

    return () => {
      unsubCustomers();
      unsubProducts();
      unsubInvoices();
      unsubPayments();
      unsubSettings();
    };
  }, []);

  // Recalculate invoice statuses based on balance & due dates
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
      return {
        ...inv,
        balanceDue,
        status,
      };
    });
  }, [invoices]);

  // Customer Actions (Sync to Firestore + Local)
  const addCustomer = async (data: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const id = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCustomer: Customer = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };
    
    // Optimistic local update
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

  // Product Actions
  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newProduct: Product = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
    };

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

  // Invoice Actions
  const addInvoice = async (data: Omit<Invoice, 'id' | 'createdAt' | 'paidAmount' | 'balanceDue' | 'status'>): Promise<Invoice> => {
    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const totalAmount = data.totalAmount;
    const today = new Date().toISOString().split('T')[0];
    const status = data.dueDate < today ? 'overdue' : 'issued';

    const newInvoice: Invoice = {
      ...data,
      id,
      paidAmount: 0,
      balanceDue: totalAmount,
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

  // Payment Actions
  const addPayment = async (data: Omit<Payment, 'id' | 'createdAt' | 'receiptNumber'>): Promise<Payment> => {
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const receiptNumber = generateReceiptNumber(payments.length);

    const newPayment: Payment = {
      ...data,
      id,
      receiptNumber,
      createdAt: new Date().toISOString(),
    };

    setPayments(prev => [newPayment, ...prev]);

    try {
      await setDoc(doc(db, 'payments', id), sanitizeForFirestore(newPayment));

      // If linked to an invoice, update invoice paid balance
      if (data.invoiceId) {
        const inv = invoices.find(i => i.id === data.invoiceId);
        if (inv) {
          const newPaidAmount = (inv.paidAmount || 0) + data.amount;
          const balanceDue = Math.max(0, inv.totalAmount - newPaidAmount);
          const today = new Date().toISOString().split('T')[0];
          let status: Invoice['status'] = 'partially_paid';
          if (balanceDue <= 0) {
            status = 'paid';
          } else if (inv.dueDate < today) {
            status = 'overdue';
          }
          const updatedInvoice = {
            ...inv,
            paidAmount: newPaidAmount,
            balanceDue,
            status,
          };
          await setDoc(doc(db, 'invoices', inv.id), sanitizeForFirestore(updatedInvoice));
        }
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
      await deleteDoc(doc(db, 'payments', id));

      if (payment.invoiceId) {
        const inv = invoices.find(i => i.id === payment.invoiceId);
        if (inv) {
          const newPaidAmount = Math.max(0, (inv.paidAmount || 0) - payment.amount);
          const balanceDue = Math.max(0, inv.totalAmount - newPaidAmount);
          const today = new Date().toISOString().split('T')[0];
          let status: Invoice['status'] = 'issued';
          if (balanceDue <= 0 && inv.totalAmount > 0) {
            status = 'paid';
          } else if (newPaidAmount > 0) {
            status = inv.dueDate < today ? 'overdue' : 'partially_paid';
          } else {
            status = inv.dueDate < today ? 'overdue' : 'issued';
          }
          await setDoc(doc(db, 'invoices', inv.id), sanitizeForFirestore({
            ...inv,
            paidAmount: newPaidAmount,
            balanceDue,
            status,
          }));
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `payments/${id}`);
    }
  };

  // Balances & Ledger Calculations
  const getCustomerBalance = (customerId: string) => {
    const custInvoices = refreshedInvoices.filter(i => i.customerId === customerId);
    const custPayments = payments.filter(p => p.customerId === customerId);

    const totalBilled = custInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = custPayments.reduce((sum, pay) => sum + pay.amount, 0);
    const balanceDue = Math.max(0, totalBilled - totalPaid);

    return { totalBilled, totalPaid, balanceDue };
  };

  const getCustomerLedger = (customerId: string): CustomerLedgerEntry[] => {
    const custInvoices = refreshedInvoices.filter(i => i.customerId === customerId);
    const custPayments = payments.filter(p => p.customerId === customerId);

    const rawEvents: Array<{
      id: string;
      date: string;
      type: 'invoice' | 'payment';
      reference: string;
      description: string;
      debit: number;
      credit: number;
      currency: CurrencyCode;
    }> = [];

    custInvoices.forEach(inv => {
      rawEvents.push({
        id: inv.id,
        date: inv.issueDate,
        type: 'invoice',
        reference: inv.invoiceNumber,
        description: `Invoice: ${inv.items.map(it => `${it.productName} (${it.quantity} ${it.unit})`).join(', ')}`,
        debit: inv.totalAmount,
        credit: 0,
        currency: inv.currency,
      });
    });

    custPayments.forEach(pay => {
      rawEvents.push({
        id: pay.id,
        date: pay.paymentDate,
        type: 'payment',
        reference: pay.receiptNumber,
        description: `Payment (${pay.paymentMethod.replace('_', ' ').toUpperCase()})${pay.referenceNumber ? ` - Ref: ${pay.referenceNumber}` : ''}${pay.invoiceNumber ? ` for ${pay.invoiceNumber}` : ''}`,
        debit: 0,
        credit: pay.amount,
        currency: pay.currency,
      });
    });

    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    return rawEvents.map(event => {
      running = running + event.debit - event.credit;
      return {
        ...event,
        runningBalance: running,
      };
    });
  };

  // Debt Aging
  const debtAging = useMemo<DebtAgingSummary>(() => {
    const summary: DebtAgingSummary = {
      current: 0,
      days1to30: 0,
      days31to60: 0,
      daysOver60: 0,
      totalOverdue: 0,
    };

    refreshedInvoices.forEach(inv => {
      if (inv.balanceDue <= 0) return;
      const daysOverdue = calculateDaysOverdue(inv.dueDate);
      if (daysOverdue === 0) {
        summary.current += inv.balanceDue;
      } else if (daysOverdue <= 30) {
        summary.days1to30 += inv.balanceDue;
        summary.totalOverdue += inv.balanceDue;
      } else if (daysOverdue <= 60) {
        summary.days31to60 += inv.balanceDue;
        summary.totalOverdue += inv.balanceDue;
      } else {
        summary.daysOver60 += inv.balanceDue;
        summary.totalOverdue += inv.balanceDue;
      }
    });

    return summary;
  }, [refreshedInvoices]);

  // Financial Metrics
  const metrics = useMemo(() => {
    const totalDebt = refreshedInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    const totalBilled = refreshedInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const totalCollectedThisMonth = payments
      .filter(p => {
        const d = new Date(p.paymentDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      })
      .reduce((sum, p) => sum + p.amount, 0);

    const overdueInvoicesCount = refreshedInvoices.filter(i => i.status === 'overdue' && i.balanceDue > 0).length;

    const activeCustomerIds = new Set([
      ...refreshedInvoices.map(i => i.customerId),
      ...payments.map(p => p.customerId),
    ]);

    return {
      totalDebt,
      totalBilled,
      totalCollectedThisMonth,
      overdueInvoicesCount,
      activeCustomersCount: activeCustomerIds.size,
    };
  }, [refreshedInvoices, payments]);

  // Update business profile
  const updateBusinessProfile = async (updates: Partial<BusinessProfile>) => {
    const merged = { ...businessProfile, ...updates };
    setBusinessProfile(merged);
    try {
      await setDoc(doc(db, 'settings', 'profile'), sanitizeForFirestore(merged));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/profile');
    }
  };

  // Clear all data (starts fresh and clean)
  const clearAllData = async () => {
    setCustomers([]);
    setProducts([]);
    setInvoices([]);
    setPayments([]);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);

    // Delete docs from Firestore in background
    customers.forEach(c => deleteDoc(doc(db, 'customers', c.id)).catch(() => {}));
    products.forEach(p => deleteDoc(doc(db, 'products', p.id)).catch(() => {}));
    invoices.forEach(i => deleteDoc(doc(db, 'invoices', i.id)).catch(() => {}));
    payments.forEach(p => deleteDoc(doc(db, 'payments', p.id)).catch(() => {}));
  };

  const exportDataJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      businessProfile,
      activeCurrency,
      customers,
      products,
      invoices: refreshedInvoices,
      payments,
    };
    return JSON.stringify(data, null, 2);
  };

  const importDataJson = async (jsonString: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.customers && Array.isArray(parsed.customers)) {
        setCustomers(parsed.customers);
        for (const c of parsed.customers) {
          await setDoc(doc(db, 'customers', c.id), sanitizeForFirestore(c));
        }
      }
      if (parsed.products && Array.isArray(parsed.products)) {
        setProducts(parsed.products);
        for (const p of parsed.products) {
          await setDoc(doc(db, 'products', p.id), sanitizeForFirestore(p));
        }
      }
      if (parsed.invoices && Array.isArray(parsed.invoices)) {
        setInvoices(parsed.invoices);
        for (const i of parsed.invoices) {
          await setDoc(doc(db, 'invoices', i.id), sanitizeForFirestore(i));
        }
      }
      if (parsed.payments && Array.isArray(parsed.payments)) {
        setPayments(parsed.payments);
        for (const p of parsed.payments) {
          await setDoc(doc(db, 'payments', p.id), sanitizeForFirestore(p));
        }
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
        customers,
        products,
        invoices: refreshedInvoices,
        payments,
        businessProfile,
        activeCurrency,
        theme,
        cloudStatus,
        toggleTheme,
        setActiveCurrency,
        updateBusinessProfile,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerBalance,
        getCustomerLedger,
        addProduct,
        updateProduct,
        deleteProduct,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        addPayment,
        deletePayment,
        debtAging,
        metrics,
        clearAllData,
        exportDataJson,
        importDataJson,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => {
  const context = useContext(LedgerContext);
  if (!context) {
    throw new Error('useLedger must be used within a LedgerProvider');
  }
  return context;
};
