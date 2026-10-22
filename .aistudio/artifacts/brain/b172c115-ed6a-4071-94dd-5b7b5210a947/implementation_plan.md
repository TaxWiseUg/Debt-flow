# LedgerFlow: Customer, Invoice, Debt & Balance Tracking System

A full-featured financial ledger and invoice management application built for businesses to catalog products and unit prices, issue invoices, record installment payments, track customer debts, and monitor real-time balances across multiple currencies.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following parameters were confirmed during interactive clarification and govern the implementation:

- **Confirmed Currency Model**: Multi-currency engine with native support and exchange formatting for **Ugandan Shillings (UGX)**, **US Dollars (USD)**, **Euros (EUR)**, and **Kenyan Shillings (KES)**, with user-selectable primary currency and customizable symbol/formatting.
- **Confirmed Workflow Scope**: Complete enterprise-grade financial workflow featuring:
  - Customer directory with live debt ledger and transaction history
  - Product catalog with unit prices, SKU, and unit measurement (pcs, kg, hrs, etc.)
  - Multi-item invoice creator with line-item discounts, snapshot unit pricing, and status lifecycle (Draft, Issued, Partially Paid, Paid, Overdue)
  - Installment payment recorder linking to specific invoices or open customer accounts with payment methods (Cash, Mobile Money / MTN / Airtel, Bank Transfer, Card)
  - Customer statement of account with printable/downloadable PDF-ready invoices and receipts
  - Debt aging analysis (Current, 1–30 days, 31–60 days, 60+ days overdue)
- **Confirmed Visual Direction**: Clean modern SaaS dashboard with dual light/dark mode support, high-density data tables with tabular figures, breadcrumb navigation, and zero-pill typographic discipline.
- **Data Persistence Strategy**: Local-first relational store (indexed in browser storage with preloaded realistic demo data) paired with one-click JSON Backup/Restore and CSV/PDF export, ensuring zero setup latency and no data loss.

---

## 1. Overview & Core Concept

**LedgerFlow** solves the critical problem small and growing businesses face when tracking customer receivables: forgotten debts, messy paper ledgers, outdated pricing, and disputed balances. 

- **Target Persona**: Business owners, shop managers, service providers, and wholesale distributors in regional and international commerce who sell goods or services on credit or in installments.
- **Key Value Proposition**: Instant visibility into *who owes what, since when, and for which items*, with automated ledger balancing ($\text{Customer Debt} = \text{Total Invoiced} - \text{Total Paid}$), tamper-proof historical pricing snapshots, and client-ready invoice documents.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Executive Dashboard**:
   - High-level metric strip: Total Outstanding Receivables (Debt), Total Collected This Month, Overdue Invoices Count, and Active Customers.
   - Quick Action Bar: "New Invoice", "Record Payment", "Add Customer", "New Product".
   - Debt Aging Distribution chart and Recent Transactions stream.
2. **Customer Management & Account Statement**:
   - Customer list with search, contact details, total lifetime spend, and current net balance due.
   - Detailed Customer Ledger drawer: Complete audit trail of invoices issued and payments received, running balance calculation, and "Send/Print Statement" action.
3. **Product & Unit Price Catalog**:
   - Table of items with SKU/code, category, unit measure, default unit price, and usage frequency.
   - Quick price update modal with notes on historical price adjustments (without affecting past invoices).
4. **Invoice Creation & Billing Workspace**:
   - Dynamic invoice builder: select customer, issue date, due date, invoice reference number.
   - Line items row editor: searchable item selector auto-populating default unit price, editable quantity, and real-time total computation.
   - Notes, terms, payment instructions (e.g. Mobile Money merchant code or bank info).
   - Instant preview modal with full-page printable invoice layout and download button.
5. **Payment Recording & Debt Settlement**:
   - Dedicated "Record Payment" dialog allowing payment allocation either directly to an invoice (reducing that specific invoice's balance) or on-account credit.
   - Payment modes: Mobile Money (Uganda/Kenya friendly), Cash, Bank Transfer, Cheque, Card.
   - Instant generation of printable Payment Receipt.

### Visual Identity & Theme
- **Aesthetic Direction**: Clean, purposeful B2B financial SaaS dashboard. Crisp hairline borders (`border-neutral-200 dark:border-neutral-800`), high contrast without glare, generous touch targets, and tabular numbers.
- **Typography**:
  - Display/Headings: `Plus Jakarta Sans` for modern brand and section titles.
  - Body & Data: `DM Sans` / `Plus Jakarta Sans` for UI copy; tabular figures (`tabular-nums`) and `JetBrains Mono` for currency sums, invoice codes, and phone numbers.
- **Color Palette (60-30-10 Rule)**:
  - *Dominant Canvas (60%)*: Neutral white (`#FFFFFF`) / Dark obsidian (`#0F172A`).
  - *Structural Surfaces (30%)*: Crisp card containers (`#F8FAFC` / `#1E293B`) with hairline borders.
  - *Accent Budget (10%)*: High-trust indigo/slate primary (`#4F46E5`), with semantic financial accents:
    - Paid / Positive: Emerald (`#16A34A`)
    - Partially Paid / Due: Amber (`#D97706`)
    - Overdue / Critical Debt: Rose/Crimson (`#E11D48`)
- **Zero-Pill Discipline**: Status indicators use clean typography with subtle color tags or unboxed text separators (`·`), avoiding puffy pill badges.

---

## 3. Key Product Decisions & Trade-Offs

- **Snapshot Unit Pricing**:
  - *Approach*: When a product is added to an invoice line item, its current unit price is copied directly into the invoice record.
  - *Rationale*: Product prices change over time; historical invoices must permanently preserve the price negotiated at the time of sale.
- **Relational Ledger Balance Architecture**:
  - *Approach*: Each customer balance is computed both from the bottom-up ledger ($\sum\text{Invoices} - \sum\text{Payments}$) and broken down by open invoices.
  - *Rationale*: Enables flexible reconciliation—customers can pay for a specific invoice number or deposit a lump-sum towards their total debt balance.
- **Client-Side Printable Layouts**:
  - *Approach*: Native, high-fidelity CSS print stylesheets configured for exact A4/Letter invoice documents with browser print-to-PDF support.
  - *Rationale*: Zero server dependencies, ultra-fast generation, crisp vector rendering, and works seamlessly on both mobile and desktop.
- **Local Persistence & Exportability**:
  - *Approach*: Instant-load localStorage state initialized with comprehensive realistic seed data (e.g. Kampala Hardware & Construction Supplies with UGX and USD transactions), plus backup export and JSON file import.
  - *Rationale*: Eliminates cold-start delays, allows zero-friction offline work, and ensures user data portability.

---

## 4. Technical Architecture & Data Strategy

### System & Component Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                              App Container                             │
│       (Theme Context: Light/Dark · Active Currency: UGX/USD/EUR/KES)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
    ┌───────────────────────────────┴───────────────────────────────┐
    │                                                               │
┌───▼──────────────────────┐                    ┌───────────────────▼──────────────┐
│  Sidebar & Top Navigation│                    │      Main Content Workspace      │
│  - Dashboard             │                    │                                  │
│  - Invoices              │                    │  ┌────────────────────────────┐  │
│  - Customers & Ledgers   │                    │  │ Metric Banner (Debt/Income)│  │
│  - Products / Prices     │                    │  └─────────────┬──────────────┘  │
│  - Payments              │                    │                │                 │
│  - Settings & Currency   │                    │  ┌─────────────▼──────────────┐  │
└──────────────────────────┘                    │  │ Active View (Table / Grid) │  │
                                                │  └─────────────┬──────────────┘  │
                                                │                │                 │
                                                │  ┌─────────────▼──────────────┐  │
                                                │  │ Modal: New / Edit / Pay    │  │
                                                │  │ Modal: Printable Document  │  │
                                                │  └────────────────────────────┘  │
                                                └──────────────────────────────────┘
```

### Data Schema & Types

```typescript
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string; // 'pcs', 'kg', 'box', 'hours', 'service', etc.
  unitPrice: number;
  description?: string;
  createdAt: string;
}

export interface InvoiceItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number; // Snapshot price
  total: number;     // quantity * unitPrice
}

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g. "INV-2026-001"
  customerId: string;
  customerName: string;
  currency: 'UGX' | 'USD' | 'EUR' | 'KES';
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
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
  invoiceId?: string;    // Linked invoice, if specified
  amount: number;
  currency: 'UGX' | 'USD' | 'EUR' | 'KES';
  paymentDate: string;
  paymentMethod: PaymentMethod;
  referenceNumber?: string; // Transaction ID / Mobile Money ref
  notes?: string;
  createdAt: string;
}
```

### Interactive State & Validation Flow
1. **Dynamic Invoice Builder**: Real-time reactive recalculation of subtotal, taxes, discounts, and total amount when line items, quantities, or unit prices change.
2. **Payment Allocation**: When paying towards an invoice, the system validates that the payment amount does not exceed the remaining balance due, updating invoice status from `issued` $\to$ `partially_paid` $\to$ `paid`.
3. **Ledger Synchronizer**: Automatic computation of customer current debt, total invoiced, total settled, and overdue days with instant visual badging.
4. **Document Generator**: Print and PDF rendering with clean invoice layout, company details header, itemized breakdown, signature section, and payment QR / Mobile Money instructions.
