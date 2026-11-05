/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { Customer, Invoice, Payment, Product, ClientOrder } from './types';
import { Header } from './components/Header';
import { FloatingNav, ActiveTab } from './components/FloatingNav';
import { DashboardView } from './components/DashboardView';
import { OrdersView } from './components/OrdersView';
import { InvoicesView } from './components/InvoicesView';
import { CustomersView } from './components/CustomersView';
import { ProductsView } from './components/ProductsView';
import { PaymentsView } from './components/PaymentsView';
import { OrderModal } from './components/OrderModal';
import { InvoiceModal } from './components/InvoiceModal';
import { PaymentModal } from './components/PaymentModal';
import { CustomerModal } from './components/CustomerModal';
import { ProductModal } from './components/ProductModal';
import { PrintDocumentModal, DocumentType } from './components/PrintDocumentModal';
import { SettingsModal } from './components/SettingsModal';

function AppContent() {
  const { customers, products, orders, addOrder, updateOrder } = useLedger();

  // Navigation state (Default is dashboard)
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Disable browser's automatic scrollRestoration to avoid bleeding scroll offset between tabs
  useEffect(() => {
    if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Prevent other pages from pre-scrolling when navigating tabs
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
    };
  }, [activeTab]);

  // Order modal states
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<ClientOrder | null>(null);
  const [initialOrderForInvoice, setInitialOrderForInvoice] = useState<ClientOrder | null>(null);

  // Modal states
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [preselectedCustomerIdForInvoice, setPreselectedCustomerIdForInvoice] = useState<string | undefined>();

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [preselectedCustomerIdForPayment, setPreselectedCustomerIdForPayment] = useState<string | undefined>();
  const [preselectedInvoiceIdForPayment, setPreselectedInvoiceIdForPayment] = useState<string | undefined>();

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Print Document Modal states
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState<DocumentType>('invoice');
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [printPayment, setPrintPayment] = useState<Payment | null>(null);
  const [printCustomer, setPrintCustomer] = useState<Customer | null>(null);
  const [printOrder, setPrintOrder] = useState<ClientOrder | null>(null);

  // Deep linking to customer ledger
  const [selectedCustomerIdForLedger, setSelectedCustomerIdForLedger] = useState<string | null>(null);

  // Order actions
  const handleOpenNewOrder = () => {
    setOrderToEdit(null);
    setOrderModalOpen(true);
  };

  const handleEditOrder = (order: ClientOrder) => {
    setOrderToEdit(order);
    setOrderModalOpen(true);
  };

  const handlePrintOrderDoc = (order: ClientOrder) => {
    setPrintDocType('order');
    setPrintOrder(order);
    const cust = customers.find(c => c.id === order.customerId) || null;
    setPrintCustomer(cust);
    setPrintInvoice(null);
    setPrintPayment(null);
    setPrintModalOpen(true);
  };

  const handleConvertOrderToInvoice = (order: ClientOrder) => {
    setInitialOrderForInvoice(order);
    setInvoiceToEdit(null);
    setInvoiceModalOpen(true);
  };

  // Helper actions
  const handleOpenNewInvoice = (customerId?: string) => {
    setInvoiceToEdit(null);
    setInitialOrderForInvoice(null);
    setPreselectedCustomerIdForInvoice(customerId);
    setInvoiceModalOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setInvoiceToEdit(invoice);
    setInitialOrderForInvoice(null);
    setPreselectedCustomerIdForInvoice(invoice.customerId);
    setInvoiceModalOpen(true);
  };

  const handleOpenNewPayment = (customerId?: string, invoiceId?: string) => {
    setPreselectedCustomerIdForPayment(customerId);
    setPreselectedInvoiceIdForPayment(invoiceId);
    setPaymentModalOpen(true);
  };

  const handleOpenNewCustomer = () => {
    setCustomerToEdit(null);
    setCustomerModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setCustomerToEdit(customer);
    setCustomerModalOpen(true);
  };

  const handleOpenNewProduct = () => {
    setProductToEdit(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setProductModalOpen(true);
  };

  const handleViewInvoiceDoc = (invoice: Invoice) => {
    setPrintDocType('invoice');
    setPrintInvoice(invoice);
    setPrintOrder(null);
    const cust = customers.find(c => c.id === invoice.customerId) || null;
    setPrintCustomer(cust);
    setPrintModalOpen(true);
  };

  const handlePrintReceiptDoc = (payment: Payment) => {
    setPrintDocType('receipt');
    setPrintPayment(payment);
    setPrintOrder(null);
    const cust = customers.find(c => c.id === payment.customerId) || null;
    setPrintCustomer(cust);
    setPrintModalOpen(true);
  };

  const handlePrintStatementDoc = (customer: Customer) => {
    setPrintDocType('statement');
    setPrintCustomer(customer);
    setPrintInvoice(null);
    setPrintPayment(null);
    setPrintOrder(null);
    setPrintModalOpen(true);
  };

  const handleViewCustomerStatement = (customerId: string) => {
    setSelectedCustomerIdForLedger(customerId);
    setActiveTab('customers');
  };

  const getViewTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'orders': return 'Client Orders';
      case 'invoices': return 'Invoices';
      case 'customers': return 'Customers & Debt';
      case 'products': return 'Unit Price Catalog';
      case 'payments': return 'Payments';
      case 'settings': return 'Settings';
      default: return 'Ledger';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors relative selection:bg-indigo-500/20 overflow-x-hidden">
      {/* Ambient background light orbs for liquid glass refraction */}
      <div className="fixed -top-32 -left-32 w-96 h-96 bg-indigo-500/15 dark:bg-indigo-600/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/4 -right-32 w-[32rem] h-[32rem] bg-sky-400/15 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed -bottom-32 left-1/4 w-[28rem] h-[28rem] bg-violet-500/10 dark:bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Liquid Glass Top Header */}
      <Header
        onOpenNewInvoice={() => handleOpenNewInvoice()}
        onOpenNewPayment={() => handleOpenNewPayment()}
        currentViewTitle={getViewTitle()}
      />

      {/* Main Content Viewport with generous breathing space */}
      <main className="grow py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full transition-all">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <DashboardView
              key="dashboard"
              onOpenNewInvoice={() => handleOpenNewInvoice()}
              onOpenNewPayment={() => handleOpenNewPayment()}
              onOpenNewCustomer={handleOpenNewCustomer}
              onOpenNewProduct={handleOpenNewProduct}
              onViewInvoice={handleViewInvoiceDoc}
              onPayInvoice={(inv) => handleOpenNewPayment(inv.customerId, inv.id)}
              onViewCustomerStatement={handleViewCustomerStatement}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'orders' && (
            <OrdersView
              key="orders"
              onNewOrder={handleOpenNewOrder}
              onEditOrder={handleEditOrder}
              onPrintOrder={handlePrintOrderDoc}
              onConvertOrderToInvoice={handleConvertOrderToInvoice}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              key="invoices"
              onOpenNewInvoice={() => handleOpenNewInvoice()}
              onEditInvoice={handleEditInvoice}
              onViewInvoice={handleViewInvoiceDoc}
              onPayInvoice={(inv) => handleOpenNewPayment(inv.customerId, inv.id)}
              onViewCustomerStatement={handleViewCustomerStatement}
            />
          )}

          {activeTab === 'customers' && (
            <CustomersView
              key="customers"
              onOpenNewCustomer={handleOpenNewCustomer}
              onEditCustomer={handleEditCustomer}
              onIssueInvoiceForCustomer={(cust) => handleOpenNewInvoice(cust.id)}
              onRecordPaymentForCustomer={(cust) => handleOpenNewPayment(cust.id)}
              onPrintCustomerStatement={handlePrintStatementDoc}
              selectedCustomerIdForLedger={selectedCustomerIdForLedger}
              onClearSelectedCustomerLedger={() => setSelectedCustomerIdForLedger(null)}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              key="products"
              onOpenNewProduct={handleOpenNewProduct}
              onEditProduct={handleEditProduct}
            />
          )}

          {activeTab === 'payments' && (
            <PaymentsView
              key="payments"
              onOpenNewPayment={() => handleOpenNewPayment()}
              onPrintReceipt={handlePrintReceiptDoc}
              onViewCustomerStatement={handleViewCustomerStatement}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Floating Nav with NO Text */}
      <FloatingNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Modals & Dialogs */}
      <OrderModal
        isOpen={orderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        onSave={async (orderData) => {
          if (orderToEdit) {
            await updateOrder(orderToEdit.id, orderData);
          } else {
            await addOrder(orderData);
          }
        }}
        customers={customers}
        products={products}
        orderToEdit={orderToEdit}
        existingOrderCount={orders.length}
        onOpenCustomerModal={handleOpenNewCustomer}
      />

      <InvoiceModal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setInitialOrderForInvoice(null);
        }}
        invoiceToEdit={invoiceToEdit}
        initialOrder={initialOrderForInvoice}
        onOpenNewCustomer={() => {
          setInvoiceModalOpen(false);
          handleOpenNewCustomer();
        }}
        onInvoiceSaved={async (createdInv) => {
          if (initialOrderForInvoice) {
            await updateOrder(initialOrderForInvoice.id, {
              status: 'invoiced',
              linkedInvoiceId: createdInv.id,
              linkedInvoiceNumber: createdInv.invoiceNumber,
            });
            setInitialOrderForInvoice(null);
          }
        }}
        preselectedCustomerId={preselectedCustomerIdForInvoice}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        preselectedCustomerId={preselectedCustomerIdForPayment}
        preselectedInvoiceId={preselectedInvoiceIdForPayment}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        customerToEdit={customerToEdit}
      />

      <ProductModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        productToEdit={productToEdit}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />

      <PrintDocumentModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        documentType={printDocType}
        invoice={printInvoice}
        payment={printPayment}
        customer={printCustomer}
        order={printOrder}
      />
    </div>
  );
}

export default function App() {
  return (
    <LedgerProvider>
      <AppContent />
    </LedgerProvider>
  );
}
