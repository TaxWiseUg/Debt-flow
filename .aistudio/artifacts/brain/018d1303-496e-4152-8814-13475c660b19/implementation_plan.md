# NexTone Autonomous Operations, Decision-Making & Realized Profit Engine

An autonomous, full-access AI agent and profit intelligence system for NexTone. The system and agent possess real-time awareness of customer ledgers, product catalog, orders, and invoices, with specialized capabilities to **track and calculate profits based on cash actually received versus invoiced amounts**, guide pricing and discount decisions, autonomously manage catalog items, and safeguard cash margins.

## User Review & Critical Decisions

> [!IMPORTANT]
> The system and the agent will now distinguish between **Invoiced Expected Profit** and **Realized Cash Profit** (profit derived strictly from money received). The agent evaluates real-time margins before approving discounts or taking new work.

- **Realized Profit Tracking Model**:
  - *Cost of Goods Sold (COGS)*: Products and line items support a base production `costPrice` (paper, vinyl, ink, garment blanks, finishing).
  - *Accrued vs. Realized Cash Profit*:
    - **Invoiced Profit**: `Total Invoiced - Total Cost`
    - **Realized Cash Profit**: Calculated dynamically based on payments recorded: `(Total Paid / Total Invoiced) × Invoiced Margin`.
    - **Locked Profit in Debt**: Profit tied up in outstanding customer receivables that hasn't materialized in cash yet.
- **Agent Profit & Decision Intelligence**:
  - *Margin-Protected Discounts*: When asked to grant a discount, the agent computes the impact on net profit and rejects discounts that breach minimum margin thresholds (e.g. minimum 25% cash margin).
  - *Cash Collection & Profit Reporting*: Answers queries like *"How much cash profit did we realize this week?"*, *"Which pending invoices have our highest unpaid profit locked up?"*, or *"What is our net margin on Timothy's latest order?"*.
- **Autonomous System Actions**:
  - The agent can add products (with selling price and production cost), calculate job pricing, grant or deny discounts based on profit buffers, create orders, and record payments.

---

## 1. Overview & Core Concept

- **What It Does**: Unifies operational print shop management, automated AI decision-making, and financial profit analytics.
- **Why Cash-Realized Profit Matters**: In custom printing and branding, invoicing 10,000,000 UGX with 4,000,000 UGX upfront materials cost produces negative cash flow until payments are collected. By calculating profit directly from **money received against invoices recorded**, NexTone managers and the AI agent know true cash health at all times.
- **Key Capabilities**:
  1. **Dual Profit Analytics**: Live visibility into Total Revenue, Total Production Cost, Realized Cash Profit, and Unrealized Receivables Profit.
  2. **Automated Catalog & Cost Management**: Directly adds catalog items with both selling price (`unitPrice`) and production cost (`costPrice`).
  3. **Intelligent Discount & Pricing Governance**: Calculates exact job margins and protects profitability by rejecting excessive discounts.
  4. **Autonomous Action Execution**: Directly executes tool calls to add items, create orders, issue invoices, and record payments.

---

## 2. User Experience & Visual Design

- **Realized Profit Dashboard Widget**:
  - High-level metric cards in the Dashboard and Invoices view showing:
    - **Cash Collected vs. Billed Debt**
    - **Realized Cash Profit**: Green indicator of bankable cash earnings from completed payments.
    - **Profit Locked in Receivables**: Amber indicator showing profits pending collection.
    - **Average Cash Margin %**
- **Copilot Drawer with Profit Reasoning**:
  - The agent displays visual **Profit & Margin Badges** inside chat messages:
    - `📊 Projected Margin: 38% · Realized Cash Margin to Date: 19% (50% Deposit Received)`
    - `💡 Recommendation: Offer 5% volume discount, not 15%. At 15%, cash profit drops below our 20% safety margin.`
- **Line Item Cost & Margin Inspector**:
  - When drafting or editing orders and invoices, an optional/expandable cost toggle allows specifying raw production costs, with instant margin calculations displayed in real time.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Cash Proportional Profit Calculation**
  - *Chosen Approach*: `Realized Profit = (Payments Received / Total Invoice Amount) × (Total Invoice Amount - Total COGS)`.
  - *Why*: Provides an accurate, industry-standard cash accounting metric for printing and manufacturing businesses where material outlay precedes final customer collection.
  - *Alternatives Considered*: Standard accrual profit (counting uncollected invoices as profit) was rejected because it conceals liquidity risk when clients delay payments.
- **Decision 2: Autonomous Tool Calling for Profit-Aware Operations**
  - *Chosen Approach*: The server-side Gemini agent has full-access tool functions:
    - `add_to_catalog(name, sku, category, unit, unitPrice, costPrice, description)`
    - `calculate_job_profit(items, discountPercent)`
    - `evaluate_discount_request(customerId, items, requestedDiscount)`
    - `get_realized_profit_summary(timeframe)`
    - `create_order(customerId, items, ...)`
    - `create_invoice(customerId, items, ...)`
    - `record_payment(customerId, invoiceId, amount, ...)`

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NexTone Application                           │
│                                                                        │
│  ┌───────────────────────┐   ┌──────────────────────────────────────┐  │
│  │ Dashboard Profit View │   │ Agent Drawer & In-Modal AI Copilot   │  │
│  │ Realized vs Invoiced  │   │ Profit Rationale & Margin Checks     │  │
│  └───────────────────────┘   └──────────────────┬───────────────────┘  │
│                                                 │                      │
│            POST /api/agent/chat                 ▼                      │
│            { message, conversation, activeContextSnapshot }            │
└─────────────────────────────────────────────────┼──────────────────────┘
                                                  │
                                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       Express Server (server.ts)                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ System Instruction & Profit Rules Engine                         │  │
│  │ - COGS & Realized Profit Formulas (Payments vs Invoiced)         │  │
│  │ - Minimum Margin Thresholds (e.g. 20% floor)                     │  │
│  │ - Full Real-Time Database Snapshot (Catalog, Ledgers, Payments)  │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │                                  │
│  ┌──────────────────────────────────▼───────────────────────────────┐  │
│  │ @google/genai (gemini-3.8-flash) with Tool Declarations          │  │
│  │ - add_to_catalog(..., costPrice)                                 │  │
│  │ - calculate_job_profit                                           │  │
│  │ - evaluate_discount_request                                      │  │
│  │ - get_realized_profit_summary                                    │  │
│  │ - create_order, issue_invoice, record_payment                    │  │
│  └──────────────────────────────────┬───────────────────────────────┘  │
│                                     │ Tool Call / Action Execution     │
│                                     ▼                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Real-Time Firestore & Ledger Synchronization                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

- **Data Model Additions**:
  - `Product`: `costPrice?: number` (unit production/material cost).
  - `InvoiceItem` & `OrderItem`: `costPrice?: number` (individual item cost basis).
  - Ledger utility functions:
    - `getInvoiceProfit(invoice: Invoice)`: Returns `{ totalCost, totalBilled, invoicedProfit, realizedProfit, lockedProfit, marginPercent }`.
    - `getBusinessProfitSummary()`: Aggregates total cash realized profit across all settled and partially paid invoices.
- **Server-Side Integration**:
  - `server.ts` handles `/api/agent/chat` using `gemini-3.8-flash` from `@google/genai`.
  - Injects live profit statistics and margin guidelines into the agent's context window.
