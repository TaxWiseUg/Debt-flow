import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { FunctionDeclaration, GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
});

// ── Function Declarations ──────────────────────────────────────────────────
const addToCatalogDeclaration: FunctionDeclaration = {
  name: 'add_to_catalog',
  description: 'Adds a new product or service to the catalog with selling price and production cost.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: 'Product or service name' },
      sku: { type: Type.STRING, description: 'Optional unique SKU or item code' },
      category: { type: Type.STRING, description: 'Category e.g. Banners & Signage, Apparels, Paper Printing, Large Format' },
      unit: { type: Type.STRING, description: 'Unit of measure e.g. pcs, box, pack, sqm, sheet, roll' },
      unitPrice: { type: Type.NUMBER, description: 'Selling price per unit in UGX' },
      costPrice: { type: Type.NUMBER, description: 'Production cost per unit in UGX' },
      description: { type: Type.STRING, description: 'Item specifications or print finishes' },
    },
    required: ['name', 'unitPrice'],
  },
};

const createOrderDeclaration: FunctionDeclaration = {
  name: 'create_order',
  description: 'Drafts a new client job order.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: { type: Type.STRING, description: 'ID of existing customer, or empty if new' },
      customerName: { type: Type.STRING, description: 'Name of the client' },
      items: {
        type: Type.ARRAY,
        description: 'Order line items',
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Item name or specification' },
            quantity: { type: Type.NUMBER, description: 'Quantity required' },
            unit: { type: Type.STRING, description: 'Unit e.g. pcs' },
            unitPrice: { type: Type.NUMBER, description: 'Unit selling price in UGX' },
            costPrice: { type: Type.NUMBER, description: 'Production cost per unit in UGX' },
          },
          required: ['productName', 'quantity', 'unitPrice'],
        },
      },
      deliveryDate: { type: Type.STRING, description: 'Target delivery date (YYYY-MM-DD)' },
      discountPercent: { type: Type.NUMBER, description: 'Discount percentage (0-100)' },
      notes: { type: Type.STRING, description: 'Special instructions or delivery notes' },
    },
    required: ['customerName', 'items'],
  },
};

const issueInvoiceDeclaration: FunctionDeclaration = {
  name: 'issue_invoice',
  description: 'Issues a formal billing invoice and records customer debt.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: { type: Type.STRING, description: 'ID of the client' },
      customerName: { type: Type.STRING, description: 'Client name' },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING, description: 'Item name' },
            quantity: { type: Type.NUMBER, description: 'Quantity' },
            unit: { type: Type.STRING, description: 'Unit e.g. pcs' },
            unitPrice: { type: Type.NUMBER, description: 'Rate in UGX' },
            costPrice: { type: Type.NUMBER, description: 'Cost price per unit' },
          },
          required: ['productName', 'quantity', 'unitPrice'],
        },
      },
      dueDate: { type: Type.STRING, description: 'Due date (YYYY-MM-DD)' },
      discountPercent: { type: Type.NUMBER, description: 'Discount percentage' },
      taxPercent: { type: Type.NUMBER, description: 'Tax percentage e.g. 18 for VAT or 0' },
      notes: { type: Type.STRING, description: 'Invoice payment terms' },
    },
    required: ['customerName', 'items'],
  },
};

const evaluateDiscountDeclaration: FunctionDeclaration = {
  name: 'evaluate_discount_and_profit',
  description: 'Analyzes margins and customer debt history to approve, reject, or adjust a discount request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerId: { type: Type.STRING, description: 'Client ID' },
      customerName: { type: Type.STRING, description: 'Client name' },
      orderValue: { type: Type.NUMBER, description: 'Gross order value before discount in UGX' },
      requestedDiscountPercent: { type: Type.NUMBER, description: 'Discount requested by client' },
      estimatedCost: { type: Type.NUMBER, description: 'Estimated production cost in UGX' },
      approvedDiscountPercent: { type: Type.NUMBER, description: 'Agent approved discount (or 0 if rejected)' },
      projectedProfitUGX: { type: Type.NUMBER, description: 'Net profit after discount in UGX' },
      projectedMarginPercent: { type: Type.NUMBER, description: 'Net profit margin percentage' },
      decisionRationale: { type: Type.STRING, description: 'Business justification for the decision' },
    },
    required: ['orderValue', 'approvedDiscountPercent', 'decisionRationale'],
  },
};

const agentTools = [{
  functionDeclarations: [
    addToCatalogDeclaration,
    createOrderDeclaration,
    issueInvoiceDeclaration,
    evaluateDiscountDeclaration,
  ],
}];

// ── Agent Chat API Route ────────────────────────────────────────────────────
app.post('/api/agent/chat', async (req, res) => {
  try {
    const { message, conversation, activeContext } = req.body;

    if (!message && (!conversation || conversation.length === 0)) {
      return res.status(400).json({ error: 'Message or conversation required' });
    }

    const {
      products = [],
      customers = [],
      invoices = [],
      orders = [],
      payments = [],
      profitSummary = {},
      businessProfile = {},
    } = activeContext || {};

    const businessName: string = (businessProfile as any).name || 'this business';

    const userPrompt = (
      message || (conversation && conversation.length > 0 ? conversation[conversation.length - 1].content : '')
    ).trim();

    const isSimpleGreeting = /^(hi|hello|hey|good\s*(morning|afternoon|evening)|yo|greetings)[!.]?$/i.test(userPrompt);

    const systemInstruction = `You are the Autonomous AI Operations & Decision-Making Agent for "${businessName}".
Keep responses concise and professional. Never hallucinate data.

Real-time business snapshot:
- Business: ${businessName} · Catalog: ${products.length} items · Customers: ${customers.length} · Invoices: ${invoices.length}
- Realized Cash Profit: UGX ${((profitSummary as any).realizedCashProfit || 0).toLocaleString()} (${(profitSummary as any).realizedMarginPercent || 0}% margin)
- Cash Collected: UGX ${((profitSummary as any).totalCashCollected || 0).toLocaleString()} | Locked in Receivables: UGX ${((profitSummary as any).lockedProfitInReceivables || 0).toLocaleString()}

Top catalog items (max 20):
${(products as any[]).slice(0, 20).map(p => `- ${p.name} (${p.sku}): UGX ${p.unitPrice?.toLocaleString()}/${p.unit || 'pcs'}, cost UGX ${(p.costPrice || 0).toLocaleString()}`).join('\n') || 'Empty'}

Recent invoices (max 10):
${(invoices as any[]).slice(0, 10).map(i => `- ${i.invoiceNumber}: ${i.customerName} | Total UGX ${i.totalAmount?.toLocaleString()} | Paid UGX ${i.paidAmount?.toLocaleString()} | Due UGX ${i.balanceDue?.toLocaleString()}`).join('\n') || 'None'}

RULES:
1. Use tools autonomously when asked: add_to_catalog, create_order, issue_invoice, evaluate_discount_and_profit.
2. Enforce a 20% gross margin floor before approving discounts.
3. Answer basic queries directly and concisely without tool calls.`;

    const rawHistory = (conversation || [])
      .slice(0, -1)
      .filter((msg: any) => msg.role === 'user' || (msg.role === 'assistant' && msg.id !== 'welcome_1'));

    const validHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    let expectedRole: 'user' | 'model' = 'user';
    for (const msg of rawHistory) {
      const currentRole = msg.role === 'assistant' ? 'model' : 'user';
      if (currentRole === expectedRole) {
        validHistory.push({ role: currentRole, parts: [{ text: msg.content }] });
        expectedRole = expectedRole === 'user' ? 'model' : 'user';
      }
    }

    let result: any = null;

    try {
      const chat = ai.chats.create({
        model: 'gemini-2.0-flash-lite',
        config: { systemInstruction, tools: agentTools },
        history: validHistory,
      });

      const callPromise = chat.sendMessage({ message: userPrompt });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI response timeout')), 7500)
      );

      result = await Promise.race([callPromise, timeoutPromise]);
    } catch (apiErr: any) {
      console.warn('Gemini API warn/timeout:', apiErr?.message);
      if (isSimpleGreeting) {
        return res.json({
          text: `Hello! I'm tracking your catalog (${products.length} items), ${customers.length} clients, and UGX ${((profitSummary as any).realizedCashProfit || 0).toLocaleString()} in realized cash profit. How can I help?`,
          actions: [],
        });
      }
      throw apiErr;
    }

    const candidate = result?.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.filter((p: any) => p.functionCall) || [];

    const actions = functionCalls.map((fc: any) => {
      const call = fc.functionCall;
      return {
        id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: call.name,
        status: 'pending',
        title: call.name === 'add_to_catalog'
          ? `Add "${call.args.name}" to Catalog`
          : call.name === 'create_order'
          ? `Create Order for ${call.args.customerName || 'Client'}`
          : call.name === 'issue_invoice'
          ? `Issue Invoice for ${call.args.customerName || 'Client'}`
          : `Evaluate Discount for ${call.args.customerName || 'Job'}`,
        payload: call.args,
      };
    });

    let responseText = result?.text || '';
    if (!responseText && actions.length > 0) {
      const a = actions[0];
      if (a.type === 'add_to_catalog') {
        responseText = `Added **${a.payload.name}** to catalog at UGX ${a.payload.unitPrice?.toLocaleString()} (cost UGX ${(a.payload.costPrice || 0).toLocaleString()}).`;
      } else if (a.type === 'create_order') {
        responseText = `Order drafted for **${a.payload.customerName}** — ${a.payload.items?.length || 0} items.`;
      } else if (a.type === 'issue_invoice') {
        responseText = `Invoice prepared for **${a.payload.customerName}**.`;
      } else if (a.type === 'evaluate_discount_and_profit') {
        const p = a.payload;
        responseText = `### Discount Analysis\n- **Order Value**: UGX ${p.orderValue?.toLocaleString()}\n- **Approved Discount**: ${p.approvedDiscountPercent}%\n- **Net Profit**: UGX ${p.projectedProfitUGX?.toLocaleString()} (${p.projectedMarginPercent}% margin)\n\n**Decision**: ${p.decisionRationale}`;
      }
    } else if (!responseText && isSimpleGreeting) {
      responseText = `Hello! How can I assist with ${businessName} today?`;
    }

    return res.json({ text: responseText, actions });
  } catch (error: any) {
    console.error('Agent Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process agent request' });
  }
});

// ── Dev / Prod Vite integration ────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => res.sendFile('dist/index.html', { root: '.' }));
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
